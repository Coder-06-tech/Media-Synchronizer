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
    if (isAuthenticated) {
      fetchUnreadCount();
      
      socket.on('new_notification', () => {
        setUnreadCount(prev => prev + 1);
      });
    }

    return () => {
      socket.off('new_notification');
    };
  }, [isAuthenticated]);

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
    <nav className="bg-[#050000] border-b border-stranger-red shadow-[0_0_20px_rgba(255,0,0,0.3)] sticky top-0 z-50" style={{ backgroundImage: 'linear-gradient(rgba(255, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 0, 0, 0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      <div className="container mx-auto px-4 py-3 flex justify-between items-center relative z-10">
        <Link to="/" className="text-2xl font-bold tracking-widest text-stranger-red drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] uppercase flex items-center gap-2">
          <MonitorPlay size={28} />
          Cerebro Sync
        </Link>
        
        {isAuthenticated && user ? (
          <div className="flex items-center gap-6">
             <Link to="/friends" className="flex flex-col items-center text-stranger-red hover:text-[#fff] hover:drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] transition-all">
              <Users size={20} />
              <span className="text-xs mt-1 tracking-widest uppercase">Friends</span>
            </Link>
            <Link to="/events" className="flex flex-col items-center text-stranger-red hover:text-[#fff] hover:drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] transition-all">
              <Calendar size={20} />
              <span className="text-xs mt-1 tracking-widest uppercase">Events</span>
            </Link>
            <Link to="/notifications" className="flex flex-col items-center text-stranger-red hover:text-[#fff] hover:drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] transition-all relative">
              <Bell size={20} />
              <span className="text-xs mt-1 tracking-widest uppercase">Signals</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-stranger-red text-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse border border-stranger-red font-bold shadow-[0_0_10px_rgba(255,0,0,0.8)]">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link to="/profile" className="flex flex-col items-center text-stranger-red hover:text-[#fff] hover:drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] transition-all">
              <User size={20} />
              <span className="text-xs mt-1 tracking-widest uppercase">Profile</span>
            </Link>
            <button 
              onClick={handleLogout}
              className="flex flex-col items-center text-stranger-red hover:text-[#fff] hover:drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] transition-all"
            >
              <LogOut size={20} />
              <span className="text-xs mt-1 tracking-widest uppercase">Escape</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-4">
            <Link to="/login" className="px-4 py-2 border border-stranger-red text-stranger-red hover:bg-[rgba(255,0,0,0.1)] hover:shadow-[inset_0_0_10px_rgba(255,0,0,0.3)] transition-all uppercase text-sm tracking-widest font-bold">
              Login
            </Link>
            <Link to="/register" className="px-4 py-2 bg-transparent border border-stranger-red text-stranger-red hover:bg-stranger-red hover:text-black hover:shadow-[0_0_15px_rgba(255,0,0,0.8)] transition-all uppercase text-sm tracking-widest font-bold">
              Join Club
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
