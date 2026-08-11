import { WeightEntry } from '@/stores/useWeightStore';

interface WeightChartProps {
  entries: WeightEntry[];
}

export function WeightChart({ entries }: WeightChartProps) {
  if (entries.length < 2) {
    return (
      <div className="text-center py-6 text-white/30 text-sm">
 Registre seu peso por pelo menos 2 dias para ver o gráfico
      </div>
    );
  }

  const last30 = entries.slice(-30);
  const weights = last30.map((e) => e.weight);
  const minW = Math.min(...weights) - 0.5;
  const maxW = Math.max(...weights) + 0.5;
  const range = maxW - minW || 1;

  const W = 300;
  const H = 120;
  const padX = 36;
  const padY = 16;
  const chartW = W - padX * 2;
  const chartH = H - padY * 2;

  const points = last30.map((e, i) => {
    const x = padX + (i / (last30.length - 1)) * chartW;
    const y = padY + (1 - (e.weight - minW) / range) * chartH;
    return { x, y, ...e };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${H - padY} L ${points[0].x} ${H - padY} Z`;

  const firstW = weights[0];
  const lastW = weights[weights.length - 1];
  const diff = lastW - firstW;
  const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  const diffColor = 'text-primary-300';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-2xl font-bold">{lastW.toFixed(1)}</span>
          <span className="text-xs text-white/40 ml-1">kg</span>
        </div>
        <span className={`text-sm font-medium ${diffColor}`}>
          {diffStr} kg
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28">
        <defs>
          <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--color-primary-rgb))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(var(--color-primary-rgb))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.5, 1].map((t) => {
          const y = padY + (1 - t) * chartH;
          const val = (minW + t * range).toFixed(1);
          return (
            <g key={t}>
              <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="rgba(255,255,255,0.05)" />
              <text x={4} y={y + 3} fill="rgba(255,255,255,0.3)" fontSize="8">{val}</text>
            </g>
          );
        })}
        {/* Area */}
        <path d={areaPath} fill="url(#weightGrad)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="rgb(var(--color-primary-rgb))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2} fill="rgb(var(--color-primary-rgb))" stroke="rgb(var(--color-bg-card-rgb))" strokeWidth="1" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-white/30 px-1">
        <span>{last30[0].date.slice(5)}</span>
        <span>{last30[last30.length - 1].date.slice(5)}</span>
      </div>
    </div>
  );
}
