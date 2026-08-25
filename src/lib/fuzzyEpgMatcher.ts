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
  matchType: 'EXACT_TVG_ID' | 'NORMALIZED_NAME' | 'FUZZY_TOKEN' | 'MANUAL' | 'UNMATCHED';
  matchScore: number;
  isMatched: boolean;
  needsManualReview?: boolean;
  reviewReason?: string;
}

export interface MatchCandidate {
  id: string;
  displayName: string;
  iconSrc?: string;
}

/**
 * Normalizes channel names by stripping regional prefixes, resolution tags,
 * frame rates, shift tags, and non-alphanumeric punctuation.
 */
export function normalizeChannelName(name: string): string {
  if (!name) return '';
  let cleaned = name.trim().toLowerCase();

  // 1. Strip country / regional prefixes (e.g. "US:", "UK:", "CA:", "FR:", "DE:", "[US]", "(UK)")
  cleaned = cleaned.replace(/^(us|uk|ca|fr|de|es|it|nl|pt|au|nz|mx|br|ar|latam|ar:|mx:)[|:_\-\s]+/gi, '');
  cleaned = cleaned.replace(/^\[(us|uk|ca|fr|de|es|it|nl|pt|au|nz|mx|br)\]\s*/gi, '');
  cleaned = cleaned.replace(/^\((us|uk|ca|fr|de|es|it|nl|pt|au|nz|mx|br)\)\s*/gi, '');

  // 2. Strip quality / format / codec / framerate suffixes
  cleaned = cleaned.replace(/\b(4k|uhd|fhd|hd|sd|hevc|h265|h264|1080p|720p|50fps|60fps|raw|vip|premium|backup|alt)\b/gi, '');

  // 3. Strip timeshift suffixes (e.g. "+1", "+2", "+24", "east", "west")
  cleaned = cleaned.replace(/\s*\+\d+\b/g, '');
  cleaned = cleaned.replace(/\b(east|west|pacific|central)\b/gi, '');

  // 4. Remove special characters and redundant spaces
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
      // Check prefix / abbreviation match (e.g. "int" -> "international", "doc" -> "documentary", "ent" -> "entertainment")
      const prefixMatch = tokens2.some(
        (t2) => (t1.length >= 3 && t2.startsWith(t1)) || (t2.length >= 3 && t1.startsWith(t2))
      );
      if (prefixMatch) {
        matchedWeight += 0.85;
      }
    }
  }

  const maxLen = Math.max(tokens1.length, tokens2.length);
  return maxLen > 0 ? Math.min(1.0, matchedWeight / maxLen) : 0;
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
  threshold = 0.60
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
      (c) => c.id.toLowerCase() === tvgId.toLowerCase()
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
      };
    }
  }

  const cleanChannelName = normalizeChannelName(channel.name);

  // 3. Exact match on normalized display name or channel name
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
    };
  }

  // 4. Token & Bigram Fuzzy Matching
  let bestCandidate: MatchCandidate | null = null;
  let bestScore = 0;

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

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestCandidate = cand;
    }
  }

  if (bestCandidate && bestScore >= threshold) {
    const roundedScore = Math.round(bestScore * 100) / 100;
    const CONFIDENCE_REVIEW_THRESHOLD = 0.80;
    const needsReview = roundedScore < CONFIDENCE_REVIEW_THRESHOLD;

    return {
      channelId: channel.id,
      channelName: channel.name,
      tvgId,
      xmltvChannelId: bestCandidate.id,
      xmltvDisplayName: bestCandidate.displayName,
      matchType: 'FUZZY_TOKEN',
      matchScore: roundedScore,
      isMatched: true,
      needsManualReview: needsReview,
      reviewReason: needsReview
        ? `Confidence score (${Math.round(roundedScore * 100)}%) is below auto-approve threshold (80%). Pending user review.`
        : undefined,
    };
  }

  // 5. UNMATCHED FALLBACK
  // CRITICAL REQUIREMENT: Show unmatched channels rather than hiding them!
  return {
    channelId: channel.id,
    channelName: channel.name,
    tvgId,
    xmltvChannelId: null,
    xmltvDisplayName: null,
    matchType: 'UNMATCHED',
    matchScore: 0.0,
    isMatched: false,
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
  threshold = 0.60
): EpgMatchResult[] {
  return channels.map((ch) => matchChannelToXmltv(ch, candidates, manualOverrides, threshold));
}
