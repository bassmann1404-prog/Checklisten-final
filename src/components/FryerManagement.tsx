import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { startOfDay, endOfDay, isSameDay, format } from 'date-fns';
import { cn } from '../lib/utils';
import { Flame, CheckCircle2, History, Trash2, Droplets, Thermometer, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FryerManagementProps {
  selectedDate: Date;
}

export default function FryerManagement({ selectedDate }: FryerManagementProps) {
  const fryerLogs = useLiveQuery(
    () => db.fryerLogs
      .where('timestamp')
      .between(startOfDay(selectedDate), endOfDay(selectedDate))
      .reverse()
      .toArray(),
    [selectedDate]
  );

  const [value, setValue] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const isToday = isSameDay(selectedDate, new Date());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const now = new Date();
    const timestamp = isToday ? now : startOfDay(selectedDate);

    await db.fryerLogs.add({
      action: 'ölwechsel',
      value: value || 'Öl gewechselt',
      timestamp
    });

    setValue('');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const getActionLabel = (act: string) => {
    switch (act) {
      case 'ölwechsel': return 'Ölwechsel';
      default: return act;
    }
  };

  const getActionIcon = (act: string) => {
    switch (act) {
      case 'ölwechsel': return <Droplets size={18} />;
      default: return <Flame size={18} />;
    }
  };

  const getActionColor = (act: string) => {
    switch (act) {
      case 'ölwechsel': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <div className="flex flex-col gap-6 lg:sticky lg:top-24">
        {!isToday && (
          <div className="text-center text-orange-400 text-[10px] font-black uppercase tracking-[0.2em] bg-orange-500/10 py-3 rounded-xl border border-orange-500/20 mb-2">
            Nachtrag für den {format(selectedDate, 'dd.MM.yyyy')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 glass-card group hover:border-white/20 transition-all">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Aktion</label>
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                <Droplets size={20} />
              </div>
              <span className="text-sm font-black uppercase tracking-widest text-orange-400">Ölwechsel / Wechseln</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">
              Anmerkung (optional)
            </label>
            <input
              type="text"
              placeholder="z.B. Erledigt von..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/50 outline-none transition-all text-white placeholder:text-slate-600"
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full py-5 bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold text-xl rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            Wechsel speichern
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-4">
        <div className="text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest -mb-2">
          {isToday ? 'Heutige Einträge' : `Einträge am ${format(selectedDate, 'dd.MM.yyyy')}`}
        </div>

        {fryerLogs?.map(log => (
          <div key={log.id} className="glass-card flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-xl border flex items-center justify-center",
                getActionColor(log.action)
              )}>
                {getActionIcon(log.action)}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white tracking-tight">{getActionLabel(log.action)}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  {format(log.timestamp, 'HH:mm')} Uhr
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-mono font-bold text-emerald-400">
                {log.value}
              </span>
            </div>
          </div>
        ))}

        {fryerLogs?.length === 0 && (
          <div className="glass-card text-center py-12 text-slate-500 border-dashed">
            Keine Einträge für diesen Tag vorhanden.
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-28 left-4 right-4 bg-emerald-500 text-slate-950 p-4 rounded-2xl flex items-center justify-center gap-3 font-bold shadow-2xl z-50 shadow-emerald-500/40"
          >
            <CheckCircle2 size={24} />
            Eintrag erfolgreich gespeichert!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
