import { create } from 'zustand';
import { notificationService, Notification } from '../services/notificationService';

type State = {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
  page: number;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAllRead: () => Promise<void>;
};

export const useNotificationStore = create<State>((set, get) => ({
  items: [],
  unreadCount: 0,
  loading: false,
  page: 1,

  refresh: async () => {
    set({ loading: true });
    try {
      const res = await notificationService.list(1, 20);
      set({ items: res.notifications, unreadCount: res.unreadCount, page: 1, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadMore: async () => {
    const { page, items, loading } = get();
    if (loading) return;
    set({ loading: true });
    try {
      const next = page + 1;
      const res = await notificationService.list(next, 20);
      set({ items: [...items, ...res.notifications], page: next, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  markAllRead: async () => {
    const unreadIds = get().items.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await notificationService.markRead(unreadIds);
    set((s) => ({
      items: s.items.map((n) => (unreadIds.includes(n.id) ? { ...n, isRead: true } : n)),
      unreadCount: 0,
    }));
  },
}));
