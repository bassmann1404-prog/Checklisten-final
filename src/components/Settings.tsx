import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Trash2, Plus, FileDown, ChevronRight, ChevronDown, Bell, BellOff, Calendar, FileText, Table } from 'lucide-react';
import { cn } from '../lib/utils';
import { NotificationService } from '../services/notificationService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const devices = useLiveQuery(() => db.devices.toArray());
  const tasks = useLiveQuery(() => db.cleaningTasks.toArray());
  const suppliers = useLiveQuery(() => db.suppliers.toArray());

  // Form states
  const [newDevice, setNewDevice] = useState({ name: '', min: '', max: '' });
  const [newTask, setNewTask] = useState({ name: '', interval: 'täglich' as any });
  const [newSupplier, setNewSupplier] = useState('');

  // Export states
  const [exportRange, setExportRange] = useState({
    start: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [exportFormat, setExportFormat] = useState<'pdf' | 'xlsx'>('pdf');

  const addDevice = async () => {
    if (!newDevice.name) return;
    await db.devices.add({
      name: newDevice.name,
      minTemp: parseFloat(newDevice.min) || 0,
      maxTemp: parseFloat(newDevice.max) || 0
    });
    setNewDevice({ name: '', min: '', max: '' });
  };

  const addTask = async () => {
    if (!newTask.name) return;
    await db.cleaningTasks.add({
      name: newTask.name,
      interval: newTask.interval
    });
    setNewTask({ name: '', interval: 'täglich' });
  };

  const addSupplier = async () => {
    if (!newSupplier) return;
    await db.suppliers.add({ name: newSupplier });
    setNewSupplier('');
  };

  const handleExport = () => {
    if (exportFormat === 'pdf') {
      exportPDF();
    } else {
      exportExcel();
    }
  };

  const saveFileWithPicker = async (blob: Blob, suggestedName: string, format: 'pdf' | 'xlsx') => {
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: [{
            description: format === 'pdf' ? 'PDF Dokument' : 'Excel Tabelle',
            accept: format === 'pdf' 
              ? { 'application/pdf': ['.pdf'] } 
              : { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('File System Access API failed, falling back to download', err);
      }
    }

    // Fallback: Standard Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFilteredData = async () => {
    const start = startOfDay(new Date(exportRange.start));
    const end = endOfDay(new Date(exportRange.end));

    const allTemps = await db.tempMeasurements.toArray();
    const allCleaning = await db.cleaningLogs.toArray();
    const allDeliveries = await db.deliveries.toArray();
    
    const devicesList = await db.devices.toArray();
    const cleaningTasks = await db.cleaningTasks.toArray();

    const filteredTemps = allTemps.filter(m => 
      isWithinInterval(new Date(m.timestamp), { start, end })
    );

    const filteredCleaning = allCleaning.filter(l => 
      isWithinInterval(new Date(l.timestamp), { start, end })
    );

    const filteredDeliveries = allDeliveries.filter(d => 
      isWithinInterval(new Date(d.timestamp), { start, end })
    );

    return {
      temps: filteredTemps,
      cleaning: filteredCleaning,
      deliveries: filteredDeliveries,
      devices: devicesList,
      tasks: cleaningTasks
    };
  };

  const exportPDF = async () => {
    const data = await getFilteredData();
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = format(now, 'dd.MM.yyyy HH:mm');

    doc.setFontSize(20);
    doc.text('HACCP-Bericht - Gastroland Checklisten', 14, 22);
    doc.setFontSize(10);
    doc.text(`Zeitraum: ${format(new Date(exportRange.start), 'dd.MM.yyyy')} - ${format(new Date(exportRange.end), 'dd.MM.yyyy')}`, 14, 30);
    doc.text(`Erstellt am: ${dateStr}`, 14, 35);

    // Section 1: Temperature
    doc.setFontSize(14);
    doc.text('1. Temperaturkontrollen', 14, 50);
    const tempRows = data.temps.map(m => {
      const device = data.devices.find(d => d.id === m.deviceId);
      return [
        format(new Date(m.timestamp), 'dd.MM.yyyy HH:mm'),
        device?.name || 'Unbekannt',
        `${m.temperature.toFixed(1)}°C`
      ];
    });
    autoTable(doc, {
      startY: 55,
      head: [['Zeitpunkt', 'Gerät', 'Temperatur']],
      body: tempRows,
    });

    // Section 2: Cleaning
    doc.addPage();
    doc.setFontSize(14);
    doc.text('2. Reinigungsprotokoll', 14, 20);
    const cleaningRows = data.cleaning.map(l => {
      const task = data.tasks.find(t => t.id === l.taskId);
      return [
        format(new Date(l.timestamp), 'dd.MM.yyyy HH:mm'),
        task?.name || 'Unbekannt',
        task?.interval || '-',
        'Erledigt'
      ];
    });
    autoTable(doc, {
      startY: 25,
      head: [['Zeitpunkt', 'Aufgabe', 'Intervall', 'Status']],
      body: cleaningRows,
    });

    // Section 3: Deliveries
    doc.addPage();
    doc.setFontSize(14);
    doc.text('3. Wareneingang', 14, 20);
    const deliveryRows = data.deliveries.map(d => [
      format(new Date(d.timestamp), 'dd.MM.yyyy HH:mm'),
      d.supplierName,
      d.productName,
      d.deliveryNote || '-',
      `${d.temperature.toFixed(1)}°C`,
      d.isOk ? 'OK' : 'Mangelhaft'
    ]);
    autoTable(doc, {
      startY: 25,
      head: [['Zeitpunkt', 'Lieferant', 'Produkt', 'Details', 'Temp', 'Zustand']],
      body: deliveryRows,
    });

    const blob = doc.output('blob');
    await saveFileWithPicker(
      blob, 
      `HACCP_Bericht_${exportRange.start}_bis_${exportRange.end}.pdf`, 
      'pdf'
    );
  };

  const exportExcel = async () => {
    const data = await getFilteredData();
    const wb = XLSX.utils.book_new();

    // Temperature Sheet
    const tempWS = XLSX.utils.json_to_sheet(data.temps.map(m => {
      const device = data.devices.find(d => d.id === m.deviceId);
      return {
        Zeitpunkt: format(new Date(m.timestamp), 'dd.MM.yyyy HH:mm'),
        Gerät: device?.name || 'Unbekannt',
        Temperatur: m.temperature
      };
    }));
    XLSX.utils.book_append_sheet(wb, tempWS, 'Temperaturen');

    // Cleaning Sheet
    const cleaningWS = XLSX.utils.json_to_sheet(data.cleaning.map(l => {
      const task = data.tasks.find(t => t.id === l.taskId);
      return {
        Zeitpunkt: format(new Date(l.timestamp), 'dd.MM.yyyy HH:mm'),
        Aufgabe: task?.name || 'Unbekannt',
        Intervall: task?.interval || '-',
        Status: 'Erledigt'
      };
    }));
    XLSX.utils.book_append_sheet(wb, cleaningWS, 'Reinigung');

    // Delivery Sheet
    const deliveryWS = XLSX.utils.json_to_sheet(data.deliveries.map(d => ({
      Zeitpunkt: format(new Date(d.timestamp), 'dd.MM.yyyy HH:mm'),
      Lieferant: d.supplierName,
      Produkt: d.productName,
      Lieferschein: d.deliveryNote || '-',
      Temperatur: d.temperature,
      Zustand: d.isOk ? 'OK' : 'Mangelhaft'
    })));
    XLSX.utils.book_append_sheet(wb, deliveryWS, 'Wareneingang');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    await saveFileWithPicker(
      blob, 
      `HACCP_Bericht_${exportRange.start}_bis_${exportRange.end}.xlsx`, 
      'xlsx'
    );
  };

  // Notification state
  const [notificationsEnabled, setNotificationsEnabled] = useState(localStorage.getItem('notifications_enabled') === 'true');

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await NotificationService.requestPermission();
      if (granted) {
        localStorage.setItem('notifications_enabled', 'true');
        setNotificationsEnabled(true);
        NotificationService.sendNotification('Benachrichtigungen aktiviert!', {
          body: 'Du wirst nun an ausstehende Aufgaben erinnert.'
        });
      } else {
        alert('Bitte aktiviere Benachrichtigungen in deinen Browsereinstellungen.');
      }
    } else {
      localStorage.setItem('notifications_enabled', 'false');
      setNotificationsEnabled(false);
    }
  };

  return (
    <div className="flex flex-col gap-10 pb-20">
      {/* Notifications Section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 text-center">Erinnerungen</h2>
        <button 
          onClick={toggleNotifications}
          className={cn(
            "glass-card flex items-center justify-between group transition-all active:scale-[0.98]",
            notificationsEnabled ? "border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/5 text-emerald-400" : "hover:border-white/20 text-slate-300"
          )}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
              notificationsEnabled ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] text-slate-950 rotate-[-12deg]" : "bg-white/5 text-slate-500"
            )}>
              {notificationsEnabled ? <Bell size={20} className="animate-pulse" /> : <BellOff size={20} />}
            </div>
            <div className="flex flex-col items-start translate-y-[-1px]">
              <span className="font-bold tracking-tight">Push-Reminders</span>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-0.5">
                {notificationsEnabled ? 'Aktiviert' : 'Deaktiviert'}
              </span>
            </div>
          </div>
          <div className={cn(
            "w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
            notificationsEnabled ? "bg-emerald-500" : "bg-white/10 shadow-inner"
          )}>
            <div className={cn(
              "w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm",
              notificationsEnabled ? "translate-x-6" : "translate-x-0"
            )} />
          </div>
        </button>
        <p className="px-3 text-[11px] text-slate-500 leading-relaxed text-center italic">
          Wir erinnern dich an ausstehende Temperaturkontrollen & Reinigungen.
        </p>
      </section>

      {/* Devices Section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Geräte verwalten</h2>
        <div className="glass-card flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <input 
              placeholder="Gerätename" 
              value={newDevice.name} 
              onChange={e => setNewDevice(p => ({ ...p, name: e.target.value }))}
              className="col-span-2 p-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
            />
            <input 
              type="number" 
              placeholder="Min °C" 
              value={newDevice.min} 
              onChange={e => setNewDevice(p => ({ ...p, min: e.target.value }))}
              className="p-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
            />
            <input 
              type="number" 
              placeholder="Max °C" 
              value={newDevice.max} 
              onChange={e => setNewDevice(p => ({ ...p, max: e.target.value }))}
              className="p-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
            />
          </div>
          <button onClick={addDevice} className="w-full py-4 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95">
            <Plus size={20} strokeWidth={3} /> Gerät hinzufügen
          </button>
          
          <div className="mt-4 flex flex-col gap-2">
            {devices?.map(d => (
              <div key={d.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-all">
                <span className="font-bold text-white tracking-tight">{d.name} <span className="text-slate-500 font-mono text-sm ml-2">({d.minTemp}/{d.maxTemp}°C)</span></span>
                <button onClick={() => d.id && db.devices.delete(d.id)} className="text-red-400/50 hover:text-red-400 p-2 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cleaning Tasks Section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Reinigungsaufgaben</h2>
        <div className="glass-card flex flex-col gap-4">
          <input 
            placeholder="Aufgabenname" 
            value={newTask.name} 
            onChange={e => setNewTask(p => ({ ...p, name: e.target.value }))}
            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
          />
          <div className="flex gap-2">
            {['täglich', 'wöchentlich', 'monatlich'].map(iv => (
              <button 
                key={iv}
                onClick={() => setNewTask(p => ({ ...p, interval: iv }))}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-xl border transition-all capitalize tracking-widest",
                  newTask.interval === iv 
                    ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/50 shadow-lg" 
                    : "bg-white/5 text-slate-500 border-white/5 hover:text-slate-300"
                )}
              >
                {iv}
              </button>
            ))}
          </div>
          <button onClick={addTask} className="w-full py-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95">
            <Plus size={20} strokeWidth={3} /> Aufgabe hinzufügen
          </button>

          <div className="mt-4 flex flex-col gap-2">
            {tasks?.map(t => (
              <div key={t.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-all">
                <div className="flex flex-col">
                  <span className="font-bold text-white tracking-tight">{t.name}</span>
                  <span className="text-[10px] uppercase font-bold text-emerald-400/50 tracking-widest mt-0.5">{t.interval}</span>
                </div>
                <button onClick={() => t.id && db.cleaningTasks.delete(t.id)} className="text-red-400/50 hover:text-red-400 p-2 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Suppliers Section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Lieferanten verwalten</h2>
        <div className="glass-card flex flex-col gap-4">
          <div className="flex gap-2">
            <input 
              placeholder="Lieferant Name" 
              value={newSupplier} 
              onChange={e => setNewSupplier(e.target.value)}
              className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white focus:ring-2 focus:ring-amber-500/50 transition-all font-medium"
            />
            <button onClick={addSupplier} className="p-4 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-xl hover:bg-amber-600/30 transition-all active:scale-90">
              <Plus size={24} strokeWidth={3} />
            </button>
          </div>
          
          <div className="mt-4 flex flex-col gap-2">
            {suppliers?.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-all">
                <span className="font-bold text-white tracking-tight">{s.name}</span>
                <button onClick={() => s.id && db.suppliers.delete(s.id)} className="text-red-400/50 hover:text-red-400 p-2 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Export Section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">HACCP Export</h2>
        <div className="glass-card flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Von</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="date"
                  value={exportRange.start}
                  onChange={e => setExportRange(p => ({ ...p, start: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Bis</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="date"
                  value={exportRange.end}
                  onChange={e => setExportRange(p => ({ ...p, end: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {[
              { id: 'pdf' as const, label: 'PDF Report', icon: FileText, color: 'text-red-400' },
              { id: 'xlsx' as const, label: 'Excel Liste', icon: Table, color: 'text-emerald-400' }
            ].map(format => (
              <button
                key={format.id}
                onClick={() => setExportFormat(format.id)}
                className={cn(
                  "flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2 group",
                  exportFormat === format.id 
                    ? "bg-white/10 border-white/20 shadow-lg" 
                    : "bg-white/5 border-white/5 hover:border-white/10"
                )}
              >
                <format.icon size={24} className={cn(
                  "transition-transform group-hover:scale-110",
                  exportFormat === format.id ? format.color : "text-slate-500"
                )} />
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  exportFormat === format.id ? "text-white" : "text-slate-500"
                )}>
                  {format.label}
                </span>
              </button>
            ))}
          </div>

          <button 
            onClick={handleExport}
            className={cn(
              "w-full py-5 text-white font-black text-lg rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.1em]",
              exportFormat === 'pdf' 
                ? "bg-slate-900 border border-white/10 hover:bg-slate-800 shadow-slate-900/40" 
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
            )}
          >
            <FileDown size={24} strokeWidth={3} />
            Bericht generieren
          </button>
        </div>
      </section>
    </div>
  );
}
