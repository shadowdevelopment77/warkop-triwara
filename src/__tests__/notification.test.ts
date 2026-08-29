import './setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { TriwaraDatabase } from '../database/db';
import { NotificationService } from '../services/notification.service';

describe('NotificationService (24h Lifecycle)', () => {
  let testDb: TriwaraDatabase;
  let service: NotificationService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    await testDb.open();
    await testDb.notifications.clear();
    service = new NotificationService(testDb);
  });

  it('records notifications and counts unread accurately', async () => {
    const id1 = await service.addNotification('Stok Rendah', 'Biji kopi menipis', 'alert', 'inventory');
    await service.addNotification('Pesanan Selesai', 'Order #001 sukses', 'order', 'reports');

    let unread = await service.getUnreadCount();
    expect(unread).toBe(2);

    await service.markAsRead(id1);
    unread = await service.getUnreadCount();
    expect(unread).toBe(1);

    await service.markAllAsRead();
    unread = await service.getUnreadCount();
    expect(unread).toBe(0);
  });

  it('prunes notifications older than 24 hours automatically', async () => {
    const now = Date.now();
    // 1. Add notification from 25 hours ago (expired)
    await testDb.notifications.add({
      title: 'Notif Kemarin',
      message: 'Sudah lewat 24 jam',
      type: 'inventory',
      createdAt: new Date(now - 25 * 60 * 60 * 1000),
      isRead: false,
    });

    // 2. Add fresh notification (5 minutes ago)
    await testDb.notifications.add({
      title: 'Notif Baru',
      message: 'Baru saja terjadi',
      type: 'order',
      createdAt: new Date(now - 5 * 60 * 1000),
      isRead: false,
    });

    // When querying active notifications, expired ones should be pruned
    const active = await service.getActiveNotifications();
    expect(active.length).toBe(1);
    expect(active[0].title).toBe('Notif Baru');

    // Verify expired was removed from database
    const allInDb = await testDb.notifications.toArray();
    expect(allInDb.length).toBe(1);
  });
});
