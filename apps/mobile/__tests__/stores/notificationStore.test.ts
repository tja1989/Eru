import { useNotificationStore } from '@/stores/notificationStore';
import { notificationService } from '@/services/notificationService';

jest.mock('@/services/notificationService');

describe('notificationStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationStore.setState({ items: [], unreadCount: 0, loading: false, page: 1 });
  });

  it('refresh() loads page 1 and replaces items', async () => {
    (notificationService.list as jest.Mock).mockResolvedValue({
      notifications: [{ id: 'n1', isRead: false, title: 'a', body: 'b', type: 'x', createdAt: 'z' }],
      unreadCount: 1,
      page: 1,
      limit: 20,
      total: 1,
    });

    await useNotificationStore.getState().refresh();

    expect(useNotificationStore.getState().items).toHaveLength(1);
    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });

  it('markAllRead() calls markRead on all unread ids and zeros the count', async () => {
    useNotificationStore.setState({
      items: [
        { id: 'n1', isRead: false } as any,
        { id: 'n2', isRead: true } as any,
      ],
      unreadCount: 1,
      loading: false,
      page: 1,
    });
    (notificationService.markRead as jest.Mock).mockResolvedValue(1);

    await useNotificationStore.getState().markAllRead();

    expect(notificationService.markRead).toHaveBeenCalledWith(['n1']);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
    expect(useNotificationStore.getState().items.every((n) => n.isRead)).toBe(true);
  });
});
