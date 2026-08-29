// ═══════════════════════════════════════════════
// Triwara POS — Notification Service (24h Auto-Pruning)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type { IAppNotification, NotificationType } from '../types';

export class NotificationService {
  private database: TriwaraDatabase;

  constructor(database: TriwaraDatabase = db) {
    this.database = database;
  }

  /**
   * Adds a new event notification
   */
  async addNotification(
    title: string,
    message: string,
    type: NotificationType,
    targetTab?: 'pos' | 'inventory' | 'products' | 'reports'
  ): Promise<number> {
    const notification: IAppNotification = {
      title,
      message,
      type,
      targetTab,
      createdAt: new Date(),
      isRead: false,
    };

    const id = (await this.database.notifications.add(notification)) as number;
    // Trigger lightweight cleanup of notifications older than 24h in background
    this.pruneExpired().catch(() => {});
    return id;
  }

  /**
   * Gets active notifications within the last 24 hours, sorted newest first
   */
  async getActiveNotifications(): Promise<IAppNotification[]> {
    await this.pruneExpired();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const notifs = await this.database.notifications
      .where('createdAt')
      .aboveOrEqual(twentyFourHoursAgo)
      .reverse()
      .sortBy('createdAt');
    return notifs;
  }

  /**
   * Returns count of unread notifications from the last 24 hours
   */
  async getUnreadCount(): Promise<number> {
    const active = await this.getActiveNotifications();
    return active.filter((n) => !n.isRead).length;
  }

  /**
   * Marks a specific notification as read
   */
  async markAsRead(id: number): Promise<void> {
    await this.database.notifications.update(id, { isRead: true });
  }

  /**
   * Marks all active notifications as read
   */
  async markAllAsRead(): Promise<void> {
    const active = await this.getActiveNotifications();
    for (const n of active) {
      if (n.id && !n.isRead) {
        await this.database.notifications.update(n.id, { isRead: true });
      }
    }
  }

  /**
   * Prunes and deletes notifications older than 24 hours (1x24 jam)
   */
  async pruneExpired(): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expired = await this.database.notifications
      .where('createdAt')
      .below(twentyFourHoursAgo)
      .toArray();

    if (expired.length > 0) {
      const idsToDelete = expired.map((n) => n.id!).filter(Boolean);
      await this.database.notifications.bulkDelete(idsToDelete);
      return idsToDelete.length;
    }
    return 0;
  }
}

export const notificationService = new NotificationService();
