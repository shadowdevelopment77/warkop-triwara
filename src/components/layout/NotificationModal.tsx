// ═══════════════════════════════════════════════
// Triwara POS — 24-Hour Notifications Modal
// ═══════════════════════════════════════════════

import React from 'react';
import type { IAppNotification } from '../../types';
import type { MasterTab } from './MasterDrawer';
import { formatDateIndonesian } from '../../utils/date';

interface NotificationModalProps {
  isOpen: boolean;
  notifications: IAppNotification[];
  onClose: () => void;
  onSelectNotification: (targetTab?: MasterTab, id?: number) => void;
  onMarkAllRead: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  notifications,
  onClose,
  onSelectNotification,
  onMarkAllRead,
}) => {
  if (!isOpen) return null;

  const getBadgeTag = (type: string) => {
    switch (type) {
      case 'inventory':
        return <span className="notif-tag">[STOK]</span>;
      case 'order':
        return <span className="notif-tag">[TRANSAKSI]</span>;
      case 'product':
        return <span className="notif-tag">[MENU]</span>;
      case 'alert':
      default:
        return <span className="notif-tag alert">[ALERT]</span>;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card notification-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Notifikasi Sistem</h3>
            <span className="modal-subtitle">Aktivitas &amp; peringatan dalam 1x24 jam terakhir</span>
          </div>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {notifications.length === 0 ? (
            <p className="empty-hint" style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              Tidak ada notifikasi dalam 24 jam terakhir.
            </p>
          ) : (
            <div className="notifications-list">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-card ${!notif.isRead ? 'unread' : ''}`}
                  onClick={() => onSelectNotification(notif.targetTab as MasterTab, notif.id)}
                >
                  <div className="notif-header">
                    {getBadgeTag(notif.type)}
                    <span className="notif-time">{formatDateIndonesian(notif.createdAt)}</span>
                  </div>
                  <h4 className="notif-title">{notif.title}</h4>
                  <p className="notif-message">{notif.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onMarkAllRead}>
              Tandai Semua Dibaca
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
