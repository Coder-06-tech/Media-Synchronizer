import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { LogOut, User, Users, Calendar, Video, MonitorPlay, Bell } from 'lucide-react';
import { socket } from '../socket/socketClient';
import api from '../api';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUnreadCount();

      // Ensure socket is connected and personal room is joined
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit('setup', user);

      socket.on('new_notification', () => {
        setUnreadCount(prev => prev + 1);
      });

      // Re-join personal room on reconnect
      const handleReconnect = () => {
        socket.emit('setup', user);
      };
      socket.on('connect', handleReconnect);

      return () => {
        socket.off('new_notification');
        socket.off('connect', handleReconnect);
      };
    }
  }, [isAuthenticated, user]);

  const fetchUnreadCount = async () => {
    try {
      const { data } = await api.get('/notifications');
      const count = data.filter(n => !n.read).length;
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  const handleLogout = () => {
    socket.disconnect();
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-[#ffffff] border-b border-[#0056b3]/20 sticky top-0 z-50 backdrop-blur-xl shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center relative z-10">
        <Link to="/" className="group flex items-center gap-3">
          <div className="relative">
            <MonitorPlay size={32} className="text-[#0056b3] drop-shadow-[0_0_8px_rgba(0,86,179,0.3)] group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute -inset-1 bg-[#0056b3]/20 blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <span className="hidden md:block stranger-title text-xl">VideoSync</span>
        </Link>
        
        {isAuthenticated && user ? (
          <div className="flex items-center gap-8">
             <Link to="/friends" className="flex flex-col items-center group text-[#002b5c] hover:text-[#0056b3] transition-all duration-300">
              <Users size={22} className="group-hover:translate-y-[-2px] transition-transform" />
              <span className="text-[10px] mt-1 font-orbitron tracking-widest uppercase font-bold">Friends</span>
            </Link>
            <Link to="/events" className="flex flex-col items-center group text-[#002b5c] hover:text-[#0056b3] transition-all duration-300">
              <Calendar size={22} className="group-hover:translate-y-[-2px] transition-transform" />
              <span className="text-[10px] mt-1 font-orbitron tracking-widest uppercase font-bold">Events</span>
            </Link>
            <Link to="/notifications" className="flex flex-col items-center group text-[#002b5c] hover:text-[#0056b3] transition-all duration-300 relative">
              <Bell size={22} className="group-hover:translate-y-[-2px] transition-transform" />
              <span className="text-[10px] mt-1 font-orbitron tracking-widest uppercase font-bold">Notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-stranger-red text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse border border-stranger-red font-black shadow-[0_0_10px_rgba(0, 86, 179,0.8)]">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link to="/profile" className="flex flex-col items-center group text-[#002b5c] hover:text-[#0056b3] transition-all duration-300">
              <img 
                src={user?.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border border-stranger-red/50 object-cover shadow-[0_0_10px_rgba(0, 86, 179,0.3)]"
              />
              <span className="text-[10px] mt-1 font-orbitron tracking-widest uppercase font-bold">Profile</span>
            </Link>
            <button 
              onClick={handleLogout}
              className="flex flex-col items-center group text-red-600 hover:text-red-500 transition-all duration-300"
            >
              <LogOut size={22} className="group-hover:rotate-12 transition-transform" />
              <span className="text-[10px] mt-1 font-orbitron tracking-widest uppercase font-bold">Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-6 items-center">
            <Link to="/login" className="font-orbitron text-xs tracking-[0.2em] text-slate-700 hover:text-white transition-all uppercase px-2 py-1">
              Login
            </Link>
            <Link to="/register" className="relative group px-6 py-2 bg-stranger-red text-black font-orbitron uppercase text-[10px] tracking-[0.2em] font-black hover:bg-white transition-all duration-500 overflow-hidden">
              <span className="relative z-10">Register</span>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
