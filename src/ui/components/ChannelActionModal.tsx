import React, { useState } from 'react';
import {
  Play,
  Maximize2,
  Heart,
  CircleDot,
  Bell,
  RotateCcw,
  Grid2X2,
  Edit3,
  Hash,
  FolderPlus,
  Tv,
  Image,
  Clock,
  Wrench,
  EyeOff,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { ChannelLogo } from './ChannelLogo';
import { UnifiedChannel, globalUnifiedIptvEngine } from '../../lib/unifiedIptvEngine';
import { globalUserOverlayManager, ChannelOverlay } from '../../lib/userOverlayManager';
import { usePlayback } from '../context/PlaybackContext';

interface ChannelActionModalProps {
  channel: UnifiedChannel | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayFullscreen?: () => void;
  onPlayPreview?: () => void;
  onAddToMultiView?: (channel: UnifiedChannel) => void;
}

export const ChannelActionModal: React.FC<ChannelActionModalProps> = ({
  channel,
  isOpen,
  onClose,
  onPlayFullscreen,
  onPlayPreview,
  onAddToMultiView,
}) => {
  const { playChannel } = usePlayback();
  const [activeTab, setActiveTab] = useState<'actions' | 'edit_details' | 'stream_fix'>('actions');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Edit Overlay Form State
  const [customName, setCustomName] = useState('');
  const [customNumber, setCustomNumber] = useState<string>('');
  const [customGroup, setCustomGroup] = useState('');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [epgIdOverride, setEpgIdOverride] = useState('');
  const [guideOffsetHours, setGuideOffsetHours] = useState<number>(0);
  const [streamCorrectionUrl, setStreamCorrectionUrl] = useState('');

  // Sync state when channel changes
  React.useEffect(() => {
    if (channel) {
      const overlay = globalUserOverlayManager.getOverlay(channel.id);
      setCustomName(overlay?.customName || channel.name);
      setCustomNumber(overlay?.customNumber !== undefined ? String(overlay.customNumber) : String(channel.channelNumber));
      setCustomGroup(overlay?.customGroup || channel.category);
      setCustomLogoUrl(overlay?.customLogoUrl || channel.logoUrl || '');
      setEpgIdOverride(overlay?.epgIdOverride || channel.tvgId);
      setGuideOffsetHours(overlay?.guideOffsetHours || 0);
      setStreamCorrectionUrl(overlay?.streamCorrectionUrl || '');
      setFeedback(null);
    }
  }, [channel, isOpen]);

  if (!isOpen || !channel) return null;

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleToggleFavorite = () => {
    globalUnifiedIptvEngine.toggleFavorite(channel.id);
    const isNowFav = globalUnifiedIptvEngine.isFavorite(channel.id);
    showToast(isNowFav ? 'Added to Favorites' : 'Removed from Favorites');
  };

  const handleSaveOverlay = () => {
    const patch: Partial<ChannelOverlay> = {
      customName: customName.trim() || undefined,
      customNumber: customNumber ? parseInt(customNumber, 10) : undefined,
      customGroup: customGroup.trim() || undefined,
      customLogoUrl: customLogoUrl.trim() || undefined,
      epgIdOverride: epgIdOverride.trim() || undefined,
      guideOffsetHours: guideOffsetHours !== 0 ? guideOffsetHours : undefined,
      streamCorrectionUrl: streamCorrectionUrl.trim() || undefined,
    };
    globalUserOverlayManager.setOverlay(channel.id, patch);
    showToast('Channel settings & overlay saved.');
    setTimeout(() => {
      setActiveTab('actions');
    }, 600);
  };

  const handleToggleHide = () => {
    const existing = globalUserOverlayManager.getOverlay(channel.id);
    const willHide = !existing?.isHidden;
    globalUserOverlayManager.setOverlay(channel.id, { isHidden: willHide });
    showToast(willHide ? 'Channel hidden from guide' : 'Channel unhidden');
  };

  const handleAddReminder = () => {
    if (!channel.epgNow) {
      showToast('No active EPG program schedule found.');
      return;
    }
    globalUserOverlayManager.addReminder({
      channelId: channel.id,
      channelName: channel.name,
      programTitle: channel.epgNow.title,
      startTs: channel.epgNow.startTs,
      endTs: channel.epgNow.endTs,
    });
    showToast(`Reminder set for: ${channel.epgNow.title}`);
  };

  const handleScheduleRecording = () => {
    if (!channel.epgNow) {
      showToast('No active EPG program schedule found.');
      return;
    }
    globalUserOverlayManager.scheduleRecording({
      channelId: channel.id,
      channelName: channel.name,
      programTitle: channel.epgNow.title,
      startTs: channel.epgNow.startTs,
      endTs: channel.epgNow.endTs,
    });
    showToast(`PVR Recording scheduled for: ${channel.epgNow.title}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0e131f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="p-4 bg-[#141a29] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <ChannelLogo
              name={channel.name}
              logoUrl={channel.logoUrl}
              category={channel.category}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-mono text-[10px] font-bold">
                  CH {channel.channelNumber}
                </span>
                <h3 className="font-bold text-sm text-white truncate">{channel.name}</h3>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {channel.category} • {channel.sourceName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-4 py-2 text-xs font-semibold text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex border-b border-white/5 bg-[#0a0e17] px-4 pt-2">
          <button
            onClick={() => setActiveTab('actions')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'actions'
                ? 'border-sky-400 text-sky-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Quick Actions
          </button>
          <button
            onClick={() => setActiveTab('edit_details')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'edit_details'
                ? 'border-sky-400 text-sky-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom Overlays & EPG
          </button>
          <button
            onClick={() => setActiveTab('stream_fix')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'stream_fix'
                ? 'border-sky-400 text-sky-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Stream Corrections
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
          {activeTab === 'actions' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Play Preview */}
              <button
                onClick={() => {
                  if (onPlayPreview) onPlayPreview();
                  else {
                    playChannel({
                      id: channel.id,
                      channelNumber: channel.channelNumber,
                      name: channel.name,
                      category: channel.category,
                      sourceName: channel.sourceName,
                      sourceId: channel.sourceId,
                      streamUrl: channel.streamUrl,
                      is4k: channel.resolution?.includes('4K'),
                    }, 'embedded');
                  }
                  onClose();
                }}
                className="p-3 rounded-xl bg-[#141a29] hover:bg-sky-600/30 border border-white/5 hover:border-sky-500/40 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
              >
                <Play className="w-5 h-5 text-sky-400 group-hover:scale-110 transition" />
                <div>
                  <div className="text-xs font-bold text-white">Play in Preview</div>
                  <div className="text-[10px] text-slate-400">Keep guide open</div>
                </div>
              </button>

              {/* Play Fullscreen */}
              <button
                onClick={() => {
                  if (onPlayFullscreen) onPlayFullscreen();
                  else {
                    playChannel({
                      id: channel.id,
                      channelNumber: channel.channelNumber,
                      name: channel.name,
                      category: channel.category,
                      sourceName: channel.sourceName,
                      sourceId: channel.sourceId,
                      streamUrl: channel.streamUrl,
                      is4k: channel.resolution?.includes('4K'),
                    }, 'fullscreen');
                  }
                  onClose();
                }}
                className="p-3 rounded-xl bg-[#141a29] hover:bg-sky-600/30 border border-white/5 hover:border-sky-500/40 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
              >
                <Maximize2 className="w-5 h-5 text-sky-400 group-hover:scale-110 transition" />
                <div>
                  <div className="text-xs font-bold text-white">Play Fullscreen</div>
                  <div className="text-[10px] text-slate-400">Cinematic mode</div>
                </div>
              </button>

              {/* Toggle Favorite */}
              <button
                onClick={handleToggleFavorite}
                className="p-3 rounded-xl bg-[#141a29] hover:bg-rose-600/20 border border-white/5 hover:border-rose-500/40 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
              >
                <Heart
                  className={`w-5 h-5 ${
                    channel.isFavorite ? 'text-rose-500 fill-rose-500' : 'text-slate-400'
                  } group-hover:scale-110 transition`}
                />
                <div>
                  <div className="text-xs font-bold text-white">
                    {channel.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                  </div>
                  <div className="text-[10px] text-slate-400">Pinned quick list</div>
                </div>
              </button>

              {/* Schedule PVR Recording */}
              <button
                onClick={handleScheduleRecording}
                className="p-3 rounded-xl bg-[#141a29] hover:bg-amber-600/20 border border-white/5 hover:border-amber-500/40 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
              >
                <CircleDot className="w-5 h-5 text-amber-400 group-hover:scale-110 transition" />
                <div>
                  <div className="text-xs font-bold text-white">Record / PVR</div>
                  <div className="text-[10px] text-slate-400">Save to library</div>
                </div>
              </button>

              {/* Set Reminder */}
              <button
                onClick={handleAddReminder}
                className="p-3 rounded-xl bg-[#141a29] hover:bg-emerald-600/20 border border-white/5 hover:border-emerald-500/40 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
              >
                <Bell className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition" />
                <div>
                  <div className="text-xs font-bold text-white">Set Reminder</div>
                  <div className="text-[10px] text-slate-400">Upcoming alert</div>
                </div>
              </button>

              {/* Multi-View */}
              <button
                onClick={() => {
                  if (onAddToMultiView) onAddToMultiView(channel);
                  showToast('Added to Multi-View matrix');
                }}
                className="p-3 rounded-xl bg-[#141a29] hover:bg-purple-600/20 border border-white/5 hover:border-purple-500/40 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
              >
                <Grid2X2 className="w-5 h-5 text-purple-400 group-hover:scale-110 transition" />
                <div>
                  <div className="text-xs font-bold text-white">Add to Multi-View</div>
                  <div className="text-[10px] text-slate-400">Multi-screen live</div>
                </div>
              </button>

              {/* Hide / Unhide Channel */}
              <button
                onClick={handleToggleHide}
                className="p-3 rounded-xl bg-[#141a29] hover:bg-slate-700/50 border border-white/5 hover:border-slate-500/40 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
              >
                <EyeOff className="w-5 h-5 text-slate-400 group-hover:scale-110 transition" />
                <div>
                  <div className="text-xs font-bold text-white">Hide Channel</div>
                  <div className="text-[10px] text-slate-400">Clean up guide list</div>
                </div>
              </button>

              {/* Edit Details Tab Shortcut */}
              <button
                onClick={() => setActiveTab('edit_details')}
                className="p-3 rounded-xl bg-[#141a29] hover:bg-sky-600/20 border border-white/5 hover:border-sky-500/40 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
              >
                <Edit3 className="w-5 h-5 text-sky-400 group-hover:scale-110 transition" />
                <div>
                  <div className="text-xs font-bold text-white">Rename & Reorder</div>
                  <div className="text-[10px] text-slate-400">Custom user overlay</div>
                </div>
              </button>

              {/* Stream Correction Tab Shortcut */}
              <button
                onClick={() => setActiveTab('stream_fix')}
                className="p-3 rounded-xl bg-[#141a29] hover:bg-sky-600/20 border border-white/5 hover:border-sky-500/40 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
              >
                <Wrench className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition" />
                <div>
                  <div className="text-xs font-bold text-white">Stream Fallbacks</div>
                  <div className="text-[10px] text-slate-400">Fix mirror URLs</div>
                </div>
              </button>
            </div>
          )}

          {activeTab === 'edit_details' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-sky-950/40 border border-sky-500/30 rounded-xl text-sky-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  All changes are saved as persistent local overlays. Provider catalog updates will not wipe your custom names, numbers, or logo choices.
                </span>
              </div>

              {/* Custom Channel Name */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Custom Channel Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-[#141a29] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-sky-500"
                  placeholder="e.g. ESPN Main HD"
                />
              </div>

              {/* Custom Channel Number & Custom Group */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Channel Number</label>
                  <input
                    type="number"
                    value={customNumber}
                    onChange={(e) => setCustomNumber(e.target.value)}
                    className="w-full bg-[#141a29] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-sky-500"
                    placeholder="101"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Custom Group</label>
                  <input
                    type="text"
                    value={customGroup}
                    onChange={(e) => setCustomGroup(e.target.value)}
                    className="w-full bg-[#141a29] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-sky-500"
                    placeholder="e.g. My Favorites"
                  />
                </div>
              </div>

              {/* Custom Logo Override */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Logo URL Override</label>
                <input
                  type="text"
                  value={customLogoUrl}
                  onChange={(e) => setCustomLogoUrl(e.target.value)}
                  className="w-full bg-[#141a29] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-sky-500"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              {/* EPG ID Override & Timezone Offset */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">EPG XMLTV ID (tvg-id)</label>
                  <input
                    type="text"
                    value={epgIdOverride}
                    onChange={(e) => setEpgIdOverride(e.target.value)}
                    className="w-full bg-[#141a29] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-sky-500"
                    placeholder="bbc.one.uk"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Guide Time Offset (Hours)</label>
                  <select
                    value={guideOffsetHours}
                    onChange={(e) => setGuideOffsetHours(parseInt(e.target.value, 10))}
                    className="w-full bg-[#141a29] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-sky-500"
                  >
                    <option value="-6">-6 Hours</option>
                    <option value="-3">-3 Hours</option>
                    <option value="-1">-1 Hour</option>
                    <option value="0">0 (Normal / Exact)</option>
                    <option value="1">+1 Hour</option>
                    <option value="2">+2 Hours</option>
                    <option value="3">+3 Hours</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setActiveTab('actions')}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveOverlay}
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'stream_fix' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-cyan-300">
                Configure direct fallback stream URLs or override broken upstream URLs with local proxy mirrors.
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Stream Correction URL</label>
                <input
                  type="text"
                  value={streamCorrectionUrl}
                  onChange={(e) => setStreamCorrectionUrl(e.target.value)}
                  className="w-full bg-[#141a29] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-sky-500"
                  placeholder="https://mirror.feed/stream.m3u8"
                />
              </div>

              <div>
                <span className="block text-slate-400 mb-1">Active Failover Feeds:</span>
                <div className="space-y-1">
                  <div className="p-2 rounded bg-black/40 border border-white/5 text-[11px] font-mono text-slate-300 flex items-center justify-between">
                    <span className="truncate">Primary: {channel.streamUrl}</span>
                    <span className="text-emerald-400 text-[10px] shrink-0 font-bold">ONLINE</span>
                  </div>
                  {channel.alternativeStreamUrls?.map((alt, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-black/40 border border-white/5 text-[11px] font-mono text-slate-400 flex items-center justify-between"
                    >
                      <span className="truncate">Mirror #{idx + 1}: {alt}</span>
                      <span className="text-sky-400 text-[10px] shrink-0">STANDBY</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setActiveTab('actions')}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveOverlay}
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold"
                >
                  Apply Stream Fix
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
