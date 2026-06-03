import { Thermometer, ClipboardCheck, Truck, Flame } from 'lucide-react';
import type { Screen } from '../App';
import { cn } from '../lib/utils';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const tiles = [
    {
      id: 'temperature',
      label: 'Temperatur',
      description: 'Kühlgeräte & Tiefkühler prüfen',
      icon: <Thermometer size={32} className="text-blue-400" />,
      screen: 'temperature' as Screen,
      glow: 'bg-blue-500/10 group-hover:bg-blue-500/20',
      iconBg: 'bg-blue-500/20',
    },
    {
      id: 'cleaning',
      label: 'Reinigung',
      description: 'Tägliche & wöchentliche Pläne',
      icon: <ClipboardCheck size={32} className="text-emerald-400" />,
      screen: 'cleaning' as Screen,
      glow: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
      iconBg: 'bg-emerald-500/20',
    },
    {
      id: 'goods',
      label: 'Wareneingang',
      description: 'Lieferungen protokollieren',
      icon: <Truck size={32} className="text-amber-400" />,
      screen: 'goods' as Screen,
      glow: 'bg-amber-500/10 group-hover:bg-amber-500/20',
      iconBg: 'bg-amber-500/20',
    },
    {
      id: 'fryer',
      label: 'Fritteuse',
      description: 'Ölwechsel & Temperatur',
      icon: <Flame size={32} className="text-orange-400" />,
      screen: 'fryer' as Screen,
      glow: 'bg-orange-500/10 group-hover:bg-orange-500/20',
      iconBg: 'bg-orange-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
      {tiles.map((tile) => (
        <button
          key={tile.id}
          id={`tile-${tile.id}`}
          onClick={() => onNavigate(tile.screen)}
          className="group relative h-40 w-full text-left transition-all active:scale-95 cursor-pointer"
        >
          <div className={cn("absolute inset-0 rounded-3xl blur-xl transition-all", tile.glow)} />
          <div className="glass-card h-full flex items-center gap-6 group-hover:border-white/20 transition-all">
            <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center grow-0 shrink-0", tile.iconBg)}>
              {tile.icon}
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-white tracking-tight">
                {tile.label}
              </span>
              <span className="text-slate-400 text-sm mt-1">
                {tile.description}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
