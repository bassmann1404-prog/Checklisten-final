import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { startOfDay, endOfDay, isSameDay, format } from 'date-fns';
import { cn } from '../lib/utils';
import { Check } from 'lucide-react';

type Interval = 'täglich' | 'wöchentlich' | 'monatlich';

interface CleaningPlanProps {
  selectedDate: Date;
}

export default function CleaningPlan({ selectedDate }: CleaningPlanProps) {
  const [activeTab, setActiveTab] = useState<Interval>('täglich');
  
  const tasks = useLiveQuery(
    () => db.cleaningTasks.where('interval').equals(activeTab).toArray(),
    [activeTab]
  );

  const logsForSelectedDay = useLiveQuery(
    () => db.cleaningLogs
      .where('timestamp')
      .between(startOfDay(selectedDate), endOfDay(selectedDate))
      .toArray(),
    [selectedDate]
  );

  const toggleTask = async (taskId: number, currentStatus: boolean) => {
    const now = new Date();
    const isTodaySelected = isSameDay(selectedDate, now);
    const timestamp = isTodaySelected ? now : startOfDay(selectedDate);

    if (currentStatus) {
      const dayLogs = await db.cleaningLogs
        .where('taskId')
        .equals(taskId)
        .and(l => isSameDay(new Date(l.timestamp), selectedDate))
        .toArray();
      
      for (const log of dayLogs) {
        if (log.id) await db.cleaningLogs.delete(log.id);
      }
    } else {
      await db.cleaningLogs.add({
        taskId,
        timestamp,
        completed: true
      });
    }
  };

  const completeAll = async () => {
    if (!tasks) return;
    const now = new Date();
    const isTodaySelected = isSameDay(selectedDate, now);
    const timestamp = isTodaySelected ? now : startOfDay(selectedDate);

    const pendingTasks = tasks.filter(task => !isCompleted(task.id!));
    
    await Promise.all(pendingTasks.map(task => 
      db.cleaningLogs.add({
        taskId: task.id!,
        timestamp,
        completed: true
      })
    ));
  };

  const isCompleted = (taskId: number) => {
    return !!logsForSelectedDay?.some(log => log.taskId === taskId);
  };

  const isToday = isSameDay(selectedDate, new Date());

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs & Bulk Action */}
      <div className="flex flex-col gap-4">
        <div className="flex bg-white/5 border border-white/5 p-1.5 rounded-2xl backdrop-blur-md">
          {(['täglich', 'wöchentlich', 'monatlich'] as Interval[]).map((tab) => (
            <button
              key={tab}
              id={`tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-xl transition-all capitalize tracking-widest",
                activeTab === tab 
                  ? "bg-emerald-500/20 text-emerald-400 shadow-lg border border-emerald-500/20" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {tasks && tasks.length > 0 && tasks.some(t => !isCompleted(t.id!)) && (
          <button
            onClick={completeAll}
            className="w-full py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-widest active:scale-95"
          >
            <Check size={18} strokeWidth={3} />
            Alle abhaken
          </button>
        )}
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {!isToday && (
          <div className="col-span-full text-center text-amber-400/60 text-[10px] font-bold uppercase tracking-widest mb-2">
            Verlaufsansicht: {format(selectedDate, 'dd.MM.yyyy')}
          </div>
        )}
        {tasks?.length === 0 ? (
          <div className="col-span-full glass-card text-center py-16 text-slate-500 font-medium">
            Keine Aufgaben für "{activeTab}" gefunden.
          </div>
        ) : (
          tasks?.map((task) => {
            const completed = isCompleted(task.id!);
            return (
              <button
                key={task.id}
                id={`task-${task.id}`}
                onClick={() => task.id && toggleTask(task.id, completed)}
                className={cn(
                  "glass-card flex items-center justify-between group transition-all hover:border-white/20 text-left",
                  completed && "border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/5",
                  "active:scale-[0.98]"
                )}
              >
                <span className={cn(
                  "text-lg font-bold tracking-tight",
                  completed ? "text-emerald-400/60 line-through" : "text-white"
                )}>
                  {task.name}
                </span>
                
                <div className={cn(
                  "w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all shadow-inner",
                  completed 
                    ? "bg-emerald-500 border-emerald-500 text-white translate-x-1" 
                    : "border-white/10 bg-white/5 group-hover:border-white/30"
                )}>
                  {completed && <Check size={24} strokeWidth={3} />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
