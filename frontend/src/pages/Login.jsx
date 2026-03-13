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
    <div className="flex justify-center items-center h-[80vh]">
      <div className="bg-black/80 p-8 border border-stranger-red neon-border max-w-md w-full relative overflow-hidden">
        {/* Decorative corner pieces */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-stranger-red"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-stranger-red"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-stranger-red"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-stranger-red"></div>

        <div className="flex flex-col items-center mb-8">
            <MonitorPlay size={48} className="text-stranger-red mb-4" />
            <h2 className="text-3xl uppercase tracking-widest text-center neon-text">System Login</h2>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-white p-3 mb-6 text-sm text-center">
            ERROR: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs uppercase mb-2 tracking-widest">Username</label>
            <input
              type="text"
              autoFocus
              className="w-full bg-transparent border-b border-stranger-red p-2 text-white focus:outline-none focus:border-white transition-colors"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs uppercase mb-2 tracking-widest">Password</label>
            <input
              type="password"
              className="w-full bg-transparent border-b border-stranger-red p-2 text-white focus:outline-none focus:border-white transition-colors"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-stranger-red text-black uppercase tracking-widest font-bold hover:bg-white transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'INITIALIZING...' : 'ENTER'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <span className="text-gray-500">Subject unknown? </span>
          <Link to="/register" className="text-white hover:text-stranger-red transition-colors underline decoration-stranger-red decoration-2 underline-offset-4">
            Register for trials
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
