
import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { startOfDay, endOfDay, isSameDay } from 'date-fns';
import { NotificationService } from '../services/notificationService';

export default function NotificationManager() {
  const devices = useLiveQuery(() => db.devices.toArray());
  const cleaningTasks = useLiveQuery(() => db.cleaningTasks.where('interval').equals('täglich').toArray());
  
  const todayMeasurements = useLiveQuery(
    () => db.tempMeasurements
      .where('timestamp')
      .between(startOfDay(new Date()), endOfDay(new Date()))
      .toArray()
  );

  const todayCleaningLogs = useLiveQuery(
    () => db.cleaningLogs
      .where('timestamp')
      .between(startOfDay(new Date()), endOfDay(new Date()))
      .toArray()
  );

  useEffect(() => {
    const checkReminders = () => {
      const isEnabled = localStorage.getItem('notifications_enabled') === 'true';
      if (!isEnabled || NotificationService.permission !== 'granted') return;

      const lastChecked = localStorage.getItem('last_notification_sent');
      const now = new Date();
      
      // Only notify once every 4 hours maximum to avoid spamming
      if (lastChecked && (now.getTime() - parseInt(lastChecked)) < 4 * 60 * 60 * 1000) {
        return;
      }

      let message = '';

      // Check temperatures
      if (devices && todayMeasurements) {
        const missingDevices = devices.filter(d => 
          !todayMeasurements.some(m => m.deviceId === d.id)
        );
        if (missingDevices.length > 0) {
          message += `Temperaturkontrolle fehlt für: ${missingDevices.map(d => d.name).join(', ')}. `;
        }
      }

      // Check cleaning tasks
      if (cleaningTasks && todayCleaningLogs) {
        const missingTasksValue = cleaningTasks.filter(t => 
          !todayCleaningLogs.some(log => log.taskId === t.id)
        );
        if (missingTasksValue.length > 0) {
          message += `Reinigung ausstehend: ${missingTasksValue.length} Aufgaben.`;
        }
      }

      if (message) {
        NotificationService.sendNotification('Gastroland Checklisten Reminder', {
          body: message,
          tag: 'haccp-reminder'
        });
        localStorage.setItem('last_notification_sent', now.getTime().toString());
      }
    };

    // Check on mount and then every hour
    const timer = setInterval(checkReminders, 60 * 60 * 1000);
    
    // Also check on mount if we haven't checked in a while
    const timeout = setTimeout(checkReminders, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [devices, cleaningTasks, todayMeasurements, todayCleaningLogs]);

  return null;
}
