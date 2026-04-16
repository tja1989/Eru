import { create } from 'zustand';
import { notificationService } from '../services/notificationService';

interface NotificationState {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  refreshUnread: async () => {
    try {
      const result = await notificationService.getNotifications(1);
      set({ unreadCount: result.unreadCount });
    } catch {}
  },
}));
