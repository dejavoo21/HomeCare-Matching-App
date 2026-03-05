import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

const URGENCY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: 'rgba(15,23,42,.06)', text: '#0f172a', border: 'rgba(15,23,42,.10)' },
  medium: { bg: 'rgba(59,130,246,.12)', text: '#1e40af', border: 'rgba(59,130,246,.22)' },
  high: { bg: 'rgba(245,158,11,.12)', text: '#b45309', border: 'rgba(245,158,11,.22)' },
  critical: { bg: 'rgba(239,68,68,.12)', text: '#991b1b', border: 'rgba(239,68,68,.22)' },
};

interface UrgencyQuickSetProps {
  requestId: string;
  currentUrgency: string;
  onSetUrgency: (requestId: string, urgency: string) => Promise<void>;
  isLoading?: boolean;
}

export function UrgencyQuickSet({ requestId, currentUrgency, onSetUrgency, isLoading }: UrgencyQuickSetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelect = async (urgency: string) => {
    if (urgency === currentUrgency) {
      setIsOpen(false);
      return;
    }

    setIsProcessing(true);
    try {
      await onSetUrgency(requestId, urgency);
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to set urgency:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const normalizedCurrent = String(currentUrgency).toLowerCase();
  const color = URGENCY_COLORS[normalizedCurrent] || URGENCY_COLORS.low;

  return (
    <div className="relative inline-block w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isProcessing || isLoading}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-sm font-600 transition-all"
        style={{
          backgroundColor: color.bg,
          color: color.text,
          borderColor: color.border,
          opacity: isProcessing ? 0.6 : 1,
          cursor: isProcessing ? 'not-allowed' : 'pointer',
        }}
      >
        <span className="capitalize">{normalizedCurrent}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-md shadow-lg z-20">
          {URGENCY_LEVELS.map((level) => {
            const levelColor = URGENCY_COLORS[level];
            const isSelected = level === normalizedCurrent;

            return (
              <button
                key={level}
                onClick={() => handleSelect(level)}
                disabled={isProcessing}
                className="w-full text-left px-3 py-2 text-sm font-500 transition-all hover:bg-indigo-50"
                style={{
                  backgroundColor: isSelected ? 'rgba(99,102,241,.08)' : 'transparent',
                  color: levelColor.text,
                  borderBottom: '1px solid rgba(0,0,0,.06)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="capitalize">{level}</span>
                  {isSelected && <span className="text-indigo-600 font-bold">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
