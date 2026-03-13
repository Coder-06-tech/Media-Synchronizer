import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import useAuthStore from '../store/authStore';
import useFriendStore from '../store/friendStore';
import { Calendar as CalendarIcon, Clock, Users, Video } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { user } = useAuthStore();
  const { friends } = useFriendStore();
  const navigate = useNavigate();

  // Create event form state
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    invitedFriends: []
  });

  useEffect(() => {
    fetchEvents();
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
      setLoading(true);
      await api.post('/events', formData);
      setShowCreateForm(false);
      setFormData({ title: '', date: '', time: '', invitedFriends: [] });
      fetchEvents();
    } catch (error) {
      console.error('Failed to create event', error);
      alert('Failed to schedule event.');
    } finally {
      setLoading(false);
    }
  };

  const createInstantRoom = async () => {
    try {
      const { data } = await api.post('/rooms');
      navigate(`/room/${data.roomId}`);
    } catch (error) {
      console.error('Failed to create room', error);
      alert('Failed to initialize broadcast room.');
    }
  };

  const toggleFriendSelect = (friendId) => {
    if (formData.invitedFriends.includes(friendId)) {
      setFormData(prev => ({ ...prev, invitedFriends: prev.invitedFriends.filter(id => id !== friendId) }));
    } else {
      setFormData(prev => ({ ...prev, invitedFriends: [...prev.invitedFriends, friendId] }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-end mb-8 border-b-2 border-stranger-red pb-4">
        <div>
          <h2 className="text-3xl uppercase tracking-widest neon-text mb-2">Watch Parties</h2>
          <p className="text-gray-400 uppercase tracking-widest text-sm">Synchronized Viewing Schedules</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={createInstantRoom}
            className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-stranger-red transition-colors"
          >
            <Video size={20} /> Instant Broadcast
          </button>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-6 py-3 bg-stranger-red text-black font-bold uppercase tracking-widest hover:bg-white transition-colors"
          >
            <CalendarIcon size={20} /> Schedule Event
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-black/60 border border-stranger-red p-6 mb-12">
          <h3 className="text-xl text-white uppercase tracking-widest mb-6">Create New Schedule</h3>
          <form onSubmit={handleCreateEvent} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-2 tracking-widest">Event Designation</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-transparent border-b border-stranger-red p-2 text-white outline-none focus:border-white"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Stranger Things Season 4 Premiere"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-gray-400 mb-2 tracking-widest">Date</label>
                  <input 
                    type="date" 
                    required
                    className="w-full bg-transparent border-b border-stranger-red py-2 text-white outline-none focus:border-white"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-gray-400 mb-2 tracking-widest">Time</label>
                  <input 
                    type="time" 
                    required
                    className="w-full bg-transparent border-b border-stranger-red py-2 text-white outline-none focus:border-white"
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase text-gray-400 mb-4 tracking-widest">Select Authorized Subjects List</label>
              {friends.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-48 overflow-y-auto pr-2">
                  {friends.map(f => (
                    <div 
                      key={f._id}
                      onClick={() => toggleFriendSelect(f._id)}
                      className={`cursor-pointer border p-2 text-center transition-colors ${
                        formData.invitedFriends.includes(f._id) ? 'bg-stranger-red text-black border-white' : 'border-gray-800 text-gray-400 hover:border-stranger-red'
                      }`}
                    >
                      <img src={f.profilePic || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'} alt="" className="w-8 h-8 rounded-full mx-auto mb-2 object-cover" />
                      <p className="text-xs truncate">{f.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-yellow-600 text-sm">No connections available in your directory.</p>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit"
                disabled={loading || !formData.title || !formData.date || !formData.time}
                className="px-8 py-3 bg-stranger-red text-black font-bold uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50"
              >
                CONFIRM SCHEDULE
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && !showCreateForm ? (
        <div className="text-center py-12 blink text-stranger-red uppercase tracking-widest">Loading schedules...</div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map(event => {
            const isHost = event.host._id === user?._id;
            return (
              <div key={event._id} className="border border-gray-800 bg-black/40 hover:border-stranger-red transition-all p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 bg-stranger-red/20 text-stranger-red text-xs uppercase font-bold tracking-widest group-hover:bg-stranger-red group-hover:text-black transition-colors">
                  {isHost ? 'HOST' : 'INVITED'}
                </div>
                
                <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-4 pr-16">{event.title}</h3>
                
                <div className="space-y-2 mb-6 text-sm text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-3">
                    <CalendarIcon size={16} className="text-stranger-red" />
                    <span>{format(parseISO(event.date), 'MMMM do, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-stranger-red" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users size={16} className="text-stranger-red" />
                    <span>Host: {isHost ? 'You' : event.host.name}</span>
                  </div>
                </div>

                <button 
                  onClick={isHost ? createInstantRoom : () => alert('Please wait for host to initiate the broadcast URL.')}
                  className="w-full py-3 border border-stranger-red text-stranger-red uppercase tracking-widest text-sm hover:bg-stranger-red hover:text-black transition-colors font-bold"
                >
                  {isHost ? 'INITIATE BROADCAST' : 'AWAITING SIGNAL'}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 border border-gray-900 bg-black/20">
          <p className="text-gray-500 uppercase tracking-widest">No upcoming schedules found in directory.</p>
        </div>
      )}
    </div>
  );
};

export default Events;
