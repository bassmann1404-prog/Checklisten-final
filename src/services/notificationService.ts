
export class NotificationService {
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications.');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  static async sendNotification(title: string, options?: NotificationOptions) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/logo.png', // Fallback
        badge: '/logo.png',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }

  static get permission() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }
}
