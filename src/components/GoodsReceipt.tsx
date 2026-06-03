import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { startOfDay, endOfDay, isSameDay, format } from 'date-fns';
import { cn } from '../lib/utils';
import { CheckCircle2, Plus, Minus, Trash2, Pencil, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GoodsReceiptProps {
  selectedDate: Date;
}

export default function GoodsReceipt({ selectedDate }: GoodsReceiptProps) {
  const suppliers = useLiveQuery(() => db.suppliers.toArray());
  
  const deliveriesForSelectedDay = useLiveQuery(
    () => db.deliveries
      .where('timestamp')
      .between(startOfDay(selectedDate), endOfDay(selectedDate))
      .reverse()
      .toArray(),
    [selectedDate]
  );
  
  const [supplierName, setSupplierName] = useState('');
  const [items, setItems] = useState([
    { productName: '', deliveryNote: '', temperature: '4.0', isOk: true }
  ]);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>(null);

  const startEditing = (delivery: any) => {
    setEditingId(delivery.id!);
    setEditData({ ...delivery });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData(null);
  };

  const saveEdit = async () => {
    if (!editData) return;
    await db.deliveries.update(editingId!, {
      productName: editData.productName,
      supplierName: editData.supplierName,
      temperature: editData.temperature,
      isOk: editData.isOk,
      deliveryNote: editData.deliveryNote
    });
    setEditingId(null);
    setEditData(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const addItem = () => {
    setItems([...items, { productName: '', deliveryNote: '', temperature: '4.0', isOk: true }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supplierName || items.some(item => !item.productName)) return;

    // Use current time if today is selected, otherwise start of the selected day
    const now = new Date();
    const isToday = isSameDay(selectedDate, now);
    const timestamp = isToday ? now : startOfDay(selectedDate);

    await Promise.all(items.map(item => 
      db.deliveries.add({
        supplierName,
        productName: item.productName,
        deliveryNote: item.deliveryNote,
        temperature: parseFloat(item.temperature) || 0,
        isOk: item.isOk,
        timestamp
      })
    ));

    setSupplierName('');
    setItems([{ productName: '', deliveryNote: '', temperature: '', isOk: true }]);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const isToday = isSameDay(selectedDate, new Date());

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        {!isToday && (
          <div className="text-center text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] bg-amber-500/10 py-3 rounded-xl border border-amber-500/20 mb-2">
            Nachtrag für den {format(selectedDate, 'dd.MM.yyyy')}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 glass-card group hover:border-white/20 transition-all">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Lieferant</label>
              <select
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500/50 outline-none transition-all appearance-none text-white font-medium"
                required
              >
                <option value="" className="bg-slate-900">Wähle einen Lieferanten...</option>
                {suppliers?.map(s => (
                  <option key={s.id} value={s.name} className="bg-slate-900">{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((item, index) => (
              <div key={index} className="flex flex-col gap-5 glass-card border-white/5 relative group/item">
                {items.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => removeItem(index)}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full flex items-center justify-center hover:bg-red-500/40 transition-all z-10"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Produkt</label>
                  <input
                    type="text"
                    placeholder="z.B. Frischfleisch, Milch..."
                    value={item.productName}
                    onChange={(e) => updateItem(index, 'productName', e.target.value)}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500/50 outline-none transition-all text-white placeholder:text-slate-600"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Lieferschein-Nummer oder MHD</label>
                  <input
                    type="text"
                    placeholder="Nummer oder Datum eingeben"
                    value={item.deliveryNote}
                    onChange={(e) => updateItem(index, 'deliveryNote', e.target.value)}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500/50 outline-none transition-all text-white placeholder:text-slate-600"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Temperatur (°C)</label>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => {
                        const current = parseFloat(item.temperature) || 0;
                        updateItem(index, 'temperature', (current - 1).toString());
                      }}
                      className="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors active:scale-90 text-slate-400 hover:text-white"
                    >
                      <Minus size={20} />
                    </button>
                    
                    <div className="flex-1 text-center py-3 bg-white/5 border border-white/10 rounded-xl">
                      <span className="text-2xl font-mono font-bold text-amber-400">
                        {Math.round(parseFloat(item.temperature) || 0)}
                      </span>
                      <span className="text-[10px] block text-slate-500 font-bold uppercase tracking-widest">Celsius</span>
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        const current = parseFloat(item.temperature) || 0;
                        updateItem(index, 'temperature', (current + 1).toString());
                      }}
                      className="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors active:scale-90 text-slate-400 hover:text-white"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-1 ml-1 group/check">
                  <div 
                    onClick={() => updateItem(index, 'isOk', !item.isOk)}
                    className={cn(
                      "w-5 h-5 rounded-md border text-slate-900 flex items-center justify-center transition-all cursor-pointer",
                      item.isOk ? "bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-white/5 border-white/20"
                    )}
                  >
                    {item.isOk && <CheckCircle2 size={14} strokeWidth={3} />}
                  </div>
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer",
                    item.isOk ? "text-emerald-400" : "text-slate-500"
                  )} onClick={() => updateItem(index, 'isOk', !item.isOk)}>
                    Ware ok
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 border-dashed rounded-2xl flex items-center justify-center gap-2 transition-all font-bold text-sm"
          >
            <Plus size={18} strokeWidth={3} />
            Weiteres Produkt hinzufügen
          </button>

          <button
            type="submit"
            id="submit-delivery"
            className="mt-4 w-full py-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xl rounded-2xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            Lieferung erfassen
          </button>
        </form>
      </div>

      {/* Deliveries List for that day */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isToday ? (
           <div className="col-span-full text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest -mb-2">
             Heutige Lieferungen
           </div>
        ) : (
          <div className="col-span-full text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest -mb-2">
            Lieferungen am {format(selectedDate, 'dd.MM.yyyy')}
          </div>
        )}
        {deliveriesForSelectedDay?.map(delivery => {
          const isEditing = editingId === delivery.id;

          return (
            <div key={delivery.id} className={cn(
              "glass-card flex flex-col gap-4 group transition-all",
              isEditing && "ring-2 ring-amber-500/50 border-amber-500/30"
            )}>
              <div className="flex justify-between items-start">
                {isEditing ? (
                  <div className="flex flex-col gap-3 w-full">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Produkt</label>
                      <input 
                        className="bg-white/5 border border-white/10 p-2 rounded-lg text-sm text-white"
                        value={editData.productName}
                        onChange={e => setEditData({ ...editData, productName: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Lieferant</label>
                      <select 
                        className="bg-white/5 border border-white/10 p-2 rounded-lg text-sm text-white"
                        value={editData.supplierName}
                        onChange={e => setEditData({ ...editData, supplierName: e.target.value })}
                      >
                        {suppliers?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Temperatur (°C)</label>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setEditData({ ...editData, temperature: Math.round((editData.temperature - 0.5)*10)/10 })}
                          className="p-1.5 bg-white/5 rounded-md"
                        ><Minus size={14}/></button>
                        <span className="text-sm font-mono font-bold text-amber-400">{editData.temperature.toFixed(1)}</span>
                        <button 
                          onClick={() => setEditData({ ...editData, temperature: Math.round((editData.temperature + 0.5)*10)/10 })}
                          className="p-1.5 bg-white/5 rounded-md"
                        ><Plus size={14}/></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        onClick={() => setEditData({ ...editData, isOk: !editData.isOk })}
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center cursor-pointer",
                          editData.isOk ? "bg-emerald-500 border-emerald-500" : "bg-white/5 border-white/20"
                        )}
                      >
                        {editData.isOk && <CheckCircle2 size={10} />}
                      </div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Ware ok</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={cancelEditing}
                        className="flex-1 py-2 bg-white/5 text-slate-400 rounded-lg text-[10px] font-bold uppercase"
                      >Abbrechen</button>
                      <button 
                        onClick={saveEdit}
                        className="flex-1 py-2 bg-amber-500 text-slate-950 rounded-lg text-[10px] font-bold uppercase"
                      >Sichern</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-white tracking-tight">{delivery.productName}</span>
                      <span className="text-xs text-slate-500">{delivery.supplierName}</span>
                      {delivery.deliveryNote && (
                        <span className="text-[10px] text-slate-600 mt-1">Note: {delivery.deliveryNote}</span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={cn(
                        "font-mono font-bold text-xl",
                        delivery.isOk ? "text-amber-400" : "text-red-400"
                      )}>{delivery.temperature.toFixed(1)}°C</span>
                      <button 
                        onClick={() => startEditing(delivery)}
                        className="p-1 text-slate-600 hover:text-white transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {deliveriesForSelectedDay?.length === 0 && !isToday && (
          <div className="col-span-full glass-card text-center py-12 text-slate-500">
            An diesem Tag wurden keine Lieferungen erfasst.
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 p-4 rounded-xl shadow-lg backdrop-blur-md"
          >
            <CheckCircle2 />
            <span className="font-semibold">Lieferung erfolgreich gespeichert!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
