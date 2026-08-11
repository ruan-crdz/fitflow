import { useEffect, useRef, useState } from 'react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  menuClassName?: string;
}

export function CustomSelect({
  value,
  options,
  onChange,
  className = '',
  menuClassName = '',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selected = options.find((item) => item.value === value) || options[0];

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="input-field text-sm flex items-center justify-between gap-2"
      >
        <span className="truncate">{selected?.label || 'Selecionar'}</span>
        <MaterialIcon name="expand_more" className={`text-white/60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute z-[120] mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[rgb(var(--color-bg-card-rgb))] shadow-[0_16px_40px_rgba(0,0,0,0.28)] ${menuClassName}`}>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${active ? 'bg-primary-500/20 text-primary-300' : 'text-white/75 hover:bg-white/5'}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
