import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  getDay,
  startOfDay,
  endOfDay,
  subMonths,
  addMonths
} from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarDropdownProps {
  type: 'temperature' | 'cleaning' | 'goods' | 'fryer';
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

export default function CalendarDropdown({ type, selectedDate, onSelectDate, onClose }: CalendarDropdownProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(selectedDate));
  const now = new Date();
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Shift days for grid (Mon-Sun)
  const startOffset = (getDay(monthStart) + 6) % 7;
  const gridDays = [...Array(startOffset).fill(null), ...days];

  // Data for the viewed month
  const tempMeasurements = useLiveQuery(
    () => db.tempMeasurements.where('timestamp').between(monthStart, monthEnd).toArray(),
    [currentMonth]
  );
  const cleaningLogs = useLiveQuery(
    () => db.cleaningLogs.where('timestamp').between(monthStart, monthEnd).toArray(),
    [currentMonth]
  );
  const deliveries = useLiveQuery(
    () => db.deliveries.where('timestamp').between(monthStart, monthEnd).toArray(),
    [currentMonth]
  );
  const fryerLogs = useLiveQuery(
    () => db.fryerLogs.where('timestamp').between(monthStart, monthEnd).toArray(),
    [currentMonth]
  );
  
  const devicesCount = useLiveQuery(() => db.devices.count()) || 0;
  const tasksCount = useLiveQuery(() => db.cleaningTasks.where('interval').equals('täglich').count()) || 0;

  const getDayStatus = (date: Date) => {
    if (type === 'temperature') {
      if (devicesCount === 0) return 'neutral';
      const dayMeasurements = tempMeasurements?.filter(m => isSameDay(new Date(m.timestamp), date)) || [];
      const measuredDeviceIds = new Set(dayMeasurements.map(m => m.deviceId));
      return measuredDeviceIds.size >= devicesCount ? 'success' : (dayMeasurements.length > 0 ? 'warning' : 'danger');
    }
    
    if (type === 'cleaning') {
      if (tasksCount === 0) return 'neutral';
      const dayLogs = cleaningLogs?.filter(l => isSameDay(new Date(l.timestamp), date)) || [];
      return dayLogs.length >= tasksCount ? 'success' : (dayLogs.length > 0 ? 'warning' : 'danger');
    }
    
    if (type === 'goods') {
      const hasDelivery = deliveries?.some(d => isSameDay(new Date(d.timestamp), date));
      return hasDelivery ? 'info' : 'neutral';
    }

    if (type === 'fryer') {
      const hasLogs = fryerLogs?.some(l => isSameDay(new Date(l.timestamp), date));
      return hasLogs ? 'info' : 'neutral';
    }
    
    return 'neutral';
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="w-full overflow-hidden mb-6"
    >
      <div className="flex flex-col gap-4 py-2">
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
            {format(currentMonth, 'MMMM yyyy', { locale: de })}
          </h3>
          <button
            onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-3 sm:gap-4 justify-items-center">
          {gridDays.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="w-8 h-8" />;
            
            const status = getDayStatus(day);
            const isToday = isSameDay(day, now);
            const isSelected = isSameDay(day, selectedDate);

            return (
              <button 
                key={day.toString()} 
                onClick={() => onSelectDate(day)}
                className="relative flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              >
                <div 
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border-2",
                    "shadow-[0_0_15px_rgba(255,255,255,0.05)]",
                    isSelected ? "border-white scale-110 z-10 shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "border-transparent",
                    isToday && !isSelected ? "ring-1 ring-blue-500/50" : "",
                    status === 'success' && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]",
                    status === 'danger' && "bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.3)]",
                    status === 'warning' && "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shadow-[0_0_12px_rgba(234,179,8,0.3)]",
                    status === 'info' && (type === 'fryer' 
                      ? "bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-[0_0_12px_rgba(251,146,60,0.3)]"
                      : "bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                    ),
                    status === 'neutral' && "bg-white/5 text-slate-500 border-white/5"
                  )}
                >
                  {format(day, 'd')}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
