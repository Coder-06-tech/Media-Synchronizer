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
    <nav className="glass-card border-b border-stranger-red/30 sticky top-0 z-50 backdrop-blur-xl">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="group flex items-center gap-3">
          <div className="relative">
            <MonitorPlay size={32} className="text-stranger-red drop-shadow-[0_0_8px_rgba(229,9,20,0.8)] group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute -inset-1 bg-stranger-red/20 blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <span className="hidden md:block stranger-title text-xl">Cerebro Sync</span>
        </Link>
        
        {isAuthenticated && user ? (
          <div className="flex items-center gap-8">
             <Link to="/friends" className="flex flex-col items-center group text-gray-400 hover:text-stranger-red transition-all duration-300">
              <Users size={22} className="group-hover:translate-y-[-2px] transition-transform" />
              <span className="text-[10px] mt-1 font-orbitron tracking-widest uppercase">Network</span>
            </Link>
            <Link to="/events" className="flex flex-col items-center group text-gray-400 hover:text-stranger-red transition-all duration-300">
              <Calendar size={22} className="group-hover:translate-y-[-2px] transition-transform" />
              <span className="text-[10px] mt-1 font-orbitron tracking-widest uppercase">Archive</span>
            </Link>
            <Link to="/profile" className="flex flex-col items-center group text-gray-400 hover:text-stranger-red transition-all duration-300">
              <User size={22} className="group-hover:translate-y-[-2px] transition-transform" />
              <span className="text-[10px] mt-1 font-orbitron tracking-widest uppercase">Agent</span>
            </Link>
            <button 
              onClick={handleLogout}
              className="flex flex-col items-center group text-red-900 hover:text-red-500 transition-all duration-300"
            >
              <LogOut size={22} className="group-hover:rotate-12 transition-transform" />
              <span className="text-[10px] mt-1 font-orbitron tracking-widest uppercase">Terminate</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-6 items-center">
            <Link to="/login" className="font-orbitron text-xs tracking-[0.2em] text-gray-400 hover:text-white transition-all uppercase px-2 py-1">
              Access
            </Link>
            <Link to="/register" className="relative group px-6 py-2 bg-stranger-red text-black font-orbitron uppercase text-[10px] tracking-[0.2em] font-black hover:bg-white transition-all duration-500 overflow-hidden">
              <span className="relative z-10">Initialize Record</span>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
