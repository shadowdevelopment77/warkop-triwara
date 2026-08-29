// ═══════════════════════════════════════════════
// Triwara POS — 24-Hour Non-Modal Notification Dropdown Flyout
// ═══════════════════════════════════════════════

import React from 'react';
import type { IAppNotification } from '../../types';
import type { MasterTab } from './MasterDrawer';
import { formatDateIndonesian } from '../../utils/date';

interface NotificationFlyoutProps {
  isOpen: boolean;
  notifications: IAppNotification[];
  onClose: () => void;
  onSelectNotification: (targetTab?: MasterTab, id?: number) => void;
  onMarkAllRead: () => void;
}

export const NotificationFlyout: React.FC<NotificationFlyoutProps> = ({
  isOpen,
  notifications,
  onSelectNotification,
  onMarkAllRead,
}) => {
  if (!isOpen) return null;


  return (
    <div className="notification-flyout" onClick={(e) => e.stopPropagation()}>
      <div className="notification-flyout-header">
        <span className="notification-flyout-title">Notifikasi (24 Jam)</span>
        {notifications.length > 0 && (
          <button
            type="button"
            className="btn-action-small"
            style={{ fontSize: '11px', padding: '2px 8px' }}
            onClick={onMarkAllRead}
          >
            Tandai Dibaca
          </button>
        )}
      </div>

      <div className="notification-flyout-body">
        {notifications.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>
            Tidak ada notifikasi baru dalam 24 jam terakhir.
          </p>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`notification-card ${!notif.isRead ? 'unread' : ''}`}
              style={{ padding: '8px 10px', cursor: 'pointer', margin: 0 }}
              onClick={() => onSelectNotification(notif.targetTab as MasterTab, notif.id)}
            >
              <div className="notif-header" style={{ marginBottom: '4px' }}>
                <span className="notif-time" style={{ fontSize: '10px' }}>
                  {formatDateIndonesian(notif.createdAt)}
                </span>
              </div>
              <h4 className="notif-title" style={{ fontSize: '12px', margin: '0 0 2px 0' }}>
                {notif.title}
              </h4>
              <p className="notif-message" style={{ fontSize: '11px', margin: 0, lineHeight: 1.3 }}>
                {notif.message}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
