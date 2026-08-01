import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './ProfileDetails.module.css';
import api from '../api';
import useAuthStore from '../store/authStore';
import { UserPlus, Clock, Check, UserMinus } from 'lucide-react';

const ProfileDetails = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuthStore();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState('none'); // 'none', 'friends', 'request_sent', 'request_received', 'self'
  const [requestId, setRequestId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchUserAndStatus = async () => {
      try {
        const { data } = await api.get(`/users/${id}`);
        setUser(data);

        // Fetch friend status
        const statusRes = await api.get(`/friends/status/${id}`);
        setFriendStatus(statusRes.data.status);
        setRequestId(statusRes.data.requestId);

        // Record profile view if it's not our own profile
        if (currentUser && currentUser._id !== id) {
           api.post(`/users/${id}/view`).catch(err => console.error('Failed to record view:', err));
        }

      } catch (err) {
        console.error('Data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
       fetchUserAndStatus();
    }
  }, [id, currentUser]);

  const handleFriendAction = async () => {
    setActionLoading(true);
    try {
      if (friendStatus === 'none') {
        const { data } = await api.post('/friends/request', { receiverId: id });
        setFriendStatus('request_sent');
        setRequestId(data._id);
      } else if (friendStatus === 'request_received') {
        await api.put(`/friends/request/${requestId}/accept`);
        setFriendStatus('friends');
      } else if (friendStatus === 'friends') {
        await api.delete(`/friends/${id}`);
        setFriendStatus('none');
      }
    } catch (err) {
      console.error('Friend action failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const renderActionButton = () => {
    if (friendStatus === 'self') return null;

    let text = 'ADD FRIEND';
    let icon = <UserPlus size={18} />;
    
    if (actionLoading) {
      text = 'LOADING...';
    } else if (friendStatus === 'request_sent') {
      text = 'PENDING';
      icon = <Clock size={18} />;
    } else if (friendStatus === 'request_received') {
      text = 'ACCEPT REQUEST';
      icon = <Check size={18} />;
    } else if (friendStatus === 'friends') {
      text = 'REMOVE FRIEND';
      icon = <UserMinus size={18} />;
    }

    return (
      <button 
        className={styles.messageBtn} 
        onClick={handleFriendAction}
        disabled={actionLoading || friendStatus === 'request_sent'}
        style={{ opacity: friendStatus === 'request_sent' ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        {icon}
        {text}
      </button>
    );
  };

  if (loading) {
    return <div className={styles.loading}>&gt; LOADING PROFILE...</div>;
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <h2 className={styles.error}>&gt; ERROR: USER NOT FOUND</h2>
        <Link to="/friends" className={styles.backLink}>Back to Friends</Link>
      </div>
    );
  }

  const formattedDob = user.dob ? new Date(user.dob).toLocaleDateString() : 'Classified';
  const joinedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown';

  return (
    <div className={styles.container}>
      <Link to="/friends" className={styles.backLink}>← Back to Friends</Link>
      
      <div className={styles.profileCard}>
        
        <div className={styles.profileHeader}>
          <img src={user.profilePic || 'https://via.placeholder.com/150'} alt={user.name} className={styles.avatar} />
          <div className={styles.headerInfo}>
            <h1 className={styles.name}>{user.name}</h1>
            <p className={styles.location}>ID: {user.username}</p>
          </div>
          {renderActionButton()}
        </div>
        
        <div className={styles.profileBody}>
          <div className={styles.infoSection}>
            <h3>Bio</h3>
            <p>{user.bio || "No biography available."}</p>
          </div>
          
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Date of Birth</span>
              <span className={styles.detailValue}>{formattedDob}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Email Address</span>
              <span className={styles.detailValue}>{user.email || "Protected"}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Joined Platform</span>
              <span className={styles.detailValue}>{joinedDate}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Status</span>
              <span className={styles.detailValue}>{user.status?.toUpperCase() || "UNKNOWN"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDetails;
