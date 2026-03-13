import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { LogOut, User, Users, Calendar, Video, MonitorPlay } from 'lucide-react';
import { socket } from '../socket/socketClient';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    socket.disconnect();
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-black/90 border-b-2 border-stranger-red sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold tracking-widest text-stranger-red neon-text uppercase flex items-center gap-2">
          <MonitorPlay size={28} />
          Cerebro Sync
        </Link>
        
        {isAuthenticated && user ? (
          <div className="flex items-center gap-6">
             <Link to="/friends" className="flex flex-col items-center hover:text-white transition-colors">
              <Users size={20} />
              <span className="text-xs mt-1">Friends</span>
            </Link>
            <Link to="/events" className="flex flex-col items-center hover:text-white transition-colors">
              <Calendar size={20} />
              <span className="text-xs mt-1">Events</span>
            </Link>
            <Link to="/profile" className="flex flex-col items-center hover:text-white transition-colors">
              <User size={20} />
              <span className="text-xs mt-1">Profile</span>
            </Link>
            <button 
              onClick={handleLogout}
              className="flex flex-col items-center hover:text-white transition-colors"
            >
              <LogOut size={20} />
              <span className="text-xs mt-1">Escape</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-4">
            <Link to="/login" className="px-4 py-2 border border-stranger-red text-stranger-red hover:bg-stranger-red hover:text-black transition-colors uppercase text-sm tracking-wider">
              Login
            </Link>
            <Link to="/register" className="px-4 py-2 bg-stranger-red text-black hover:bg-white transition-colors uppercase text-sm tracking-wider">
              Join Club
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
