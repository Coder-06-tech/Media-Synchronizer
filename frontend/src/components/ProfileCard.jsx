import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ProfileCard.module.css';
import api from '../api';

const ProfileCard = ({ user, actionType = 'add', onAction, isRequested: initialRequested = false }) => {
  const [isRequested, setIsRequested] = useState(initialRequested);

  const handleAction = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onAction) {
      const result = await onAction(actionType, user._id);
      if (actionType === 'add' && result) {
        setIsRequested(true);
      } else if (actionType === 'select') {
        // Selection is toggled in the parent, we just visually show it
      }
    } else {
      // Fallback for simple adding if no handler provided
      try {
        if (actionType === 'add' && !isRequested) {
          await api.post('/friends/request', { receiverId: user._id });
          setIsRequested(true);
        }
      } catch (err) {
        console.error('Failed to perform action:', err);
      }
    }
  }

  // Format date for better display
  const formattedDob = user.dob ? new Date(user.dob).toLocaleDateString() : 'Unknown';

  return (
    <div className={styles.card}>
      <div className={styles.glowOverlay}></div>
      <div className={styles.topSection}>
        <div className={styles.avatarWrapper}>
          <img 
            src={user.profilePic || 'https://via.placeholder.com/150'} 
            alt={`${user.name} Profile`} 
            className={styles.avatar} 
          />
        </div>
      </div>
      
      <div className={styles.middleSection}>
        <h2 className={styles.name}>{user.name}</h2>
        <p className={styles.dob}>DOB: {formattedDob}</p>
        <p className={styles.friendsCount}>Friends: {user.friends?.length || 0}</p>
      </div>

      <div className={styles.bottomSection}>
        <Link to={`/profile/${user._id}`} className={styles.viewProfileBtn}>
          View Profile
        </Link>
        
        {actionType === 'add' && (
          <button 
            onClick={handleAction} 
            disabled={isRequested}
            className={`${styles.friendBtn} ${isRequested ? styles.sent : styles.addFriend}`}
          >
            {isRequested ? 'Request Sent' : 'Add Friend'}
          </button>
        )}

        {actionType === 'pending' && (
          <div className={styles.actionGroup}>
            <button 
              onClick={(e) => { e.preventDefault(); onAction('accept', user._id || user.id); }}
              className={styles.acceptBtn}
            >
              Accept
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); onAction('decline', user._id || user.id); }}
              className={styles.declineBtn}
            >
              Deny
            </button>
          </div>
        )}

        {actionType === 'select' && (
          <button 
            onClick={handleAction} 
            className={`${styles.friendBtn} ${user.isSelected || isRequested ? styles.selected : styles.addFriend}`}
          >
            {user.isSelected || isRequested ? 'Subject Selected' : 'Select Subject'}
          </button>
        )}

        {actionType === 'friend' && (
          <button 
            onClick={(e) => { e.preventDefault(); onAction('remove', user._id || user.id); }}
            className={styles.removeBtn}
          >
            Sever Connection
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileCard;
