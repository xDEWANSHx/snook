import React from 'react';
import { RotateCcw, RotateCw, AlertCircle } from 'lucide-react';

interface ConfirmActionModalProps {
  isOpen: boolean;
  type: 'undo' | 'redo';
  actionDescription: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  isOpen,
  type,
  actionDescription,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const isUndo = type === 'undo';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF8F5] border border-stone-300 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-5 text-center flex flex-col items-center">
          {/* Icon */}
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 border shadow-sm ${
              isUndo
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
            }`}
          >
            {isUndo ? (
              <RotateCcw className="w-7 h-7 text-amber-700" />
            ) : (
              <RotateCw className="w-7 h-7 text-emerald-700" />
            )}
          </div>

          <h3 className="text-lg font-black text-stone-900 mb-1">
            {isUndo ? 'Undo Last Action?' : 'Redo Action?'}
          </h3>

          <p className="text-xs text-stone-500 mb-3">
            {isUndo
              ? 'Are you sure you want to revert the previous shot?'
              : 'Are you sure you want to re-apply this action?'}
          </p>

          {/* Action details pill */}
          {actionDescription && (
            <div className="w-full py-2 px-3 rounded-xl bg-stone-100 border border-stone-200 text-xs font-mono font-bold text-stone-800 mb-5 flex items-center justify-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>{actionDescription}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2.5 w-full">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 font-bold text-stone-700 text-xs transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 py-3 px-4 rounded-xl text-white font-black text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 ${
                isUndo
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {isUndo ? <RotateCcw className="w-3.5 h-3.5" /> : <RotateCw className="w-3.5 h-3.5" />}
              <span>{isUndo ? 'Confirm Undo' : 'Confirm Redo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
