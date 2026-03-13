import { useState, useEffect } from 'react';
import useFriendStore from '../store/friendStore';
import api from '../api';
import FriendCard from '../components/FriendCard';
import { Search } from 'lucide-react';
import { socket } from '../socket/socketClient';

const Friends = () => {
  const { friends, setFriends, pendingRequests, setPendingRequests, sentRequests, setSentRequests } = useFriendStore();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'search', 'requests'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFriendsData();

    // Listen for socket events to refresh
    socket.on('friend_list_updated', fetchFriendsData);
    socket.on('new_notification', (notification) => {
       if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
           fetchFriendsData();
       } 
    });

    return () => {
        socket.off('friend_list_updated', fetchFriendsData);
        socket.off('new_notification');
    };
  }, []);

  const fetchFriendsData = async () => {
    try {
      const [friendsRes, pendingRes, sentRes] = await Promise.all([
        api.get('/friends'),
        api.get('/friends/requests/pending'),
        api.get('/friends/requests/sent')
      ]);
      setFriends(friendsRes.data);
      setPendingRequests(pendingRes.data);
      setSentRequests(sentRes.data);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const { data } = await api.get(`/users/search?search=${searchQuery}`);
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action, targetId) => {
    try {
      if (action === 'add') {
        await api.post('/friends/request', { receiverId: targetId });
        // remove from search results visually to show it was sent
        setSearchResults(searchResults.filter(u => u._id !== targetId));
      } else if (action === 'accept') {
        await api.put(`/friends/request/${targetId}/accept`);
      } else if (action === 'decline') {
        await api.put(`/friends/request/${targetId}/decline`);
      } else if (action === 'remove') {
        if(window.confirm('Are you certain you want to sever this connection?')) {
            await api.delete(`/friends/${targetId}`);
        } else {
            return;
        }
      }
      fetchFriendsData();
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
      alert(error.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <h2 className="text-3xl uppercase tracking-widest neon-text mb-8 border-b-2 border-stranger-red pb-4">
        Network Connections
      </h2>

      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-8 border-b border-gray-800 pb-2">
        <button 
          onClick={() => setActiveTab('friends')}
          className={`px-4 py-2 uppercase tracking-widest transition-colors ${
            activeTab === 'friends' ? 'text-stranger-red font-bold border-b-2 border-stranger-red' : 'text-gray-500 hover:text-white'
          }`}
        >
          Active Links ({friends.length})
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 uppercase tracking-widest transition-colors ${
            activeTab === 'requests' ? 'text-stranger-red font-bold border-b-2 border-stranger-red' : 'text-gray-500 hover:text-white'
          }`}
        >
          Signals ({pendingRequests.length})
        </button>
        <button 
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 uppercase tracking-widest transition-colors ${
            activeTab === 'search' ? 'text-stranger-red font-bold border-b-2 border-stranger-red' : 'text-gray-500 hover:text-white'
          }`}
        >
          Scan Directory
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'friends' && (
        friends.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {friends.map(friend => (
              <FriendCard 
                key={friend._id} 
                user={friend} 
                actionType="friend" 
                onAction={handleAction} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 uppercase tracking-widest">
            No active connections found. Scan directory to establish links.
          </div>
        )
      )}

      {activeTab === 'requests' && (
        <div className="space-y-8">
          <div>
            <h3 className="text-xl uppercase tracking-widest text-stranger-red mb-4">Incoming Signals</h3>
            {pendingRequests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pendingRequests.map(req => (
                  <FriendCard 
                    key={req._id} 
                    user={req.sender} 
                    actionType="pending" 
                    onAction={(action) => handleAction(action, req._id)} 
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 uppercase tracking-widest text-sm">No incoming signals detected.</p>
            )}
          </div>

          <div>
             <h3 className="text-xl uppercase tracking-widest text-stranger-red mb-4">Broadcasted Signals (Pending)</h3>
             {sentRequests.length > 0 ? (
                 <div className="space-y-4">
                     {sentRequests.map(req => (
                         <div key={req._id} className="flex items-center gap-4 bg-black/40 p-3 border border-gray-800">
                             <img src={req.receiver.profilePic || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'} alt="" className="w-10 h-10 rounded-full border border-stranger-red" />
                             <div>
                                 <p className="text-white uppercase tracking-wider">{req.receiver.name}</p>
                                 <p className="text-xs text-gray-500 font-mono">[{req.receiver.username}]</p>
                             </div>
                             <div className="ml-auto text-yellow-600 text-xs uppercase tracking-widest flex items-center gap-2">
                                 <div className="w-2 h-2 bg-yellow-600 rounded-full blink"></div>
                                 Awaiting Response
                             </div>
                         </div>
                     ))}
                 </div>
             ) : (
                <p className="text-gray-500 uppercase tracking-widest text-sm">No outgoing signals currently active.</p>
             )}
          </div>
        </div>
      )}

      {activeTab === 'search' && (
        <div>
          <form onSubmit={handleSearch} className="flex gap-4 mb-8">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="ENTER SUBJECT DESIGNATION..." 
                className="w-full bg-black/60 border-b border-stranger-red p-3 pl-10 text-white outline-none focus:border-white transition-colors placeholder-gray-600 uppercase tracking-widest"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-3.5 text-stranger-red" size={20} />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-stranger-red text-black uppercase tracking-widest font-bold hover:bg-white transition-colors disabled:opacity-50"
            >
              {loading ? 'SCANNING' : 'SEARCH'}
            </button>
          </form>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {searchResults.map(user => (
                <FriendCard 
                  key={user._id} 
                  user={user} 
                  actionType={
                    friends.some(f => f._id === user._id) ? 'friend' :
                    sentRequests.some(r => r.receiver._id === user._id) ? 'sent' :
                    pendingRequests.some(r => r.sender._id === user._id) ? 'pending' :
                    'add'
                  } 
                  onAction={handleAction} 
                />
              ))}
            </div>
          ) : (
             searchQuery && !loading && (
                <div className="text-center py-12 text-gray-500 uppercase tracking-widest">
                    Subject match not found in database.
                </div>
             )
          )}
        </div>
      )}
    </div>
  );
};

export default Friends;
