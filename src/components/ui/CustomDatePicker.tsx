import { useEffect, useMemo, useRef, useState } from 'react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function normalizeMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildCalendarDays(baseMonth: Date): Array<{ date: Date; inMonth: boolean }> {
  const start = normalizeMonth(baseMonth);
  const startWeekDay = (start.getDay() + 6) % 7;
  const firstGridDay = new Date(start);
  firstGridDay.setDate(start.getDate() - startWeekDay);

  const days: Array<{ date: Date; inMonth: boolean }> = [];
  for (let i = 0; i < 42; i += 1) {
    const current = new Date(firstGridDay);
    current.setDate(firstGridDay.getDate() + i);
    days.push({
      date: current,
      inMonth: current.getMonth() === baseMonth.getMonth(),
    });
  }
  return days;
}

export function CustomDatePicker({ value, onChange, className = '' }: CustomDatePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const [visibleMonth, setVisibleMonth] = useState<Date>(normalizeMonth(selectedDate));

  useEffect(() => {
    setVisibleMonth(normalizeMonth(selectedDate));
  }, [selectedDate]);

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

  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const selectedIso = toIso(selectedDate);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="input-field text-sm flex items-center justify-between gap-2"
      >
        <span>{selectedDate.toLocaleDateString('pt-BR')}</span>
        <MaterialIcon name="calendar_month" className="text-white/60" />
      </button>

      {open && (
        <div className="absolute z-[120] mt-2 w-[290px] max-w-[90vw] rounded-2xl border border-white/10 bg-[rgb(var(--color-bg-card-rgb))] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="w-8 h-8 rounded-lg bg-white/5 text-white/65 hover:bg-white/10"
              aria-label="Mês anterior"
            >
              <MaterialIcon name="chevron_left" />
            </button>
            <p className="text-sm font-bold capitalize">{monthLabel(visibleMonth)}</p>
            <button
              type="button"
              onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="w-8 h-8 rounded-lg bg-white/5 text-white/65 hover:bg-white/10"
              aria-label="Próximo mês"
            >
              <MaterialIcon name="chevron_right" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, idx) => (
              <span key={`${day}-${idx}`} className="text-[10px] text-white/35 text-center font-bold py-1">{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map(({ date, inMonth }) => {
              const iso = toIso(date);
              const active = iso === selectedIso;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`h-9 rounded-lg text-xs font-semibold transition-colors ${active
                    ? 'bg-primary-500 text-black'
                    : inMonth
                      ? 'text-white/80 hover:bg-white/8'
                      : 'text-white/30 hover:bg-white/6'
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
