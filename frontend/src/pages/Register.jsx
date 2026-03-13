import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../api';
import { socket } from '../socket/socketClient';

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
      navigate('/setup-friends');
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

      navigate('/setup-friends');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-10">
      <div className="bg-black/80 p-8 border border-stranger-red neon-border max-w-lg w-full relative">
        <h2 className="text-2xl uppercase tracking-widest text-center neon-text mb-8">Subject Registration</h2>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-white p-3 mb-6 text-sm text-center">
            ERROR: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase mb-1 tracking-widest text-gray-400">Full Record Name</label>
                <input
                  type="text"
                  className="w-full bg-transparent border-b border-stranger-red p-2 text-white outline-none focus:border-white"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase mb-1 tracking-widest text-gray-400">Codename (Username)</label>
                <input
                  type="text"
                  className="w-full bg-transparent border-b border-stranger-red p-2 text-white outline-none focus:border-white"
                  value={formData.userName}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                  required
                />
              </div>
          </div>
          
          <div>
            <label className="block text-xs uppercase mb-1 tracking-widest text-gray-400">Passcode</label>
            <input
              type="password"
              className="w-full bg-transparent border-b border-stranger-red p-2 text-white outline-none focus:border-white"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase mb-1 tracking-widest text-gray-400">Date of Birth</label>
              <input
                type="date"
                className="w-full bg-transparent border-b border-stranger-red py-2 text-white outline-none focus:border-white"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase mb-1 tracking-widest text-gray-400">Comms Number</label>
              <input
                type="tel"
                className="w-full bg-transparent border-b border-stranger-red py-2 text-white outline-none focus:border-white"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase mb-1 tracking-widest text-gray-400">Email (Optional)</label>
            <input
              type="email"
              className="w-full bg-transparent border-b border-stranger-red p-2 text-white outline-none focus:border-white"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 mt-8 bg-stranger-red text-black uppercase tracking-widest font-bold hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? 'PROCESSING...' : 'INITIALIZE SUBJECT'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="text-gray-500 hover:text-white transition-colors uppercase tracking-widest">
            &lt; Return to Gate
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
