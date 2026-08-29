/**
 * Milestone 4a: Fuzzy EPG Matcher
 * 
 * Intelligent matching between IPTV channel descriptors (tvg-id, tvg-name, name, stream_id)
 * and XMLTV channel records.
 * 
 * Hierarchy:
 * 1. Exact tvg-id / epg_channel_id match (Score: 1.0)
 * 2. Exact clean-normalized name match (Score: 0.95)
 * 3. Token-overlap & fuzzy string similarity (Score: 0.65 - 0.94)
 * 4. Unmatched fallback (Score: 0) - CRITICAL: Unmatched channels are ALWAYS preserved and shown!
 */

export interface EpgMatchResult {
  channelId: string | number;
  channelName: string;
  tvgId?: string;
  xmltvChannelId: string | null;
  xmltvDisplayName: string | null;
  matchType: 'EXACT_TVG_ID' | 'EXACT_PROVIDER_ID' | 'NORMALIZED_NAME' | 'FUZZY_TOKEN' | 'UNCERTAIN_FUZZY' | 'MANUAL' | 'UNMATCHED';
  matchScore: number;
  isMatched: boolean;
  isUncertain?: boolean;
  flaggedCandidateId?: string;
  flaggedCandidateName?: string;
  needsManualReview?: boolean;
  reviewReason?: string;
}

export interface MatchCandidate {
  id: string;
  displayName: string;
  iconSrc?: string;
  tvgId?: string;
  providerChannelId?: string | number;
}

/**
 * Normalizes channel names by stripping regional prefixes, resolution tags,
 * frame rates, shift tags, and non-alphanumeric punctuation.
 */
