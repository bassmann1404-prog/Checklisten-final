import { Home, Thermometer, ShieldCheck, Box, Flame } from 'lucide-react';
import { Screen } from '../App';
import { cn } from '../lib/utils';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export default function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  const tabs = [
    { id: 'dashboard' as Screen, label: 'Dashboard', icon: Home, color: 'blue' },
    { id: 'temperature' as Screen, label: 'Temperatur', icon: Thermometer, color: 'blue' },
    { id: 'fryer' as Screen, label: 'Fritteuse', icon: Flame, color: 'orange' },
    { id: 'cleaning' as Screen, label: 'Reinigung', icon: ShieldCheck, color: 'emerald' },
    { id: 'goods' as Screen, label: 'Eingang', icon: Box, color: 'amber' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 h-[88px]">
      <div className="max-w-lg mx-auto h-full glass-card !rounded-[2rem] flex items-center justify-around px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/10">
        {tabs.map((tab) => {
          const isActive = currentScreen === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1.5 w-14 h-16 rounded-2xl transition-all active:scale-90",
                isActive ? "text-white" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <div className={cn(
                "relative p-1.5 rounded-xl transition-all duration-500",
                isActive && "bg-white/10 scale-110"
              )}>
                <Icon 
                  size={22} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={cn(
                    "transition-all",
                    isActive && tab.color === 'blue' && "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]",
                    isActive && tab.color === 'emerald' && "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]",
                    isActive && tab.color === 'amber' && "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]",
                    isActive && tab.color === 'orange' && "text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]"
                  )}
                />
                {isActive && (
                  <div className={cn(
                    "absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                    tab.color === 'blue' ? "bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,1)]" :
                    tab.color === 'emerald' ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,1)]" :
                    tab.color === 'orange' ? "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,1)]" :
                    "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,1)]"
                  )} />
                )}
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-white text-center">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
