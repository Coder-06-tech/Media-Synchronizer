import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import api from '../api';
import { Camera, Save } from 'lucide-react';

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
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const { data } = await api.put('/users/profile', formData);
      updateUser(data);
      setMessage({ text: 'Subject records updated successfully.', type: 'success' });
    } catch (err) {
      setMessage({ text: 'Failed to update records.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="text-center mt-20 blink uppercase tracking-widest">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h2 className="text-3xl uppercase tracking-widest neon-text mb-8 border-b-2 border-stranger-red pb-4">
        Subject Profile: {user.username}
      </h2>

      {message.text && (
        <div className={`p-4 mb-6 text-sm uppercase tracking-widest ${
          message.type === 'success' ? 'bg-green-900/40 border border-green-500 text-green-400' : 'bg-red-900/40 border border-red-500 text-white'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Picture Section */}
        <div className="col-span-1 flex flex-col items-center border border-stranger-red/50 p-6 bg-black/40">
           <div className="relative group cursor-pointer">
             <img 
               src={formData.profilePic || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'} 
               alt="Profile" 
               className="w-48 h-48 object-cover rounded-full border-4 border-stranger-red"
             />
             <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <Camera size={32} className="text-white mb-2" />
             </div>
             {/* Note: Cloudinary widget integration would go here. For now it's visual. */}
           </div>
           <p className="text-xs text-gray-500 mt-4 uppercase tracking-widest text-center">
             Visual record required for synchronization protocols.
           </p>
        </div>

        {/* Data Fields */}
        <div className="col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs uppercase mb-2 tracking-widest text-gray-400 border-b border-gray-800 pb-1">Designation Label</label>
              <input
                type="text"
                className="w-full bg-transparent p-2 text-xl font-bold text-white outline-none focus:border-b focus:border-stranger-red transition-colors"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs uppercase mb-2 tracking-widest text-gray-400 border-b border-gray-800 pb-1">Comms Frequency</label>
                <input
                  type="tel"
                  className="w-full bg-transparent p-2 text-white outline-none focus:border-b focus:border-stranger-red transition-colors"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-xs uppercase mb-2 tracking-widest text-gray-400 border-b border-gray-800 pb-1">Electronic Mail</label>
                <input
                  type="email"
                  className="w-full bg-transparent p-2 text-white outline-none focus:border-b focus:border-stranger-red transition-colors"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-8 flex justify-end">
              <button 
                type="submit" 
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-stranger-red text-black uppercase tracking-widest font-bold hover:bg-white transition-colors disabled:opacity-50"
              >
                <Save size={20} />
                {loading ? 'SAVING...' : 'COMMIT CHANGES'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
