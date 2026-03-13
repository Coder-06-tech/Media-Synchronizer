import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../api';
import { socket } from '../socket/socketClient';
import { Camera } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({ 
    name: '', userName: '', dob: '', password: '', phone: '', email: ''
  });
  // Note Cloudinary upload not fully implemented directly on client yet without widget, using placeholder
  const [profilePic, setProfilePic] = useState('https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/friends');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
          name: formData.name,
          username: formData.userName,
          dob: formData.dob,
          password: formData.password,
          phone: formData.phone,
          email: formData.email,
          profilePic
      };
      
      const { data } = await api.post('/auth/register', payload);
      login(data, data.token);
      
      socket.io.opts.query = { token: data.token };
      socket.connect();
      socket.emit('setup', data);

      navigate('/friends');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex justify-center items-center py-10">
       {/* Background Image with Overlay */}

      <div className="glass-card p-10 border border-stranger-red/30 neon-border max-w-lg w-full relative z-10 shadow-[0_0_50px_rgba(229,9,20,0.2)]">
        <h2 className="text-3xl font-orbitron tracking-[0.2em] text-center neon-text mb-10">Subject Registration</h2>

        {error && (
          <div className="bg-red-950/40 border border-red-500/50 text-red-200 p-4 mb-8 text-xs font-outfit text-center uppercase tracking-wider backdrop-blur-sm">
            <span className="font-bold">Protocol Failure:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
              <div className="group relative">
                <label className="block text-[10px] uppercase mb-1 tracking-[0.2em] text-gray-400 font-outfit group-focus-within:text-stranger-red transition-colors">Record: Full Name</label>
                <input
                  type="text"
                  className="w-full bg-transparent border-b border-stranger-red/40 p-2 text-white font-outfit outline-none focus:border-stranger-red transition-all duration-300"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="group relative">
                <label className="block text-[10px] uppercase mb-1 tracking-[0.2em] text-gray-400 font-outfit group-focus-within:text-stranger-red transition-colors">Codename: Username</label>
                <input
                  type="text"
                  className="w-full bg-transparent border-b border-stranger-red/40 p-2 text-white font-outfit outline-none focus:border-stranger-red transition-all duration-300"
                  value={formData.userName}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                  required
                />
              </div>
          </div>
          
          <div className="group relative">
            <label className="block text-[10px] uppercase mb-1 tracking-[0.2em] text-gray-400 font-outfit group-focus-within:text-stranger-red transition-colors">Security: Passcode</label>
            <input
              type="password"
              className="w-full bg-transparent border-b border-stranger-red/40 p-2 text-white font-outfit outline-none focus:border-stranger-red transition-all duration-300"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="group relative">
              <label className="block text-[10px] uppercase mb-1 tracking-[0.2em] text-gray-400 font-outfit group-focus-within:text-stranger-red transition-colors">Record: Birth Date</label>
              <input
                type="date"
                className="w-full bg-transparent border-b border-stranger-red py-2 text-white font-outfit outline-none focus:border-stranger-red transition-all duration-300"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                required
              />
            </div>
            <div className="group relative">
              <label className="block text-[10px] uppercase mb-1 tracking-[0.2em] text-gray-400 font-outfit group-focus-within:text-stranger-red transition-colors">Comms: Number</label>
              <input
                type="tel"
                className="w-full bg-transparent border-b border-stranger-red py-2 text-white font-outfit outline-none focus:border-stranger-red transition-all duration-300"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="group relative">
            <label className="block text-[10px] uppercase mb-1 tracking-[0.2em] text-gray-400 font-outfit group-focus-within:text-stranger-red transition-colors">Secondary: Email (Optional)</label>
            <input
              type="email"
              className="w-full bg-transparent border-b border-stranger-red/40 p-2 text-white font-outfit outline-none focus:border-stranger-red transition-all duration-300"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative group">
              <img 
                src={profilePic} 
                alt="Preview" 
                className="w-24 h-24 object-cover rounded-full border-2 border-stranger-red"
              />
              <label 
                htmlFor="regAvatar" 
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
              >
                <Camera size={20} className="text-white" />
              </label>
            </div>
            <input 
              type="file" 
              id="regAvatar" 
              className="hidden" 
              accept="image/*" 
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('profilePic', file);
                try {
                  const { data } = await api.post('/auth/upload-temp', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                  });
                  setProfilePic(data.url);
                } catch (err) {
                  setError('Image upload failed.');
                }
              }} 
            />
            <span className="text-[10px] uppercase tracking-tighter text-gray-500">Subject Visual Signature</span>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="group relative w-full py-4 mt-8 bg-stranger-red text-black font-orbitron uppercase tracking-[0.3em] font-black hover:bg-white transition-all duration-500 disabled:opacity-50 overflow-hidden"
          >
            <span className="relative z-10">{loading ? 'PROCESSING...' : 'Initialize Subject'}</span>
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          </button>
        </form>
        
        <div className="mt-8 text-center text-[10px] font-outfit tracking-[0.2em]">
          <Link to="/login" className="text-gray-500 hover:text-white transition-all duration-300 uppercase font-bold flex items-center justify-center gap-2 group">
            <span className="group-hover:translate-x-[-4px] transition-transform duration-300">«</span> Return to Control Gate
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
