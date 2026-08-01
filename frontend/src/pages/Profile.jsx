import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import api from '../api';
import { Edit2, Upload, Edit, Eye } from 'lucide-react';
import styles from './Profile.module.css';

const Profile = () => {
  const { user, updateUser } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    profilePic: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        profilePic: user.profilePic || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const { data } = await api.put('/users/profile', formData);
      updateUser(data);
      setMessage({ text: 'Profile updated successfully.', type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Error: Failed to save profile.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      profilePic: user.profilePic || ''
    });
    setMessage({ text: '', type: '' });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('profilePic', file);

    setLoading(true);
    try {
      const { data } = await api.post('/users/upload', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData({ ...formData, profilePic: data.url });
      setMessage({ text: 'Image uploaded. Save profile to apply.', type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Image upload failed.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Format date for footer (e.g. 12/04/26 02:17 AM)
  const formatDate = (dateString) => {
    if (!dateString) return 'UNKNOWN';
    const d = new Date(dateString);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const hrs = String(hours).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} ${hrs}:${mins} ${ampm}`;
  };

  if (!user) return <div className="text-red-500 font-retro p-8">&gt; Loading Profile...</div>;

  return (
    <div className={styles.container}>
      {/* Hidden file input */}
      <input 
        type="file" 
        id="avatarInput" 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileChange} 
      />

      <div className={styles.terminalBox}>
        <div className={styles.terminalInnerNode}>
          
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerTitle}>
              <span>USER PROFILE</span>
              <span className={styles.headerDeco}></span>
            </div>
            <button className={styles.recordBtn} onClick={handleSubmit} disabled={loading}>
              <Edit2 size={16} /> SAVE PROFILE
            </button>
          </header>

          {/* Toast / Status Message */}
          {message.text && (
            <div style={{ color: message.type === 'error' ? '#fff' : '#0056b3', border: `1px solid ${message.type === 'error' ? '#fff' : '#0056b3'}`, padding: '10px', marginBottom: '20px', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
              &gt; {message.text}
            </div>
          )}

          <div className={styles.gridContent}>
            {/* Left Column: Avatar & Meta */}
            <div className={styles.avatarColumn}>
              <div className={styles.avatarBox}>
                <div className={styles.avatarInner}>
                  <img 
                    src={formData.profilePic || 'https://via.placeholder.com/200'} 
                    alt="Subject Avatar" 
                    className={styles.avatarImg} 
                  />
                </div>
              </div>
              
              <button 
                className={styles.uploadBtn} 
                onClick={() => document.getElementById('avatarInput').click()}
                type="button"
              >
                <Upload size={16} /> UPLOAD PHOTO
              </button>

              <div className={styles.metaInfo}>
                <div className={styles.metaRow}>
                  <span>ACCESS LEVEL:</span>
                  <span className={styles.metaValueWhite}>USER</span>
                </div>
                <div className={styles.metaRow}>
                  <span>STATUS:</span>
                  <span className={styles.metaValueRed}>{user.status?.toUpperCase() || 'ACTIVE'}</span>
                </div>
                <span className={styles.metaDeco}></span>
              </div>
            </div>

            {/* Right Column: Form Inputs */}
            <div className={styles.formColumn}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Full Name</label>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <Edit size={18} className={styles.inputIcon} />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Phone Number</label>
                <div className={styles.inputWrapper}>
                  <input
                    type="tel"
                    className={styles.input}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <Edit size={18} className={styles.inputIcon} />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email Address</label>
                <div className={styles.inputWrapper}>
                  <input
                    type="email"
                    className={styles.input}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <Edit size={18} className={styles.inputIcon} />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Password</label>
                <div className={styles.inputWrapper}>
                  <input
                    type="password"
                    className={styles.input}
                    value="••••••••••••"
                    disabled
                  />
                  <Eye size={18} className={styles.inputIcon} />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.updateBtn} onClick={handleSubmit} disabled={loading}>
                  {loading ? 'LOADING...' : 'UPDATE PROFILE'}
                </button>
                <button type="button" className={styles.resetBtn} onClick={handleReset} disabled={loading}>
                  RESET CHANGES
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className={styles.footer}>
            <div className={styles.footerLeft}>
              <span>LAST MODIFIED: {formatDate(user.updatedAt)}</span>
              <span className={styles.headerDeco}></span>
            </div>
            
            <div className={styles.securityLevel}>
              <span>SECURITY LEVEL:</span>
              <div className={styles.securityBar}>
                {/* Fixed security bar elements for aesthetics */}
                {[...Array(20)].map((_, i) => (
                  <div key={i} className={i < 15 ? styles.securityTick : styles.securityTickEmpty}></div>
                ))}
              </div>
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
};

export default Profile;
