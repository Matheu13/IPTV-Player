import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Activity,
  Film,
  Play,
  Bookmark,
  BookmarkCheck,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Flame,
  Award,
  Zap,
} from 'lucide-react';
import {
  globalAiHighlightsEngine,
  SportsHighlightClip,
  CommercialDetectionTelemetry,
  HighlightEventType,
} from '../lib/aiSportsHighlightsEngine';

export const AiSportsHighlightsSurface: React.FC = () => {
  const [highlights, setHighlights] = useState<SportsHighlightClip[]>(
    globalAiHighlightsEngine.getHighlights()
  );
  const [telemetry, setTelemetry] = useState<CommercialDetectionTelemetry>(
    globalAiHighlightsEngine.getCommercialTelemetry()
  );
  const [selectedClip, setSelectedClip] = useState<SportsHighlightClip | null>(
    highlights[0] || null
  );

  useEffect(() => {
    const update = () => {
      setHighlights(globalAiHighlightsEngine.getHighlights());
      setTelemetry(globalAiHighlightsEngine.getCommercialTelemetry());
    };
    update();
    const unsub = globalAiHighlightsEngine.subscribe(update);
    return () => unsub();
  }, []);

  const handleBookmarkToggle = (id: string) => {
    globalAiHighlightsEngine.toggleBookmark(id);
  };

  const handleSimulateGoalEvent = () => {
    const newHl = globalAiHighlightsEngine.triggerManualEvent(
      'GOAL',
      'AI Detected: 30-Yard Volley Goal (98.4dB Crowd Spike & Scoreboard +1)'
    );
    setSelectedClip(newHl);
  };

  const handleToggleCommercialSim = () => {
    globalAiHighlightsEngine.toggleCommercialSim();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800">
              Milestone 22
            </span>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              AI Sports Highlights &amp; Commercial Blackout Normalizer
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time audio decibel spike classifier, computer-vision OCR score tracker, automated 15-second instant replay clipping, and EBU R128 (-24 LUFS) loudness normalization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-trigger-ai-goal"
            onClick={handleSimulateGoalEvent}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-amber-950/40 transition"
          >
            <Flame className="w-4 h-4" /> Trigger AI Goal Detection (+15s Clip)
          </button>
          <button
            onClick={handleToggleCommercialSim}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition border ${
              telemetry.isCommercialActive
                ? 'bg-rose-950 border-rose-700 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <VolumeX className="w-4 h-4" />
            {telemetry.isCommercialActive ? 'Ad Blackout: ACTIVE' : 'Simulate Commercial Break'}
          </button>
        </div>
      </div>

      {/* AI Telemetry & Loudness Radar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500">EBU R128 Loudness</div>
          <div className="text-lg font-bold text-amber-400 flex items-center gap-1 mt-0.5">
            <Activity className="w-4 h-4" /> {telemetry.ebuLoudnessLufs} LUFS
          </div>
          <div className="text-[10px] text-slate-400 font-mono">ITU-R BS.1770 Target: -24.0</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500">Commercial Detector</div>
          <div className={`text-sm font-bold flex items-center gap-1 mt-1 ${
            telemetry.isCommercialActive ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            {telemetry.isCommercialActive ? 'AD BREAK (Audio Ducked)' : 'Live Match Broadcast'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Confidence: {(telemetry.confidence * 100).toFixed(0)}%</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500">Generated Replays</div>
          <div className="text-lg font-bold text-slate-200 mt-0.5">
            {highlights.length} Clips
          </div>
          <div className="text-[10px] text-slate-500 font-mono">15s Ring-Buffer DVR</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500">OCR Score Tracker</div>
          <div className="text-sm font-bold text-cyan-400 mt-1">
            MCI 2 - 1 LIV (78')
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Vision Latency: 42ms</div>
        </div>
      </div>

      {/* Selected Clip Player View & Highlights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clip Player */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-400" />
              AI Instant Replay Player &amp; Smart Clip Viewer
            </h3>
            {selectedClip && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                {selectedClip.eventType} • {selectedClip.gameTimeCode}
              </span>
            )}
          </div>

          {selectedClip ? (
            <div className="space-y-3">
              <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center group">
                <img
                  src={selectedClip.thumbnailUrl}
                  alt={selectedClip.description}
                  className="w-full h-full object-cover opacity-75 group-hover:opacity-90 transition duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 px-2 py-1 bg-slate-950/80 rounded border border-slate-700 text-[11px] font-mono text-amber-300 font-bold">
                  {selectedClip.gameTimeCode} Match Time
                </div>
                <div className="absolute top-3 right-3 px-2 py-1 bg-slate-950/80 rounded border border-slate-700 text-[11px] font-mono text-emerald-400 font-bold">
                  AI Confidence: {(selectedClip.confidenceScore * 100).toFixed(0)}%
                </div>
                <div className="p-4 bg-amber-500 text-slate-950 rounded-full shadow-2xl hover:scale-110 transition cursor-pointer">
                  <Play className="w-8 h-8 fill-slate-950 ml-1" />
                </div>
                <div className="absolute bottom-3 left-3 right-3 text-xs text-slate-200 font-medium">
                  {selectedClip.description}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
                <span>Clip Duration: {selectedClip.durationSec}s</span>
                <span>Decibel Peak: {selectedClip.decibelPeakDb} dBFS</span>
                <button
                  onClick={() => handleBookmarkToggle(selectedClip.id)}
                  className="flex items-center gap-1 text-amber-400 hover:text-amber-300"
                >
                  {selectedClip.isBookmarked ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-amber-400" /> Bookmarked
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" /> Bookmark Clip
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              Select a clip from the highlights shelf below
            </div>
          )}
        </div>

        {/* Highlights Shelf */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Game Highlights Feed
            </h4>
            <span className="text-[11px] font-mono text-slate-500">{highlights.length} Events</span>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {highlights.map((hl) => (
              <div
                key={hl.id}
                onClick={() => setSelectedClip(hl)}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-start gap-3 ${
                  selectedClip?.id === hl.id
                    ? 'bg-amber-950/30 border-amber-500/80 shadow-md'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-16 h-12 rounded bg-slate-900 overflow-hidden flex-shrink-0 relative">
                  <img src={hl.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0.5 right-0.5 px-1 bg-black/80 text-[8px] font-mono text-white rounded">
                    {hl.durationSec}s
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold text-amber-400">{hl.eventType}</span>
                    <span className="text-slate-500">{hl.gameTimeCode}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium line-clamp-2 mt-0.5">
                    {hl.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
