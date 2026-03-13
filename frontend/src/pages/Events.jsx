import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import useAuthStore from '../store/authStore';
import useFriendStore from '../store/friendStore';
import { Calendar, Clock, Users, Video, X, Radio, Zap } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import styles from './Events.module.css';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const { user } = useAuthStore();
  const { friends, setFriends } = useFriendStore();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    invitedFriends: []
  });

  useEffect(() => {
    fetchEvents();
    if (friends.length === 0) {
      api.get('/friends').then(({ data }) => setFriends(data)).catch(console.error);
    }
  }, []);

  const fetchEvents = async () => {
    try {
      const { data } = await api.get('/events');
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      await api.post('/events', formData);
      setShowCreateForm(false);
      setFormData({ title: '', date: '', time: '', invitedFriends: [] });
      fetchEvents();
    } catch (error) {
      console.error('Failed to create event', error);
    } finally {
      setCreating(false);
    }
  };

  const createInstantRoom = async () => {
    try {
      const { data } = await api.post('/rooms');
      navigate(`/room/${data.roomId}`);
    } catch (error) {
      console.error('Failed to create room', error);
    }
  };

  const toggleFriendSelect = (friendId) => {
    setFormData(prev => ({
      ...prev,
      invitedFriends: prev.invitedFriends.includes(friendId)
        ? prev.invitedFriends.filter(id => id !== friendId)
        : [...prev.invitedFriends, friendId]
    }));
  };

  const formatDate = (dateStr) => {
    try { return format(parseISO(dateStr), 'MMM dd, yyyy'); }
    catch { return dateStr; }
  };

  const isTimeValid = (dateStr, timeStr) => {
    try {
      if (!dateStr || !timeStr) return false;
      const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const eventStart = new Date(`${cleanDate}T${timeStr}`);
      const now = new Date();
      const diffMs = now - eventStart;
      // Valid window: 15 minutes before till 3 hours after scheduled time
      return diffMs >= -15 * 60000 && diffMs <= 3 * 60 * 60000;
    } catch { return false; }
  };

  return (
    <div className={styles.container}>

      {/* ──────────── HEADER ──────────── */}
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <p className={styles.label}>// CEREBRO OPERATION CENTER</p>
          <h1 className={styles.title}>Watch Parties</h1>
          <p className={styles.subtitle}>Synchronized broadcast schedules &amp; events</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnOutline} onClick={createInstantRoom}>
            <Zap size={16} />
            Instant Broadcast
          </button>
          <button className={styles.btnPrimary} onClick={() => setShowCreateForm(true)}>
            <Calendar size={16} />
            Schedule Event
          </button>
        </div>
      </header>

      {/* ──────────── EVENTS GRID ──────────── */}
      {loading ? (
        <div className={styles.loadingState}>
          &gt; Decrypting schedule database...
        </div>
      ) : events.length > 0 ? (
        <>
          <div className={styles.sectionDivider}>
            <span>Scheduled Operations — {events.length} Found</span>
            <div className={styles.dividerLine} />
          </div>
          <div className={styles.eventsGrid}>
            {events.map(event => {
              const isHost = event.host._id === user?._id;
              return (
                <div key={event._id} className={styles.eventCard}>

                  {/* Badge */}
                  <span className={`${styles.cardBadge} ${isHost ? styles.badgeHost : styles.badgeInvited}`}>
                    {isHost ? 'Host' : 'Invited'}
                  </span>

                  {/* Title */}
                  <h3 className={styles.cardTitle}>{event.title}</h3>

                  {/* Meta */}
                  <ul className={styles.metaList}>
                    <li className={styles.metaItem}>
                      <Calendar size={14} />
                      <span>{formatDate(event.date)}</span>
                    </li>
                    <li className={styles.metaItem}>
                      <Clock size={14} />
                      <span>{event.time}</span>
                    </li>
                    <li className={styles.metaItem}>
                      <Users size={14} />
                      <span>Host: {isHost ? 'You' : event.host.name}</span>
                    </li>
                  </ul>

                  {/* Actions */}
                  <div className={styles.cardFooter}>
                    {isHost ? (
                      <button className={styles.broadcastBtn} onClick={async () => {
                         try {
                            const { data } = await api.post('/rooms', { title: event.title });
                            await api.patch(`/events/${event._id}`, { linkedWatchRoom: data.roomId });
                            navigate(`/room/${data.roomId}`);
                         } catch (e) { console.error(e); }
                      }}>
                        <Radio size={14} style={{ display:'inline', marginRight:'6px' }} />
                        Initiate Broadcast
                      </button>
                    ) : (() => {
                        const myResponse = event.responses?.find(r => r.user === user?._id)?.status || 'pending';
                        if (myResponse === 'pending') {
                            return <div className={styles.awaitBtn}>&gt; Awaiting your acceptance in Notifications</div>;
                        }
                        if (myResponse === 'declined') {
                            return <div className={styles.awaitBtn}>&gt; Invitation Declined</div>;
                        }
                        
                        // Status is Accepted
                        const validTime = isTimeValid(event.date, event.time);
                        if (!validTime) {
                            return <div className={styles.awaitBtn}>&gt; Restricted: Window Locked Until Schedule</div>;
                        }
                        
                        if (event.linkedWatchRoom) {
                            return (
                                <button className={styles.btnPrimary} onClick={() => navigate(`/room/${event.linkedWatchRoom}`)}>
                                  Join Active Signal
                                </button>
                            );
                        } else {
                            return <div className={styles.awaitBtn}>&gt; Awaiting host signal...</div>;
                        }
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className={styles.emptyState}>
          <Video size={48} className={styles.emptyIcon} />
          <p className={styles.emptyText}>No Operations Scheduled</p>
          <p className={styles.emptySubtext}>Schedule your first synchronized watch event above</p>
        </div>
      )}

      {/* ──────────── CREATE MODAL ──────────── */}
      {showCreateForm && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowCreateForm(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>// New Operation Brief</span>
              <button className={styles.closeBtn} onClick={() => setShowCreateForm(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateEvent}>
              <div className={styles.modalBody}>

                {/* Title */}
                <div className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.formLabel}>Event Designation *</label>
                    <input
                      type="text"
                      required
                      className={styles.formInput}
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Stranger Things S4 Premiere"
                    />
                  </div>

                  {/* Date */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Date *</label>
                    <input
                      type="date"
                      required
                      className={styles.formInput}
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>

                  {/* Time */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Time *</label>
                    <input
                      type="time"
                      required
                      className={styles.formInput}
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </div>

                {/* Friends Invite */}
                <div>
                  <p className={styles.friendsLabel}>Authorized Subjects</p>
                  {friends.length > 0 ? (
                    <div className={styles.friendsGrid}>
                      {friends.map(f => (
                        <div
                          key={f._id}
                          className={`${styles.friendChip} ${formData.invitedFriends.includes(f._id) ? styles.selected : ''}`}
                          onClick={() => toggleFriendSelect(f._id)}
                        >
                           <img
                            src={f.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.username}`}
                            alt={f.name}
                          />
                          <p>{f.name}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.noFriends}>No connections in neural directory.</p>
                  )}
                </div>

              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnOutline}
                  onClick={() => setShowCreateForm(false)}
                  style={{ clipPath: 'none' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={creating || !formData.title || !formData.date || !formData.time}
                  style={{ clipPath: 'none', opacity: (creating || !formData.title || !formData.date || !formData.time) ? 0.5 : 1 }}
                >
                  {creating ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
