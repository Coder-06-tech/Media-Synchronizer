import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import useAuthStore from '../store/authStore';
import FriendCard from '../components/FriendCard';

const InitialFriends = () => {
  const [potentialFriends, setPotentialFriends] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  useEffect(() => {
    // If they already selected friends, skip 
    if (user?.hasSelectedInitialFriends) {
      navigate('/friends');
    } else {
      fetchPotentialFriends();
    }
  }, [user, navigate]);

  const fetchPotentialFriends = async () => {
    try {
      const { data } = await api.get('/users/potential');
      setPotentialFriends(data);
    } catch (err) {
      setError('Could not establish secure connection to remote subjects.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(fId => fId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.length < 3) {
      setError('Protocol requires establishing contact with at least 3 subjects.');
      return;
    }

    try {
      setLoading(true);
      // Send friend requests
      await Promise.all(
        selectedIds.map(receiverId => api.post('/friends/request', { receiverId }))
      );

      // Update user status
      const { data } = await api.put('/users/profile', { hasSelectedInitialFriends: true });
      updateUser(data);

      navigate('/friends');
    } catch (err) {
      setError('Error finalizing connections. Retrying...');
      setLoading(false);
    }
  };

  if (loading && potentialFriends.length === 0) {
    return <div className="text-center mt-20 text-xl tracking-widest neon-text blink">SCANNING FOR SUBJECTS...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl uppercase tracking-widest neon-text mb-4">Initial Network Protocol</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Welcome to the program. Before proceeding, you must establish connections with other subjects in the field.
          Select <span className="text-white font-bold">{Math.max(0, 3 - selectedIds.length)}</span> more subjects to continue.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-white p-3 mb-8 text-center max-w-2xl mx-auto">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {potentialFriends.map((subject) => (
          <FriendCard 
            key={subject._id} 
            user={subject} 
            isSelected={selectedIds.includes(subject._id)}
            onSelect={() => handleSelect(subject._id)}
            actionType="select" 
          />
        ))}
      </div>

      <div className="sticky bottom-0 bg-black/90 p-4 border-t-2 border-stranger-red mt-12 flex justify-between items-center">
        <div className="text-xl">
          Connections formed: <span className="text-white font-bold">{selectedIds.length}</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={selectedIds.length < 3 || loading}
          className="px-8 py-3 bg-stranger-red text-black uppercase tracking-widest font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'PROCESSING...' : 'INITIALIZE SEQUENCE'}
        </button>
      </div>
    </div>
  );
};

export default InitialFriends;
