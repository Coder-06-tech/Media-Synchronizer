import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Events from './pages/Events';
import InitialFriends from './pages/InitialFriends';
import FriendsPage from './pages/FriendsPage';
import ProfileDetails from './pages/ProfileDetails';
import WatchRoom from './pages/WatchRoom';
import NotificationsPage from './pages/NotificationsPage';

function App() {
  return (
    <div className="min-h-screen crt relative bg-stranger-bg font-retro overflow-x-hidden text-red-500">
      <div className="particles"></div>
      <Navbar />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/setup-friends" element={<InitialFriends />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/profile/:id" element={<ProfileDetails />} />
          <Route path="/room/:roomId" element={<WatchRoom />} />
          <Route path="/events" element={<Events />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
