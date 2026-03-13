import React, { useState, useEffect } from 'react';
import CarouselCards from '../components/CarouselCards';
import SearchBar from '../components/SearchBar';
import ProfileCard from '../components/ProfileCard';
import styles from './FriendsPage.module.css';
import api from '../api';
import { socket } from '../socket/socketClient';

const FriendsPage = () => {
  const [activeTab, setActiveTab] = useState('links');
  const [people, setPeople] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  
  const [filteredPeople, setFilteredPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Socket listeners for real-time updates
    socket.on('friend_list_updated', fetchData);
    socket.on('new_notification', (notification) => {
      if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
        fetchData();
      }
    });

    return () => {
      socket.off('friend_list_updated', fetchData);
      socket.off('new_notification');
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Use /users/potential for Discovery (excludes current friends)
      // Use /friends, /friends/requests/pending, /friends/requests/sent for other tabs
      const [potentialRes, friendsRes, pendingRes, sentRes] = await Promise.all([
        api.get('/users/potential'),
        api.get('/friends'),
        api.get('/friends/requests/pending'),
        api.get('/friends/requests/sent')
      ]);

      setPeople(potentialRes.data);
      setFilteredPeople(potentialRes.data);
      console.log('[Discovery] Potential friends loaded:', potentialRes.data.length);
      setFriends(friendsRes.data);
      setPendingRequests(pendingRes.data);
      setSentRequests(sentRes.data);
    } catch (err) {
      console.error('Failed to fetch connections:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Search queries the /users/search endpoint live
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setFilteredPeople(people);
      if (activeTab !== 'discovery') setActiveTab('discovery');
      return;
    }
    try {
      const { data } = await api.get(`/users/search?search=${encodeURIComponent(query)}`);
      setFilteredPeople(data);
    } catch (err) {
      console.error('Search failed:', err);
    }
    if (activeTab !== 'discovery') setActiveTab('discovery');
  };



  const handleAction = async (action, targetId) => {
    try {
      if (action === 'add') {
        await api.post('/friends/request', { receiverId: targetId });
      } else if (action === 'accept') {
        await api.put(`/friends/request/${targetId}/accept`);
      } else if (action === 'decline') {
        await api.put(`/friends/request/${targetId}/decline`);
      } else if (action === 'remove') {
        if (window.confirm('Protocol: Sever this neural link permanently?')) {
          await api.delete(`/friends/${targetId}`);
        } else {
          return false;
        }
      }
      fetchData();
      return true;
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
      alert(error.response?.data?.message || 'Protocol Failure');
      return false;
    }
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>NETWORK CONNECTIONS</h1>
        <div className={styles.tabContainer}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'links' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('links')}
          >
            FRIENDS ({friends.length})
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'discovery' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('discovery')}
          >
            DISCOVERY
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'signals' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('signals')}
          >
            REQUESTS ({pendingRequests.length})
          </button>
        </div>
      </header>
      
      <SearchBar onSearch={handleSearch} />
      
      <main className={styles.mainContent}>
        {loading ? (
          <div className={styles.loading}>&gt; ACCESSING ENCRYPTED FILES...</div>
        ) : (
          <>
            {activeTab === 'discovery' && (
              <div className={styles.carouselSection}>
                {filteredPeople.length > 0 ? (
                  <CarouselCards people={filteredPeople} />
                ) : (
                  <div className={styles.emptyState}>
                    <p>&gt; No new subjects found in the network.</p>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.5rem' }}>Try registering additional accounts or check your connection.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'signals' && (
              <div className={styles.gridSection}>
                {pendingRequests.length > 0 ? (
                  <div className={styles.grid}>
                    {pendingRequests.map(req => (
                      <ProfileCard 
                        key={req._id} 
                        user={req.sender} 
                        actionType="pending" 
                        onAction={(action) => handleAction(action, req._id)} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>NO INCOMING SIGNALS DETECTED</div>
                )}
              </div>
            )}

            {activeTab === 'links' && (
              <div className={styles.gridSection}>
                {friends.length > 0 ? (
                  <div className={styles.grid}>
                    {friends.map(friend => (
                      <ProfileCard 
                        key={friend._id} 
                        user={friend} 
                        actionType="friend" 
                        onAction={handleAction} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>NO ACTIVE NEURAL LINKS FOUND</div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default FriendsPage;
