import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { socket } from '../socket/socketClient';
import styles from './NotificationsPage.module.css';
import { Bell, User, Calendar, Trash2, CheckCircle, XCircle, Radio } from 'lucide-react';

/* ── helpers ── */
const TYPE_META = {
  friend_request: { icon: <User size={20} />, label: 'Connection Request' },
  friend_accepted: { icon: <CheckCircle size={20} />, label: 'Connection Accepted' },
  event_invite:   { icon: <Calendar size={20} />, label: 'Event Invitation' },
  watch_invite:   { icon: <Radio size={20} />, label: 'Watch Invite', actionLabel: 'JOIN SESSION' },
  system:         { icon: <Bell size={20} />, label: 'System' },
};

const Skeleton = () => (
  <div className={styles.skeleton}>
    <div className={styles.skeletonIcon} />
    <div className={styles.skeletonBody}>
      <div className={styles.skeletonLine} style={{ width: '70%' }} />
      <div className={styles.skeletonLine} style={{ width: '40%', opacity: 0.5 }} />
    </div>
  </div>
);

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({}); // { [notifId]: true }
  const navigate = useNavigate();

  /* ── fetch on mount ── */
  useEffect(() => {
    let cancelled = false;

    api.get('/notifications')
      .then(({ data }) => { if (!cancelled) { setNotifications(data); } })
      .catch(err => console.error('Failed to fetch notifications:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    // Real-time updates — prepend new signal
    const onNew = (notification) => {
      setNotifications(prev => [notification, ...prev]);
    };
    socket.on('new_notification', onNew);

    return () => {
      cancelled = true;
      socket.off('new_notification', onNew);
    };
  }, []);

  /* ── Accept / Decline — optimistic update, no refetch ── */
  const handleAction = useCallback(async (notif, action) => {
    setActionLoading(prev => ({ ...prev, [notif._id]: true }));

    // Optimistically mark as read in UI
    setNotifications(prev =>
      prev.map(n => n._id === notif._id ? { ...n, read: true } : n)
    );

    try {
      if (notif.type === 'friend_request') {
        const relId = notif.relatedRequest || notif.relatedUser;
        await api.put(`/friends/request/${relId}/${action}`);
      } else if (notif.type === 'event_invite') {
        await api.put(`/events/${notif.relatedEvent}/respond`, {
          status: action === 'accept' ? 'accepted' : 'declined'
        });
      } else if (notif.type === 'watch_invite') {
        navigate(`/room/${notif.relatedRoomId}`);
      }
      // Mark read in backend (fire-and-forget)
      if (notif._id && notif._id !== 'undefined') {
        api.put(`/notifications/${notif._id}/read`).catch(() => {});
      }
    } catch (err) {
      console.error('Action failed:', err);
      // Revert optimistic update on error
      setNotifications(prev =>
        prev.map(n => n._id === notif._id ? { ...n, read: false } : n)
      );
    } finally {
      setActionLoading(prev => ({ ...prev, [notif._id]: false }));
    }
  }, [navigate]);

  /* ── Clear all ── */
  const clearAll = async () => {
    try {
      await api.delete('/notifications/all');
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={styles.container}>

      {/* ── HEADER — always rendered immediately ── */}
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <p className={styles.eyebrow}>// INCOMING TRANSMISSIONS</p>
          <h1 className={styles.title}>
            SIGNALS
            {unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount}</span>
            )}
          </h1>
          <p className={styles.subtitle}>Neural communication log</p>
        </div>
        {notifications.length > 0 && !loading && (
          <button className={styles.clearBtn} onClick={clearAll}>
            <Trash2 size={14} />
            Wipe Logs
          </button>
        )}
      </header>

      {/* ── BODY ── */}
      <div className={styles.notifList}>

        {/* Skeleton placeholders — shown while loading */}
        {loading && [0, 1, 2].map(i => <Skeleton key={i} />)}

        {/* Empty state */}
        {!loading && notifications.length === 0 && (
          <div className={styles.emptyState}>
            <Bell size={48} className={styles.emptyIcon} />
            <p className={styles.emptyText}>NO ACTIVE TRANSMISSIONS</p>
            <p className={styles.emptySubtext}>Your neural feed is clear</p>
          </div>
        )}

        {/* Notification cards */}
        {notifications.map((notif, index) => {
          const meta = TYPE_META[notif.type] || TYPE_META.system;
          const isActing = actionLoading[notif._id];
          const canAct = !notif.read && (notif.type === 'friend_request' || notif.type === 'event_invite' || notif.type === 'watch_invite');

          return (
            <div
              key={notif._id || index}
              className={`${styles.notifCard} ${notif.read ? styles.read : styles.unread}`}
            >
              <div className={styles.notifIconWrap}>
                {meta.icon}
              </div>

              <div className={styles.notifContent}>
                <span className={styles.notifType}>{meta.label}</span>
                <p className={styles.notifMessage}>{notif.message}</p>
                <time className={styles.notifTime}>
                  {new Date(notif.createdAt).toLocaleString()}
                </time>

                {canAct && (
                  <div className={styles.actions}>
                    <button
                      className={styles.acceptBtn}
                      disabled={isActing}
                      onClick={() => handleAction(notif, 'accept')}
                    >
                      {isActing ? '...' : (meta.actionLabel || 'ACCEPT')}
                    </button>
                    {notif.type !== 'watch_invite' && (
                        <button
                        className={styles.declineBtn}
                        disabled={isActing}
                        onClick={() => handleAction(notif, 'decline')}
                        >
                        {isActing ? '...' : 'DECLINE'}
                        </button>
                    )}
                  </div>
                )}
              </div>

              {!notif.read && <span className={styles.activePing} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsPage;
