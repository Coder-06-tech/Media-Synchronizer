import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../api';
import { socket } from '../socket/socketClient';
import { MonitorPlay } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      if (!user.hasSelectedInitialFriends) {
        navigate('/setup-friends');
      } else {
        navigate('/friends');
      }
    }
  }, [isAuthenticated, navigate, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', formData);
      login(data, data.token);
      
      socket.io.opts.query = { token: data.token };
      socket.connect();
      socket.emit('setup', data);

      if (!data.hasSelectedInitialFriends) {
          navigate('/setup-friends');
      } else {
          navigate('/friends');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login to Hawkins Lab.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[70vh] flex justify-center items-center">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-no-repeat" 
        style={{ backgroundImage: 'url("/login-bg.jpg")', backgroundPosition: 'center 15%' }}
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40"></div>
      </div>

      <div className="glass-card p-10 border border-stranger-red/30 neon-border max-w-md w-full relative z-10 overflow-hidden shadow-[0_0_50px_rgba(229,9,20,0.2)]">
        {/* Decorative corner pieces */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-stranger-red"></div>
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-stranger-red"></div>
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-stranger-red"></div>
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-stranger-red"></div>

        <div className="flex flex-col items-center mb-10">
            <MonitorPlay size={56} className="text-stranger-red mb-4 drop-shadow-[0_0_8px_rgba(229,9,20,0.8)]" />
            <h2 className="text-4xl font-orbitron tracking-[0.2em] text-center neon-text">System Login</h2>
            <p className="text-gray-500 text-[10px] uppercase mt-2 tracking-widest font-outfit">Authorization Required</p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-500/50 text-red-200 p-4 mb-8 text-xs font-outfit text-center uppercase tracking-wider backdrop-blur-sm">
            <span className="font-bold">Access Denied:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="relative group">
            <label className="block text-[10px] uppercase mb-1 tracking-[0.2em] text-gray-400 font-outfit group-focus-within:text-stranger-red transition-colors">Credential: Username</label>
            <input
              type="text"
              autoFocus
              className="w-full bg-transparent border-b border-stranger-red/40 p-3 text-white font-outfit focus:outline-none focus:border-stranger-red transition-all duration-300 placeholder:text-gray-700"
              placeholder="Enter Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>
          <div className="relative group">
            <label className="block text-[10px] uppercase mb-1 tracking-[0.2em] text-gray-400 font-outfit group-focus-within:text-stranger-red transition-colors">Credential: Password</label>
            <input
              type="password"
              className="w-full bg-transparent border-b border-stranger-red/40 p-3 text-white font-outfit focus:outline-none focus:border-stranger-red transition-all duration-300 placeholder:text-gray-700"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="group relative w-full py-4 bg-stranger-red text-black font-orbitron uppercase tracking-[0.3em] font-black hover:bg-white transition-all duration-500 disabled:opacity-50 mt-6 overflow-hidden"
          >
            <span className="relative z-10">{loading ? 'INITIALIZING...' : 'Establish Connection'}</span>
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          </button>
        </form>
        
        <div className="mt-10 text-center text-[11px] font-outfit tracking-wider">
          <span className="text-gray-500 uppercase">Subject unknown? </span>
          <Link to="/register" className="text-white hover:text-stranger-red transition-all duration-300 underline decoration-stranger-red/50 decoration-1 underline-offset-[6px] hover:underline-offset-[8px] uppercase font-bold">
            Create Record
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
