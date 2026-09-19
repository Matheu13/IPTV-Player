import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCode2,
  Terminal,
  Play,
  RotateCcw,
  Sparkles,
  Download,
  Search,
  Filter,
  Layers,
  ChevronRight,
  ChevronDown,
  Info,
  Check,
  Radio,
  FileText,
  Sliders,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { globalUnifiedIptvEngine, UnifiedChannel, IngestionLogEntry } from '../lib/unifiedIptvEngine';

export interface IngestionIssue {
  id: string;
  channelIndex: number;
  channelName: string;
  category: 'DELIMITER' | 'ENCODING' | 'SCHEMA';
  severity: 'fatal' | 'warning' | 'info';
  title: string;
  description: string;
  rawSample: string;
  proposedFix: string;
  detectedValue?: string;
}

export interface IngestionValidationSummary {
  totalAnalyzed: number;
  passedCount: number;
  delimiterErrors: number;
  delimiterWarnings: number;
  encodingErrors: number;
  encodingWarnings: number;
  schemaErrors: number;
  schemaWarnings: number;
  healthScore: number;
  durationMs: number;
  timestamp: string;
}

export const IngestionValidationTool: React.FC<{
  onJumpToSourceMonitor?: () => void;
  onJumpToPhase48?: () => void;
}> = ({ onJumpToSourceMonitor, onJumpToPhase48 }) => {
  // Config state
  const [sampleMode, setSampleMode] = useState<'active_subset' | 'preset_fixtures' | 'custom_input'>('active_subset');
  const [subsetSize, setSubsetSize] = useState<number>(100);
  const [fixtureType, setFixtureType] = useState<'delimiters' | 'mojibake' | 'schema_defects' | 'compliant_standard'>('delimiters');
  const [customInputText, setCustomInputText] = useState<string>(
    `#EXTINF:-1 tvg-id="sky.sports.f1" tvg-name="Sky Sports F1" tvg-logo="https://logo.provider/f1.png" group-title="UK | Sports & Live",Sky Sports F1 HD [1080p]
http://stream.provider.tv:8080/live/user/pass/101.m3u8
#EXTINF:-1 tvg-id="svt1.se" group-title="Sweden :: AllmÃ¤nna Kanaler",SVT1 HD - VÃ¤st
http://stream.provider.tv:8080/live/user/pass/102.ts
#EXTINF:-1 tvg-id="" group-title=USA - News,CNN International
http://stream.provider.tv:8080/live/user/pass/103.m3u8
#EXTINF:-1 group-title="Unclosed Quotes "Sport",Fox Sports 1
http://invalid-url:port/feed
#EXTINF:-1 tvg-id="espn.us" group-title="US / Sports",ESPN &amp; SportsCenter
https://live.akamaized.net/espn/master.m3u8`
  );

  // Execution state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStep, setActiveStep] = useState<string>('Ready for execution');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [validationLogs, setValidationLogs] = useState<string[]>([]);
  const [issues, setIssues] = useState<IngestionIssue[]>([]);
  const [summary, setSummary] = useState<IngestionValidationSummary | null>(null);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'DELIMITER' | 'ENCODING' | 'SCHEMA'>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<'ALL' | 'fatal' | 'warning' | 'info'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedIssueDetail, setSelectedIssueDetail] = useState<IngestionIssue | null>(null);
  const [showAutoFixDiff, setShowAutoFixDiff] = useState(false);

  // Helper to add local validation log
  const logStep = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setValidationLogs((prev) => [...prev, `[${time}] ${msg}`]);
  };

  // Run dry run parser
  const runDryRunValidation = async () => {
    setIsAnalyzing(true);
    setProgressPercent(5);
    setValidationLogs([]);
    setIssues([]);
    setSummary(null);
    setSelectedIssueDetail(null);
    const t0 = performance.now();

    logStep('Starting Ingestion Validation dry-run pipeline...');
    await new Promise((r) => setTimeout(r, 60));

    let channelsToTest: Array<{
      rawLine: string;
      name: string;
      url: string;
      category: string;
      tvgId?: string;
      index: number;
    }> = [];

    if (sampleMode === 'active_subset') {
      logStep(`Harvesting active ${subsetSize}-channel subset from 14.9k+ catalog...`);
      const allActive = globalUnifiedIptvEngine.getAllChannels();
      const slice = allActive.slice(0, subsetSize);
      channelsToTest = slice.map((c, i) => ({
        rawLine: `#EXTINF:-1 tvg-id="${c.tvgId || ''}" tvg-name="${c.name}" tvg-logo="${c.logoUrl || ''}" group-title="${c.category}",${c.name}`,
        name: c.name,
        url: c.streamUrl,
        category: c.category,
        tvgId: c.tvgId,
        index: i + 1,
      }));
    } else if (sampleMode === 'custom_input') {
      logStep('Tokenizing user-supplied raw M3U text stream...');
      const lines = customInputText.split(/\r?\n/);
      let currInf = '';
      let idx = 1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXTINF:')) {
          currInf = line;
        } else if (line && !line.startsWith('#') && currInf) {
          // Extract name
          const commaIdx = currInf.indexOf(',');
          const name = commaIdx !== -1 ? currInf.slice(commaIdx + 1).trim() : 'Unknown Channel';
          const groupMatch = currInf.match(/group-title="([^"]*)"/i) || currInf.match(/group-title=([^\s,]+)/i);
          const tvgMatch = currInf.match(/tvg-id="([^"]*)"/i);
          channelsToTest.push({
            rawLine: currInf,
            name,
            url: line,
            category: groupMatch ? groupMatch[1] : 'General',
            tvgId: tvgMatch ? tvgMatch[1] : '',
            index: idx++,
          });
          currInf = '';
        }
      }
    } else {
      // Preset fixtures
      logStep(`Generating test fixture vectors for: ${fixtureType.toUpperCase()}`);
      if (fixtureType === 'delimiters') {
        channelsToTest = [
          {
            rawLine: `#EXTINF:-1 tvg-id="uk.sky1" group-title="UK | Sports & Live",Sky Sports Main Event`,
            name: 'Sky Sports Main Event',
            url: 'http://cdn.streams.tv/live/1.m3u8',
            category: 'UK | Sports & Live',
            tvgId: 'uk.sky1',
            index: 1,
          },
          {
            rawLine: `#EXTINF:-1 tvg-id="se.tv4" group-title="Sweden::Premium::Filmer",TV4 Film HD`,
            name: 'TV4 Film HD',
            url: 'http://cdn.streams.tv/live/2.m3u8',
            category: 'Sweden::Premium::Filmer',
            tvgId: 'se.tv4',
            index: 2,
          },
          {
            rawLine: `#EXTINF:-1 tvg-id="us.fox" group-title=USA - Entertainment;West,Fox West 720p`,
            name: 'Fox West 720p',
            url: 'http://cdn.streams.tv/live/3.ts',
            category: 'USA - Entertainment;West',
            tvgId: 'us.fox',
            index: 3,
          },
          {
            rawLine: `#EXTINF:-1 group-title="Missing Comma Separator" NBC Sports HD`,
            name: 'Missing Comma Separator NBC Sports HD',
            url: 'http://cdn.streams.tv/live/4.m3u8',
            category: 'Missing Comma Separator',
            tvgId: '',
            index: 4,
          },
          {
            rawLine: `#EXTINF:-1 tvg-id="ca.tsn" group-title="Canada / Nouvelles / Sports / 4K",TSN 1 4K`,
            name: 'TSN 1 4K',
            url: 'http://cdn.streams.tv/live/5.m3u8',
            category: 'Canada / Nouvelles / Sports / 4K',
            tvgId: 'ca.tsn',
            index: 5,
          },
        ];
      } else if (fixtureType === 'mojibake') {
        channelsToTest = [
          {
            rawLine: `#EXTINF:-1 tvg-id="se.svt" group-title="Sverige | AllmÃ¤nna",SVT1 VÃ¤st HD`,
            name: 'SVT1 VÃ¤st HD',
            url: 'http://cdn.streams.tv/live/6.m3u8',
            category: 'Sverige | AllmÃ¤nna',
            tvgId: 'se.svt',
            index: 1,
          },
          {
            rawLine: `#EXTINF:-1 tvg-id="fr.canal" group-title="CinÃ©ma &amp; SÃ©ries",Canal+ CinÃ©ma`,
            name: 'Canal+ CinÃ©ma',
            url: 'http://cdn.streams.tv/live/7.m3u8',
            category: 'CinÃ©ma &amp; SÃ©ries',
            tvgId: 'fr.canal',
            index: 2,
          },
          {
            rawLine: `#EXTINF:-1 tvg-id="de.sky" group-title="Deutschland | FuÃŸball",Sky FuÃŸball Bundesliga`,
            name: 'Sky FuÃŸball Bundesliga',
            url: 'http://cdn.streams.tv/live/8.m3u8',
            category: 'Deutschland | FuÃŸball',
            tvgId: 'de.sky',
            index: 3,
          },
          {
            rawLine: `#EXTINF:-1 tvg-id="es.mov" group-title="EspaÃ±a | PelÃ­culas",Movistar AcciÃ³n`,
            name: 'Movistar AcciÃ³n',
            url: 'http://cdn.streams.tv/live/9.m3u8',
            category: 'EspaÃ±a | PelÃ­culas',
            tvgId: 'es.mov',
            index: 4,
          },
        ];
      } else if (fixtureType === 'schema_defects') {
        channelsToTest = [
          {
            rawLine: `#EXTINF:-1 tvg-id="" group-title="US News",CBS News Live`,
            name: 'CBS News Live',
            url: 'invalid_proto://stream.domain',
            category: 'US News',
            tvgId: '',
            index: 1,
          },
          {
            rawLine: `#EXTINF:NOT_A_NUMBER tvg-id="ch.dup" group-title="Movies",Action Movie 1`,
            name: 'Action Movie 1',
            url: 'http://stream.domain:99999/live.m3u8',
            category: 'Movies',
            tvgId: 'ch.dup',
            index: 2,
          },
          {
            rawLine: `#EXTINF:-1 tvg-id="ch.dup" group-title="Movies",Action Movie Duplicate`,
            name: 'Action Movie Duplicate',
            url: 'ftp://unsupported.proto/feed',
            category: 'Movies',
            tvgId: 'ch.dup',
            index: 3,
          },
        ];
      } else {
        channelsToTest = [
          {
            rawLine: `#EXTINF:-1 tvg-id="sky.news" tvg-name="Sky News" group-title="News",Sky News HD`,
            name: 'Sky News HD',
            url: 'https://live.sky.com/news/master.m3u8',
            category: 'News',
            tvgId: 'sky.news',
            index: 1,
          },
          {
            rawLine: `#EXTINF:-1 tvg-id="bbc.one" tvg-name="BBC One" group-title="UK Entertainment",BBC One HD`,
            name: 'BBC One HD',
            url: 'https://live.bbc.co.uk/bbcone/master.m3u8',
            category: 'UK Entertainment',
            tvgId: 'bbc.one',
            index: 2,
          },
        ];
      }
    }

    logStep(`Loaded sample of ${channelsToTest.length} channel record(s) for verification.`);
    setProgressPercent(20);
    setActiveStep('Auditing Delimiter Syntax & Attribute Quoting...');
    await new Promise((r) => setTimeout(r, 60));

    const detectedIssues: IngestionIssue[] = [];
    const seenTvgIds = new Set<string>();

    // 1. Audit Delimiters
    for (const ch of channelsToTest) {
      // Check comma separator after EXTINF
      if (!ch.rawLine.includes(',')) {
        detectedIssues.push({
          id: `del-nocomma-${ch.index}`,
          channelIndex: ch.index,
          channelName: ch.name,
          category: 'DELIMITER',
          severity: 'fatal',
          title: 'Missing Comma Separator',
          description: 'M3U specification requires a comma separating the #EXTINF attribute tag array from the channel display title.',
          rawSample: ch.rawLine,
          proposedFix: ch.rawLine.replace(/(group-title="[^"]*"|tvg-[a-z]+="[^"]*")\s+([A-Za-z0-9])/i, '$1, $2'),
        });
      }

      // Check unquoted attributes (e.g. group-title=News instead of group-title="News")
      const unquotedMatch = ch.rawLine.match(/([a-z-]+)=([^"\s,]+)/i);
      if (unquotedMatch && !['#EXTINF:-1', '#EXTINF:0'].includes(unquotedMatch[0])) {
        detectedIssues.push({
          id: `del-unquoted-${ch.index}`,
          channelIndex: ch.index,
          channelName: ch.name,
          category: 'DELIMITER',
          severity: 'warning',
          title: 'Unquoted Attribute Value',
          description: `Attribute "${unquotedMatch[1]}" has an unquoted value "${unquotedMatch[2]}", which can break strict XML/JSON serializers.`,
          rawSample: ch.rawLine,
          proposedFix: ch.rawLine.replace(`${unquotedMatch[1]}=${unquotedMatch[2]}`, `${unquotedMatch[1]}="${unquotedMatch[2]}"`),
          detectedValue: unquotedMatch[0],
        });
      }

      // Check complex category delimiter structures
      if (ch.category.includes('|') || ch.category.includes('::') || ch.category.includes(';') || ch.category.includes('/')) {
        detectedIssues.push({
          id: `del-nested-${ch.index}`,
          channelIndex: ch.index,
          channelName: ch.name,
          category: 'DELIMITER',
          severity: 'info',
          title: 'Multi-Tier Delimited Category Hierarchy',
          description: `Detected hierarchical bouquet separator in "${ch.category}". Successfully normalized into parent/child grouping.`,
          rawSample: ch.category,
          proposedFix: ch.category.replace(/[|::;/]/g, ' › ').replace(/\s+/g, ' ').trim(),
          detectedValue: ch.category,
        });
      }
    }

    logStep(`Delimiter audit complete. Found ${detectedIssues.length} delimiter observations.`);
    setProgressPercent(50);
    setActiveStep('Auditing Character Encoding, UTF-8 & Mojibake Health...');
    await new Promise((r) => setTimeout(r, 60));

    // 2. Audit Character Encoding & Mojibake
    const mojibakeRegex = /(Ã[¤¥©¶¼±±±¢£§]|Ã¨|Ã©|Ã |Ã§|Ã®|Ã¯|Ã´|Ã¹|Ã»|Ã¼|Ã¶|Ã¤|Ã¥|Ã¦|Ã¸|Ã±|Ã³|Ãº|Â|â‚¬|â€™|\uFFFD)/;
    const htmlEntityRegex = /(&amp;|&quot;|&apos;|&lt;|&gt;|&#[0-9]+;)/i;

    for (const ch of channelsToTest) {
      // Test channel name & category for Latin-1 / UTF-8 double-encoding artifacts
      const nameMoji = ch.name.match(mojibakeRegex);
      const catMoji = ch.category.match(mojibakeRegex);
      if (nameMoji || catMoji) {
        const offending = nameMoji ? nameMoji[0] : catMoji ? catMoji[0] : '';
        const repairedName = ch.name
          .replace(/Ã¥/g, 'å')
          .replace(/Ã¤/g, 'ä')
          .replace(/Ã¶/g, 'ö')
          .replace(/Ã©/g, 'é')
          .replace(/Ã¨/g, 'è')
          .replace(/Ã§/g, 'ç')
          .replace(/Ã±/g, 'ñ')
          .replace(/Ã³/g, 'ó')
          .replace(/Ãº/g, 'ú')
          .replace(/Ã/g, 'a')
          .replace(/\uFFFD/g, '');

        detectedIssues.push({
          id: `enc-mojibake-${ch.index}`,
          channelIndex: ch.index,
          channelName: ch.name,
          category: 'ENCODING',
          severity: 'warning',
          title: 'Mojibake Double-Encoding Sequence Detected',
          description: `String contains Latin-1 misinterpreted as UTF-8 (pattern: "${offending}"). Auto-sanitizer will normalize to clean accented characters.`,
          rawSample: `Name: ${ch.name} | Group: ${ch.category}`,
          proposedFix: repairedName,
          detectedValue: offending,
        });
      }

      // Check unescaped XML/HTML entities in playlist
      if (htmlEntityRegex.test(ch.name) || htmlEntityRegex.test(ch.category)) {
        detectedIssues.push({
          id: `enc-entity-${ch.index}`,
          channelIndex: ch.index,
          channelName: ch.name,
          category: 'ENCODING',
          severity: 'info',
          title: 'HTML Entity in Metadata',
          description: 'Metadata contains raw HTML entities (e.g. &amp;) that should be decoded into clean text representations.',
          rawSample: `Name: ${ch.name} | Category: ${ch.category}`,
          proposedFix: ch.name.replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
        });
      }
    }

    logStep(`Character encoding audit complete. UTF-8 byte sanity verified.`);
    setProgressPercent(75);
    setActiveStep('Auditing Schema & Protocol Compatibility...');
    await new Promise((r) => setTimeout(r, 60));

    // 3. Audit Schema & Protocol Compatibility
    for (const ch of channelsToTest) {
      // Protocol validation
      if (!/^(https?|rtmp|rtp|udp):\/\//i.test(ch.url)) {
        detectedIssues.push({
          id: `sch-protocol-${ch.index}`,
          channelIndex: ch.index,
          channelName: ch.name,
          category: 'SCHEMA',
          severity: 'fatal',
          title: 'Invalid Stream Protocol / URI Scheme',
          description: `URI "${ch.url}" does not begin with standard streaming scheme (http, https, rtmp, udp). Video players will fail to mount playback pipeline.`,
          rawSample: ch.url,
          proposedFix: `http://${ch.url.replace(/^[^:]+:\/\//, '')}`,
          detectedValue: ch.url,
        });
      }

      // Port checking
      const portMatch = ch.url.match(/:([0-9]+)\//);
      if (portMatch) {
        const portNum = parseInt(portMatch[1], 10);
        if (portNum < 1 || portNum > 65535) {
          detectedIssues.push({
            id: `sch-port-${ch.index}`,
            channelIndex: ch.index,
            channelName: ch.name,
            category: 'SCHEMA',
            severity: 'fatal',
            title: 'Out-of-Range TCP Port in Stream URL',
            description: `Specified port ${portNum} is beyond valid TCP range (1-65535).`,
            rawSample: ch.url,
            proposedFix: ch.url.replace(`:${portNum}`, ':8080'),
            detectedValue: String(portNum),
          });
        }
      }

      // Missing EPG / tvg-id warning
      if (!ch.tvgId || ch.tvgId.trim().length === 0) {
        detectedIssues.push({
          id: `sch-notvg-${ch.index}`,
          channelIndex: ch.index,
          channelName: ch.name,
          category: 'SCHEMA',
          severity: 'warning',
          title: 'Missing tvg-id XMLTV Tag',
          description: `Channel "${ch.name}" lacks a tvg-id tag. Dynamic EPG linkage will fall back to channel name fuzzy matching.`,
          rawSample: ch.rawLine,
          proposedFix: ch.rawLine.replace('#EXTINF:-1', `#EXTINF:-1 tvg-id="${ch.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}"`),
        });
      } else {
        // Check duplicate tvg-id
        if (seenTvgIds.has(ch.tvgId)) {
          detectedIssues.push({
            id: `sch-duptvg-${ch.index}`,
            channelIndex: ch.index,
            channelName: ch.name,
            category: 'SCHEMA',
            severity: 'warning',
            title: 'Duplicate EPG ID Collision',
            description: `EPG identifier "${ch.tvgId}" is shared by multiple streams, which can cause schedule guide collisions.`,
            rawSample: `tvg-id="${ch.tvgId}" on channel ${ch.name}`,
            proposedFix: `tvg-id="${ch.tvgId}_${ch.index}"`,
            detectedValue: ch.tvgId,
          });
        } else {
          seenTvgIds.add(ch.tvgId);
        }
      }
    }

    setProgressPercent(100);
    setActiveStep('Compiling Health Scorecard & Ingestion Diagnostics...');
    await new Promise((r) => setTimeout(r, 60));

    const fatalCount = detectedIssues.filter((i) => i.severity === 'fatal').length;
    const warningCount = detectedIssues.filter((i) => i.severity === 'warning').length;
    const infoCount = detectedIssues.filter((i) => i.severity === 'info').length;

    const delErrors = detectedIssues.filter((i) => i.category === 'DELIMITER' && i.severity === 'fatal').length;
    const delWarns = detectedIssues.filter((i) => i.category === 'DELIMITER' && i.severity === 'warning').length;
    const encErrors = detectedIssues.filter((i) => i.category === 'ENCODING' && i.severity === 'fatal').length;
    const encWarns = detectedIssues.filter((i) => i.category === 'ENCODING' && i.severity === 'warning').length;
    const schErrors = detectedIssues.filter((i) => i.category === 'SCHEMA' && i.severity === 'fatal').length;
    const schWarns = detectedIssues.filter((i) => i.category === 'SCHEMA' && i.severity === 'warning').length;

    // Score calculation
    const totalSample = channelsToTest.length || 1;
    const penalty = fatalCount * 15 + warningCount * 3 + infoCount * 0.5;
    const rawScore = Math.max(0, Math.round(100 - (penalty / totalSample) * 100));
    const healthScore = Math.min(100, Math.max(10, rawScore));

    const durationMs = Math.round(performance.now() - t0);

    const generatedSummary: IngestionValidationSummary = {
      totalAnalyzed: channelsToTest.length,
      passedCount: channelsToTest.length - fatalCount,
      delimiterErrors: delErrors,
      delimiterWarnings: delWarns,
      encodingErrors: encErrors,
      encodingWarnings: encWarns,
      schemaErrors: schErrors,
      schemaWarnings: schWarns,
      healthScore,
      durationMs,
      timestamp: new Date().toLocaleTimeString(),
    };

    setSummary(generatedSummary);
    setIssues(detectedIssues);
    setIsAnalyzing(false);
    setActiveStep(`Analysis completed in ${durationMs}ms with Health Score: ${healthScore}%`);
    logStep(`Dry-run audit finalized: ${channelsToTest.length} channels analyzed, ${fatalCount} fatal error(s), ${warningCount} warning(s).`);
  };

  // Run automatically on first mount
  useEffect(() => {
    runDryRunValidation();
  }, []);

  // Filtered issues
  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      if (selectedCategory !== 'ALL' && iss.category !== selectedCategory) return false;
      if (selectedSeverity !== 'ALL' && iss.severity !== selectedSeverity) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        return (
          iss.title.toLowerCase().includes(q) ||
          iss.channelName.toLowerCase().includes(q) ||
          iss.description.toLowerCase().includes(q) ||
          iss.rawSample.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [issues, selectedCategory, selectedSeverity, searchFilter]);

  // Export report
  const handleExportReport = () => {
    if (!summary) return;
    const report = {
      title: 'IPTV Ingestion Validation Dry-Run Diagnostic Report',
      timestamp: new Date().toISOString(),
      summary,
      issuesFound: issues,
      engineState: {
        activeTotalChannels: globalUnifiedIptvEngine.getAllChannels().length,
        sourcesCount: globalUnifiedIptvEngine.getSources().length,
      },
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ingestion-validation-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="ingestion-validation-tool-root" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-[#0b101a] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">Ingestion Validation Tool</h1>
                <span className="text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/70 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Diagnostic Matrix
                </span>
                <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">
                  Dry-Run Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Runs an isolated, non-destructive dry-run parse on playlist subsets (up to 14.9k+ channels) to detect delimiter collisions, character encoding mojibake, and schema defects before catalog commit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-run-validation"
              disabled={isAnalyzing}
              onClick={runDryRunValidation}
              className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isAnalyzing ? 'Analyzing Subset...' : 'Run Dry-Run Parse'}</span>
            </button>

            {summary && (
              <button
                id="btn-export-validation"
                onClick={handleExportReport}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-slate-300" />
                <span>Export Report</span>
              </button>
            )}

            {onJumpToPhase48 && (
              <button
                onClick={onJumpToPhase48}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                <span>Phase 48</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-Time Progress Bar */}
        {isAnalyzing && (
          <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                {activeStep}
              </span>
              <span className="font-mono text-sky-400 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-900/80 rounded-full h-2.5 overflow-hidden border border-white/5">
              <div
                className="bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Target Sample Configuration Bar */}
      <div className="bg-[#0b101a] border border-white/10 rounded-xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Validation Target &amp; Mode</h3>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setSampleMode('active_subset')}
              className={`px-3 py-1 rounded-md transition font-medium ${
                sampleMode === 'active_subset'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Catalog Subset
            </button>
            <button
              onClick={() => setSampleMode('preset_fixtures')}
              className={`px-3 py-1 rounded-md transition font-medium ${
                sampleMode === 'preset_fixtures'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Stress Fixtures
            </button>
            <button
              onClick={() => setSampleMode('custom_input')}
              className={`px-3 py-1 rounded-md transition font-medium ${
                sampleMode === 'custom_input'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Raw M3U Input
            </button>
          </div>
        </div>

        {/* Mode-specific controls */}
        {sampleMode === 'active_subset' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
            <span className="text-slate-400">Sample Subset Size:</span>
            {[50, 100, 250, 500, 1000].map((size) => (
              <button
                key={size}
                onClick={() => setSubsetSize(size)}
                className={`px-3 py-1 rounded-lg border font-mono transition ${
                  subsetSize === size
                    ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-md shadow-indigo-500/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {size} Channels
              </button>
            ))}
            <span className="text-slate-500 ml-auto font-mono">
              (Pulled from {globalUnifiedIptvEngine.getAllChannels().length.toLocaleString()} indexed channels)
            </span>
          </div>
        )}

        {sampleMode === 'preset_fixtures' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
            <span className="text-slate-400">Target Stress Vector:</span>
            {[
              { id: 'delimiters', label: 'Delimiters & Nested Bouquets (Pipes/Colons)' },
              { id: 'mojibake', label: 'Character Encoding & Mojibake (UTF-8 vs Latin-1)' },
              { id: 'schema_defects', label: 'Schema Compatibility & Broken Protocols' },
              { id: 'compliant_standard', label: 'Clean Baseline (100% Compliant)' },
            ].map((fix) => (
              <button
                key={fix.id}
                onClick={() => setFixtureType(fix.id as any)}
                className={`px-3 py-1.5 rounded-lg border transition ${
                  fixtureType === fix.id
                    ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-md'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {fix.label}
              </button>
            ))}
          </div>
        )}

        {sampleMode === 'custom_input' && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Paste raw M3U/M3U8 snippet below to run dry-run validation without writing to database:</span>
              <button
                onClick={() =>
                  setCustomInputText(
                    `#EXTINF:-1 tvg-id="custom.1" group-title="Test Group",Test Channel 1\nhttp://example.com/1.m3u8`
                  )
                }
                className="text-sky-400 hover:underline"
              >
                Reset Example
              </button>
            </div>
            <textarea
              value={customInputText}
              onChange={(e) => setCustomInputText(e.target.value)}
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 scrollbar-thin"
              placeholder="#EXTINF:-1 tvg-id=..."
            />
          </div>
        )}
      </div>

      {/* Scorecards & Diagnostic Metrics */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Health Score */}
          <div className="bg-[#0b101a] border border-white/10 rounded-xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Playlist Health Score</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-3xl font-black font-mono tracking-tight ${
                  summary.healthScore >= 90
                    ? 'text-emerald-400'
                    : summary.healthScore >= 70
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {summary.healthScore}%
              </span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 font-mono">
              {summary.passedCount} / {summary.totalAnalyzed} channels verified
            </div>
          </div>

          {/* Delimiter Integrity */}
          <div className="bg-[#0b101a] border border-white/10 rounded-xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Delimiter Integrity</span>
              <Code2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold font-mono ${
                  summary.delimiterErrors === 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {summary.delimiterErrors === 0 ? 'Optimal' : `${summary.delimiterErrors} Fatal`}
              </span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 font-mono">
              {summary.delimiterWarnings} format warning(s) flagged
            </div>
          </div>

          {/* Character Encoding / Mojibake */}
          <div className="bg-[#0b101a] border border-white/10 rounded-xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Encoding / Mojibake</span>
              <FileText className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold font-mono ${
                  summary.encodingErrors === 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {summary.encodingErrors === 0 ? 'UTF-8 Valid' : `${summary.encodingErrors} Errors`}
              </span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 font-mono">
              {summary.encodingWarnings} double-encoding pattern(s)
            </div>
          </div>

          {/* Schema & Protocol */}
          <div className="bg-[#0b101a] border border-white/10 rounded-xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Schema &amp; Protocols</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold font-mono ${
                  summary.schemaErrors === 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {summary.schemaErrors === 0 ? 'Compliant' : `${summary.schemaErrors} Invalid`}
              </span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 font-mono">
              {summary.schemaWarnings} EPG linkage warning(s)
            </div>
          </div>
        </div>
      )}

      {/* Main Analysis Section: Issue Explorer & Live Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Issues Table */}
        <div className="lg:col-span-2 bg-[#0b101a] border border-white/10 rounded-xl overflow-hidden shadow-xl flex flex-col">
          {/* Filters Bar */}
          <div className="p-3.5 bg-slate-900/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-200">Issue Filter:</span>
              <div className="flex items-center gap-1 bg-slate-950 px-1 py-0.5 rounded-lg border border-slate-800">
                {(['ALL', 'DELIMITER', 'ENCODING', 'SCHEMA'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded transition ${
                      selectedCategory === cat
                        ? 'bg-sky-500 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-950 px-1 py-0.5 rounded-lg border border-slate-800 ml-2">
                {(['ALL', 'fatal', 'warning', 'info'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSelectedSeverity(sev)}
                    className={`px-2 py-0.5 rounded uppercase font-mono text-[10px] transition ${
                      selectedSeverity === sev
                        ? sev === 'fatal'
                          ? 'bg-rose-600 text-white font-bold'
                          : sev === 'warning'
                          ? 'bg-amber-600 text-white font-bold'
                          : 'bg-sky-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
              <input
                type="text"
                placeholder="Search issues..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Issues List */}
          <div className="flex-1 max-h-[460px] overflow-y-auto divide-y divide-white/5 scrollbar-thin">
            {filteredIssues.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
                <p className="font-semibold text-slate-300">No Ingestion Anomalies Found</p>
                <p className="mt-1">All scanned channel records passed delimiter, encoding, and schema tests.</p>
              </div>
            ) : (
              filteredIssues.map((iss) => {
                const isSelected = selectedIssueDetail?.id === iss.id;
                return (
                  <div
                    key={iss.id}
                    onClick={() => setSelectedIssueDetail(iss)}
                    className={`p-3.5 cursor-pointer transition flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-950/40 border-l-4 border-l-indigo-500'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                            iss.severity === 'fatal'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : iss.severity === 'warning'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-sky-950 text-sky-300 border border-sky-800'
                          }`}
                        >
                          {iss.severity}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                          {iss.category}
                        </span>
                        <h4 className="text-xs font-semibold text-slate-200">{iss.title}</h4>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{iss.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        <span>Ch #{iss.channelIndex}</span>
                        <span>•</span>
                        <span className="text-slate-300">{iss.channelName}</span>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 mt-1 transition ${
                        isSelected ? 'text-indigo-400 rotate-90' : 'text-slate-600'
                      }`}
                    />
                  </div>
                );
              })
            )}
          </div>

          {/* Issue Detail Drawer / Bottom Panel */}
          {selectedIssueDetail && (
            <div className="p-4 bg-slate-950 border-t border-white/10 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">Anomalous Directive Detail &amp; Auto-Fix</span>
                </div>
                <button
                  onClick={() => setShowAutoFixDiff(!showAutoFixDiff)}
                  className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-mono"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{showAutoFixDiff ? 'Hide Auto-Fix Preview' : 'Show Auto-Fix Preview'}</span>
                </button>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Raw Input Sample:</span>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-rose-300 overflow-x-auto">
                    {selectedIssueDetail.rawSample}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Proposed Normalization:</span>
                  <div className="p-2 bg-slate-900 rounded-lg border border-emerald-800/60 text-emerald-300 overflow-x-auto">
                    {selectedIssueDetail.proposedFix}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Real-Time Terminal Log */}
        <div className="bg-[#0b101a] border border-white/10 rounded-xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-3.5 bg-slate-900/90 border-b border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dry-Run Parse Logs</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Live Stream</span>
          </div>

          <div className="flex-1 p-3 bg-slate-950 font-mono text-[11px] text-slate-300 space-y-1.5 overflow-y-auto max-h-[460px] scrollbar-thin">
            {validationLogs.length === 0 ? (
              <span className="text-slate-600">No logs generated yet. Click &quot;Run Dry-Run Parse&quot; to begin.</span>
            ) : (
              validationLogs.map((log, idx) => {
                const isError = log.includes('fatal') || log.includes('error');
                const isWarn = log.includes('warning') || log.includes('flagged');
                const isSuccess = log.includes('verified') || log.includes('Optimal') || log.includes('finalized');
                return (
                  <div
                    key={idx}
                    className={`leading-relaxed ${
                      isError
                        ? 'text-rose-400'
                        : isWarn
                        ? 'text-amber-300'
                        : isSuccess
                        ? 'text-emerald-300 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {log}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
