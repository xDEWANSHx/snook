import React, { useState } from 'react';
import { Radio, Copy, Check, X, ArrowRight, Smartphone } from 'lucide-react';
import { normalizeRoomCode } from '../services/realtimeService';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  onSwitchRoom: (code: string) => void;
  realtimeStatus: 'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED';
}

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  onSwitchRoom,
  realtimeStatus,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const normalized = normalizeRoomCode(roomCode);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', normalized);
      navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeRoomCode(inputCode);
    if (clean) {
      onSwitchRoom(clean);
      setInputCode('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF8F5] border border-stone-300 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-900 to-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black">Multi-Phone Realtime Sync</h2>
              <p className="text-xs text-emerald-200">Control table from any mobile phone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 flex flex-col gap-5">
          {/* Status badge */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-stone-200 shadow-sm text-xs font-semibold">
            <span className="text-stone-500">Live Status:</span>
            {realtimeStatus === 'SUBSCRIBED' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Syncing (Online)
              </span>
            ) : realtimeStatus === 'CONNECTING' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Connecting to Room...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-300 font-bold">
                <span className="w-2 h-2 rounded-full bg-stone-400" />
                Local Room
              </span>
            )}
          </div>

          {/* Current Room Code Display */}
          <div className="text-center p-4 rounded-2xl bg-stone-900 text-white border border-stone-800 shadow-inner">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
              Active Table Number
            </span>
            <div className="flex items-center justify-center gap-2">
              <span className="text-stone-400 font-bold text-lg sm:text-xl">TABLE #</span>
              <span className="text-3xl sm:text-5xl font-black font-mono tracking-widest text-emerald-300">
                {roomCode.replace('TABLE-', '')}
              </span>
            </div>
            <span className="text-[11px] text-stone-400 block mt-1.5">
              Enter this 3-digit code on any mobile phone to sync scores live
            </span>
          </div>

          {/* Share Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-200 stroke-[3]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Invite Link for Other Phones'}</span>
          </button>

          <p className="text-[11px] text-stone-500 text-center leading-relaxed flex items-center justify-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-stone-400" />
            <span>Send link on WhatsApp so friends can join from their phones.</span>
          </p>

          {/* Join Another Room Form */}
          <div className="border-t border-stone-200 pt-4">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
              Join Another Table
            </label>
            <form onSubmit={handleJoin} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter 3-digit Table # (e.g. 482)"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                maxLength={12}
                className="flex-1 px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-sm"
              />
              <button
                type="submit"
                className="py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <span>Join</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
