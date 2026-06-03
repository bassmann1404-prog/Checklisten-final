import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Minus, CheckCircle2, History, Pencil, Save, X } from 'lucide-react';
import { db } from '../db/db';
import { startOfDay, subDays, endOfDay, isSameDay, format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface TemperatureControlProps {
  selectedDate: Date;
}

export default function TemperatureControl({ selectedDate }: TemperatureControlProps) {
  const devices = useLiveQuery(() => db.devices.toArray());
  const measurementsForDay = useLiveQuery(
    () => db.tempMeasurements
      .where('timestamp')
      .between(startOfDay(selectedDate), endOfDay(selectedDate))
      .reverse()
      .toArray(),
    [selectedDate]
  );

  const [temps, setTemps] = useState<{ [deviceId: number]: number }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTemp, setEditTemp] = useState<number>(0);

  useEffect(() => {
    async function loadTemps() {
      if (!devices) return;
      
      const newTemps: { [deviceId: number]: number } = {};
      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);

      for (const device of devices) {
        if (!device.id) continue;
        
        // 1. Check if there's already a measurement on the selected day
        const existingOnDay = await db.tempMeasurements
          .where('deviceId')
          .equals(device.id)
          .filter(m => m.timestamp >= dayStart && m.timestamp <= dayEnd)
          .reverse()
          .first();

        if (existingOnDay) {
          newTemps[device.id] = existingOnDay.temperature;
        } else {
          // 2. No measurement today? Find the ABSOLUTE last one ever recorded for this device
          const absoluteLast = await db.tempMeasurements
            .where('deviceId')
            .equals(device.id)
            .reverse()
            .first();
          
          if (absoluteLast) {
            newTemps[device.id] = absoluteLast.temperature;
          } else {
            // 3. Fallback to middle of range
            newTemps[device.id] = (device.minTemp + device.maxTemp) / 2;
          }
        }
      }
      setTemps(newTemps);
    }

    loadTemps();
  }, [devices, selectedDate]);

  const updateTempState = (deviceId: number, delta: number) => {
    const current = temps[deviceId] || 0;
    const next = Math.round((current + delta) * 10) / 10;
    setTemps(prev => ({ ...prev, [deviceId]: next }));
  };

  const handleSave = async (deviceId: number) => {
    const temp = temps[deviceId];
    if (temp === undefined) return;

    const now = new Date();
    const timestamp = isSameDay(selectedDate, now) ? now : startOfDay(selectedDate);

    await db.tempMeasurements.add({
      deviceId,
      temperature: temp,
      timestamp
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSaveAll = async () => {
    if (!devices || devices.length === 0) return;
    
    const now = new Date();
    const timestamp = isSameDay(selectedDate, now) ? now : startOfDay(selectedDate);

    const measurements = devices.map(device => ({
      deviceId: device.id!,
      temperature: temps[device.id!] ?? (device.minTemp + device.maxTemp) / 2,
      timestamp
    }));

    // Using bulkAdd to save all
    await db.tempMeasurements.bulkAdd(measurements);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const startEditing = (m: any) => {
    setEditingId(m.id!);
    setEditTemp(m.temperature);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEdit = async (m: any) => {
    await db.tempMeasurements.update(m.id!, { temperature: editTemp });
    setEditingId(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const isToday = isSameDay(selectedDate, new Date());

  if (!devices || devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-center">
        <p>Keine Geräte gefunden.</p>
        <p className="text-sm">Bitte füge Geräte in den Einstellungen hinzu.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        {!isToday && (
          <div className="text-center text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] bg-blue-500/10 py-3 rounded-xl border border-blue-500/20 mb-2">
            Nachtrag für den {format(selectedDate, 'dd.MM.yyyy')}
          </div>
        )}

        <button
          onClick={handleSaveAll}
          className="w-full py-5 bg-blue-500 hover:bg-blue-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest mb-2"
        >
          <CheckCircle2 size={24} strokeWidth={3} />
          Alles speichern
        </button>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
          {devices.map((device) => (
            <div 
              key={device.id} 
              className="glass-card flex flex-col gap-4 group hover:border-white/20 transition-all !p-4"
            >
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white truncate">{device.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Soll: {device.minTemp}° - {device.maxTemp}°
                </span>
              </div>
              
              <div className="flex items-center justify-between gap-1">
                <button 
                  onClick={() => device.id && updateTempState(device.id, -0.5)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-colors active:scale-90 text-slate-400 hover:text-white"
                >
                  <Minus size={16} />
                </button>
                
                <div className="text-center min-w-[50px]">
                  <span className={cn(
                    "text-xl font-mono font-bold",
                    (temps[device.id!] < device.minTemp || temps[device.id!] > device.maxTemp) 
                      ? "text-red-400" 
                      : "text-blue-400"
                  )}>
                    {temps[device.id!]?.toFixed(1) ?? '--.-'}
                  </span>
                </div>

                <button 
                  onClick={() => device.id && updateTempState(device.id, 0.5)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-colors active:scale-90 text-slate-400 hover:text-white"
                >
                  <Plus size={16} />
                </button>
              </div>

              <button
                onClick={() => device.id && handleSave(device.id)}
                className="w-full py-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all border border-blue-500/20"
              >
                Speichern
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* History section for consistency */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="col-span-full text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest -mb-2">
          {isToday ? 'Heutige Messungen' : `Messungen am ${format(selectedDate, 'dd.MM.yyyy')}`}
        </div>

        {measurementsForDay?.map(m => {
          const device = devices?.find(d => d.id === m.deviceId);
          const isEditing = editingId === m.id;

          return (
            <div key={m.id} className={cn(
              "glass-card flex flex-col gap-4 group transition-all",
              isEditing && "ring-2 ring-blue-500/50 border-blue-500/30"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl border flex items-center justify-center bg-blue-500/10 border-blue-500/20 text-blue-400"
                  )}>
                    <History size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white tracking-tight">{device?.name || 'Unbekanntes Gerät'}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      {format(m.timestamp, 'HH:mm')} Uhr
                    </span>
                  </div>
                </div>
                {!isEditing && (
                  <button 
                    onClick={() => startEditing(m)}
                    className="p-2 text-slate-500 hover:text-white transition-colors"
                  >
                    <Pencil size={18} />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <button 
                      onClick={() => setEditTemp(prev => Math.round((prev - 0.5) * 10) / 10)}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-all"
                    >
                      <Minus size={16} />
                    </button>
                    <div className="flex-1 text-center">
                      <span className={cn(
                        "text-xl font-mono font-bold",
                        (editTemp < (device?.minTemp ?? 0) || editTemp > (device?.maxTemp ?? 0)) ? "text-red-400" : "text-blue-400"
                      )}>
                        {editTemp.toFixed(1)}°C
                      </span>
                    </div>
                    <button 
                      onClick={() => setEditTemp(prev => Math.round((prev + 0.5) * 10) / 10)}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEditing}
                      className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-wider border border-white/5 transition-all flex items-center justify-center gap-2"
                    >
                      <X size={14} />
                      Abbrechen
                    </button>
                    <button
                      onClick={() => saveEdit(m)}
                      className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={14} />
                      Speichern
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <span className={cn(
                    "font-mono font-bold text-xl",
                    (m.temperature < (device?.minTemp ?? 0) || m.temperature > (device?.maxTemp ?? 0)) ? "text-red-400" : "text-blue-400"
                  )}>
                    {m.temperature.toFixed(1)}°C
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {measurementsForDay?.length === 0 && (
          <div className="col-span-full glass-card text-center py-12 text-slate-500 border-dashed">
            Keine Messungen für diesen Tag vorhanden.
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
            Messung erfolgreich gespeichert!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