export function normalizeChannelName(name: string): string {
  if (!name) return '';
  let cleaned = name.trim().toLowerCase();

  // 1. Strip country / regional prefixes (e.g. "|UK|", "[US]", "(UK)", "UK:", "US - ")
  cleaned = cleaned.replace(/^[|\[(]*(us|uk|ca|fr|de|es|it|nl|pt|au|nz|mx|br|ar|latam)[|)\]\s|:_-]+/gi, '');
  cleaned = cleaned.replace(/^(us|uk|ca|fr|de|es|it|nl|pt|au|nz|mx|br|ar|latam|ar:|mx:)[|:_\-\s]+/gi, '');
  cleaned = cleaned.replace(/^\[(us|uk|ca|fr|de|es|it|nl|pt|au|nz|mx|br)\]\s*/gi, '');
  cleaned = cleaned.replace(/^\((us|uk|ca|fr|de|es|it|nl|pt|au|nz|mx|br)\)\s*/gi, '');

  // 2. Strip quality / format / codec / framerate suffixes
  cleaned = cleaned.replace(/\b(4k|uhd|fhd|hd|sd|hevc|h265|h264|1080p|720p|50fps|60fps|raw|vip|premium|backup|alt|highdef|hi\s*def)\b/gi, '');

  // 3. Strip timeshift suffixes (e.g. "+1", "+2", "+24", "east", "west")
  cleaned = cleaned.replace(/\s*\+\d+\b/g, '');
  cleaned = cleaned.replace(/\b(east|west|pacific|central)\b/gi, '');

  // 4. Expand common broadcast abbreviations for consistent comparison
  cleaned = cleaned
    .replace(/\b(intl|internatnl|intnl|int)\b/gi, 'international')
    .replace(/\b(docu|doc)\b/gi, 'documentary')
    .replace(/\b(ent|entmt)\b/gi, 'entertainment')
    .replace(/\b(spts|sport)\b/gi, 'sports');

  // 5. Remove special characters and redundant spaces
  cleaned = cleaned.replace(/[^\w\s]/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Computes Dice / Bigram Coefficient similarity between two strings (0.0 to 1.0)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/\s+/g, '');
  const s2 = str2.toLowerCase().replace(/\s+/g, '');

  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) {
    return s1 === s2 ? 1.0 : 0.0;
  }

  const bigrams1 = new Map<string, number>();
  for (let i = 0; i < s1.length - 1; i++) {
    const bigram = s1.substring(i, i + 2);
    bigrams1.set(bigram, (bigrams1.get(bigram) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    const bigram = s2.substring(i, i + 2);
    const count = bigrams1.get(bigram) || 0;
    if (count > 0) {
      bigrams1.set(bigram, count - 1);
      intersection++;
    }
  }

  return (2.0 * intersection) / (s1.length - 1 + s2.length - 1);
}

/**
 * Computes token-based similarity between two normalized strings with prefix/abbreviation awareness
 */
export function calculateTokenSimilarity(str1: string, str2: string): number {
  const tokens1 = normalizeChannelName(str1).split(/\s+/).filter(Boolean);
  const tokens2 = normalizeChannelName(str2).split(/\s+/).filter(Boolean);

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  let matchedWeight = 0;
  const set2 = new Set(tokens2);

  for (const t1 of tokens1) {
    if (set2.has(t1)) {
      matchedWeight += 1.0;
    } else {
      // Check prefix / abbreviation match or high string similarity
      const prefixMatch = tokens2.some(
        (t2) =>
          (t1.length >= 3 && t2.startsWith(t1)) ||
          (t2.length >= 3 && t1.startsWith(t2)) ||
          calculateStringSimilarity(t1, t2) >= 0.70
      );
      if (prefixMatch) {
        matchedWeight += 0.85;
      }
    }
  }

  const maxLen = Math.max(tokens1.length, tokens2.length);
  const minLen = Math.min(tokens1.length, tokens2.length);
  // Average between coverage of source and coverage of target
  return maxLen > 0 ? Math.min(1.0, (matchedWeight / maxLen + matchedWeight / minLen) / 2) : 0;
}

/**
 * Fuzzy matches a single IPTV channel to a list of XMLTV channel candidates.
 */
export function matchChannelToXmltv(
  channel: {
    id: string | number;
    name: string;
    tvgId?: string;
    epgChannelId?: string;
  },
  candidates: MatchCandidate[],
  manualOverrides: Record<string, string> = {},
  threshold = 0.45
): EpgMatchResult {
  const channelKey = String(channel.id);
  const tvgId = channel.tvgId || channel.epgChannelId;

  // 1. Check for manual override mapping
  if (manualOverrides[channelKey]) {
    const targetId = manualOverrides[channelKey];
    const cand = candidates.find((c) => c.id === targetId);
    return {
      channelId: channel.id,
      channelName: channel.name,
      tvgId,
      xmltvChannelId: targetId,
      xmltvDisplayName: cand ? cand.displayName : targetId,
      matchType: 'MANUAL',
      matchScore: 1.0,
      isMatched: true,
    };
  }

  // 2. Exact match on tvg-id / epgChannelId
  if (tvgId) {
    const exactTvg = candidates.find(
      (c) => c.id.toLowerCase() === tvgId.toLowerCase() || (c.tvgId && c.tvgId.toLowerCase() === tvgId.toLowerCase())
    );
    if (exactTvg) {
      return {
        channelId: channel.id,
        channelName: channel.name,
        tvgId,
        xmltvChannelId: exactTvg.id,
        xmltvDisplayName: exactTvg.displayName,
        matchType: 'EXACT_TVG_ID',
        matchScore: 1.0,
        isMatched: true,
        isUncertain: false,
      };
    }
  }

  // 3. Exact match on Provider Channel ID where applicable
  const providerChanId = String(channel.id);
  const streamIdStr = String((channel as any).streamId || (channel as any).stream_id || '');
  const exactProvider = candidates.find((c) => {
    const candId = String(c.id);
    const candProvId = c.providerChannelId ? String(c.providerChannelId) : null;
    return (
      candId === providerChanId ||
      (candProvId && candProvId === providerChanId) ||
      (streamIdStr && (candId === streamIdStr || candProvId === streamIdStr))
    );
  });
  if (exactProvider) {
    return {
      channelId: channel.id,
      channelName: channel.name,
      tvgId,
      xmltvChannelId: exactProvider.id,
      xmltvDisplayName: exactProvider.displayName,
      matchType: 'EXACT_PROVIDER_ID',
      matchScore: 1.0,
      isMatched: true,
      isUncertain: false,
    };
  }

  const cleanChannelName = normalizeChannelName(channel.name);

  // 4. Exact match on normalized display name or channel name
  const exactNorm = candidates.find(
    (c) =>
      normalizeChannelName(c.displayName) === cleanChannelName ||
      normalizeChannelName(c.id) === cleanChannelName
  );
  if (exactNorm && cleanChannelName.length > 0) {
    return {
      channelId: channel.id,
      channelName: channel.name,
      tvgId,
      xmltvChannelId: exactNorm.id,
      xmltvDisplayName: exactNorm.displayName,
      matchType: 'NORMALIZED_NAME',
      matchScore: 0.95,
      isMatched: true,
      isUncertain: false,
    };
  }

  // 5. Token & Bigram Fuzzy Matching with Uncertainty Check
  // Evaluates candidate similarities and ranks top candidates
  const candidateScores: Array<{ candidate: MatchCandidate; score: number }> = [];

  for (const cand of candidates) {
    const cleanCandName = normalizeChannelName(cand.displayName);
    const cleanCandId = normalizeChannelName(cand.id);

    // Bigram similarity
    const simName = calculateStringSimilarity(cleanChannelName, cleanCandName);
    const simId = calculateStringSimilarity(cleanChannelName, cleanCandId);

    // Token similarity
    const tokName = calculateTokenSimilarity(channel.name, cand.displayName);
    const tokId = calculateTokenSimilarity(channel.name, cand.id);

    // Highest representation score
    const bestCharSim = Math.max(simName, simId);
    const bestTokSim = Math.max(tokName, tokId);
    const combinedScore = Math.max(bestTokSim, bestCharSim, bestCharSim * 0.5 + bestTokSim * 0.5);

    if (combinedScore >= 0.35) {
      candidateScores.push({ candidate: cand, score: combinedScore });
    }
  }

  // Sort descending by score
  candidateScores.sort((a, b) => b.score - a.score);

  if (candidateScores.length > 0) {
    const best = candidateScores[0];
    const secondBest = candidateScores.length > 1 ? candidateScores[1] : null;
    const roundedScore = Math.round(best.score * 100) / 100;

    const HIGH_CONFIDENCE_THRESHOLD = 0.82;
    const UNCERTAINTY_GAP_THRESHOLD = 0.05;

    // Check if score is high confidence and distinct from 2nd candidate
    const isAmbiguous = secondBest && Math.abs(best.score - secondBest.score) < UNCERTAINTY_GAP_THRESHOLD;
    const isHighConfidence = roundedScore >= HIGH_CONFIDENCE_THRESHOLD && !isAmbiguous;

    if (isHighConfidence) {
      // Confident match: bind EPG safely
      return {
        channelId: channel.id,
        channelName: channel.name,
        tvgId,
        xmltvChannelId: best.candidate.id,
        xmltvDisplayName: best.candidate.displayName,
        matchType: 'FUZZY_TOKEN',
        matchScore: roundedScore,
        isMatched: true,
        isUncertain: false,
      };
    } else if (roundedScore >= threshold) {
      // UNCERTAIN MATCH:
      // Requirement: If fuzzy matching is uncertain, preserve the channel and flag the match
      // rather than silently associating incorrect EPG data.
      return {
        channelId: channel.id,
        channelName: channel.name,
        tvgId,
        xmltvChannelId: null, // DO NOT silently bind incorrect EPG
        xmltvDisplayName: null,
        flaggedCandidateId: best.candidate.id,
        flaggedCandidateName: best.candidate.displayName,
        matchType: 'UNCERTAIN_FUZZY',
        matchScore: roundedScore,
        isMatched: false,
        isUncertain: true,
        needsManualReview: true,
        reviewReason: isAmbiguous
          ? `Ambiguous fuzzy match: "${best.candidate.displayName}" (${Math.round(best.score * 100)}%) vs "${secondBest?.candidate.displayName}" (${Math.round((secondBest?.score || 0) * 100)}%). Preserved without binding.`
          : `Uncertain fuzzy match confidence (${Math.round(roundedScore * 100)}% with "${best.candidate.displayName}"). Preserved channel without silently binding incorrect EPG.`,
      };
    }
  }

  // 6. UNMATCHED FALLBACK
  // Requirement: Do not automatically hide unmatched channels. Show "No EPG available".
  return {
    channelId: channel.id,
    channelName: channel.name,
    tvgId,
    xmltvChannelId: null,
    xmltvDisplayName: null,
    matchType: 'UNMATCHED',
    matchScore: 0.0,
    isMatched: false,
    isUncertain: false,
    needsManualReview: true,
    reviewReason: 'No matching XMLTV program guide channel identified in ingest database.',
  };
}

/**
 * Batch matches a collection of IPTV channels to XMLTV candidates
 * ensuring 100% of channels are preserved in output.
 */
export function batchMatchChannelsToXmltv(
  channels: Array<{ id: string | number; name: string; tvgId?: string; epgChannelId?: string }>,
  candidates: MatchCandidate[],
  manualOverrides: Record<string, string> = {},
  threshold = 0.45
): EpgMatchResult[] {
  return channels.map((ch) => matchChannelToXmltv(ch, candidates, manualOverrides, threshold));
}
