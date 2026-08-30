import React, { useState, useEffect, useRef } from 'react';
import { Tv, Radio, ArrowRight, CornerDownLeft, X, Hash } from 'lucide-react';
import { ChannelRowData } from './ChannelRow';
import { Focusable } from './Focusable';

interface QuickZapOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onTuneToNumber: (channelNumber: number) => void;
  currentChannel?: ChannelRowData | null;
  channels?: ChannelRowData[];
}

export const QuickZapOverlay: React.FC<QuickZapOverlayProps> = ({
  isOpen,
  onClose,
  onTuneToNumber,
  currentChannel,
  channels = [],
}) => {
  const [digits, setDigits] = useState<string>('');
  const autoTuneTimer = useRef<any>(null);

  // Global numeric key handler when zapper is open or pressed
  useEffect(() => {
    if (!isOpen) {
      setDigits('');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        setDigits((prev) => {
          const next = (prev + e.key).slice(0, 4);
          return next;
        });
      } else if (e.key === 'Backspace') {
        setDigits((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        if (digits.length > 0) {
          onTuneToNumber(parseInt(digits, 10));
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, digits, onTuneToNumber, onClose]);

  // Auto tune after 2.5 seconds of inactivity if digits entered
  useEffect(() => {
    if (autoTuneTimer.current) clearTimeout(autoTuneTimer.current);

    if (digits.length > 0) {
      autoTuneTimer.current = setTimeout(() => {
        onTuneToNumber(parseInt(digits, 10));
        onClose();
      }, 2500);
    }

    return () => {
      if (autoTuneTimer.current) clearTimeout(autoTuneTimer.current);
    };
  }, [digits, onTuneToNumber, onClose]);

  if (!isOpen) return null;

  const targetChannel = channels.find((c) => c.channelNumber === parseInt(digits, 10));

  const handlePadClick = (num: string) => {
    setDigits((prev) => (prev + num).slice(0, 4));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-sm bg-[#0c1018] border border-sky-500/40 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sky-400">
            <Hash className="w-5 h-5" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">Quick Channel Zap</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Big Digit Display */}
        <div className="bg-[#111722] border border-white/10 rounded-xl p-4 text-center space-y-2">
          <div className="text-4xl font-mono font-black tracking-widest text-sky-400 min-h-[48px] flex items-center justify-center">
            {digits || <span className="text-slate-600 animate-pulse">_ _ _</span>}
          </div>

          {targetChannel ? (
            <div className="text-xs font-semibold text-emerald-400">
              Matched: {targetChannel.name}
            </div>
          ) : digits.length > 0 ? (
            <div className="text-xs text-slate-400">
              Press Enter or wait to tune
            </div>
          ) : (
            <div className="text-[11px] text-slate-500">
              Type channel number on remote or click keypad
            </div>
          )}
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'GO'].map((key) => {
            const isSpecial = key === 'CLR' || key === 'GO';

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (key === 'CLR') setDigits('');
                  else if (key === 'GO') {
                    if (digits.length > 0) {
                      onTuneToNumber(parseInt(digits, 10));
                      onClose();
                    }
                  } else {
                    handlePadClick(key);
                  }
                }}
                className={`h-12 rounded-xl font-mono text-base font-bold transition-all ${
                  key === 'GO'
                    ? 'bg-sky-500 text-slate-950 hover:bg-sky-400 font-extrabold shadow-lg shadow-sky-500/20'
                    : key === 'CLR'
                    ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                    : 'bg-[#161e2c] text-white hover:bg-[#202b3e] border border-white/5 active:scale-95'
                }`}
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
