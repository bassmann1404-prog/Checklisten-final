/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Thermometer, 
  ClipboardCheck, 
  Truck, 
  Settings as SettingsIcon,
  Calendar as CalendarIcon,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import TemperatureControl from './components/TemperatureControl';
import CleaningPlan from './components/CleaningPlan';
import GoodsReceipt from './components/GoodsReceipt';
import FryerManagement from './components/FryerManagement';
import Settings from './components/Settings';
import NotificationManager from './components/NotificationManager';
import CalendarDropdown from './components/CalendarDropdown';
import BottomNav from './components/BottomNav';
import { cn } from './lib/utils';

export type Screen = 'dashboard' | 'temperature' | 'cleaning' | 'goods' | 'fryer' | 'settings';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const getTitle = () => {
    switch (currentScreen) {
      case 'dashboard': return 'Gastroland Checklisten';
      case 'temperature': return 'Temperaturkontrolle';
      case 'cleaning': return 'Reinigungsplan';
      case 'goods': return 'Wareneingang';
      case 'fryer': return 'Fritteusen-Check';
      case 'settings': return 'Einstellungen';
    }
  };

  const showCalendar = currentScreen === 'temperature' || currentScreen === 'cleaning' || currentScreen === 'goods' || currentScreen === 'fryer';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 overflow-x-hidden relative">
      <NotificationManager />
      {/* Background Ambient Glows */}
      <div className="ambient-glow-blue" />
      <div className="ambient-glow-emerald" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 glass-header z-50">
        <div className="flex items-center gap-3">
          {currentScreen !== 'dashboard' && (
            <button 
              id="back-button"
              onClick={() => setCurrentScreen('dashboard')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <div className="flex items-center gap-3">
            {currentScreen === 'dashboard' && (
              <div className="w-9 h-9 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-xl flex items-center justify-center shadow-xl backdrop-blur-sm group">
                <svg 
                  viewBox="0 0 24 24" 
                  className="w-5 h-5 text-white transition-transform group-hover:scale-110 duration-500"
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M15.5 5.5C15.5 4.11929 16.6193 3 18 3C19.3807 3 20.5 4.11929 20.5 5.5C20.5 6.88071 19.3807 8 18 8C16.8954 8 15.5 9 15.5 11M15.5 11V15C15.5 17.7614 13.2614 20 10.5 20H6C4.34315 20 3 18.6569 3 17C3 15.8954 3.89543 15 5 15C5.5 15 6 15 6.5 15" />
                  <path d="M10.5 11C11.5 11 13 11 14 12" />
                  <circle cx="18" cy="5.5" r="0.5" fill="currentColor" stroke="none" />
                </svg>
              </div>
            )}
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              {getTitle()}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showCalendar && (
            <div className="relative">
              <button 
                id="calendar-button"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className={cn(
                  "p-2 rounded-full transition-all relative",
                  isCalendarOpen ? "bg-blue-500/20 text-blue-400" : "text-slate-400 hover:bg-white/10 hover:text-white"
                )}
              >
                <CalendarIcon size={24} />
                {isCalendarOpen && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full" />
                )}
              </button>
            </div>
          )}
          {currentScreen === 'dashboard' && (
            <button 
              id="settings-button"
              onClick={() => setCurrentScreen('settings')}
              className="p-2 text-slate-400 hover:bg-white/10 hover:text-white rounded-full transition-colors"
            >
              <SettingsIcon size={24} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-32 px-4 max-w-[1600px] mx-auto w-full">
        <AnimatePresence>
          {isCalendarOpen && showCalendar && (
            <CalendarDropdown 
              type={currentScreen as 'temperature' | 'cleaning' | 'goods' | 'fryer'} 
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setIsCalendarOpen(false);
              }}
              onClose={() => setIsCalendarOpen(false)} 
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentScreen === 'dashboard' && <Dashboard onNavigate={setCurrentScreen} />}
            {currentScreen === 'temperature' && <TemperatureControl selectedDate={selectedDate} />}
            {currentScreen === 'cleaning' && <CleaningPlan selectedDate={selectedDate} />}
            {currentScreen === 'goods' && <GoodsReceipt selectedDate={selectedDate} />}
            {currentScreen === 'fryer' && <FryerManagement selectedDate={selectedDate} />}
            {currentScreen === 'settings' && <Settings onBack={() => setCurrentScreen('dashboard')} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav currentScreen={currentScreen} onNavigate={setCurrentScreen} />
    </div>
  );
}
