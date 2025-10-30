import { Button } from "@/components/ui/button";

export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface TimeframeSelectorProps {
  selected: Timeframe;
  onChange: (timeframe: Timeframe) => void;
  className?: string;
}

const timeframeOptions: { value: Timeframe; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export function TimeframeSelector({ selected, onChange, className = '' }: TimeframeSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {timeframeOptions.map((option) => (
        <Button
          key={option.value}
          variant={selected === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(option.value)}
          className={`
            ${selected === option.value 
              ? 'bg-brand-primary text-white hover:bg-brand-primary/80' 
              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}
          `}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

