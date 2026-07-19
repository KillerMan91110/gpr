import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Zones from './pages/Zones';
import ExploreZone from './pages/ExploreZone';
import Guild from './pages/Guild';
import GuildMasters from './pages/GuildMasters';
import GuildMasterDetail from './pages/GuildMasterDetail';
import GuildAdventurers from './pages/GuildAdventurers';
import Formation from './pages/Formation';
import Pets from './pages/Pets';
import Infirmary from './pages/Infirmary';
import Inventory from './pages/Inventory';
import GuildQuests from './pages/GuildQuests';
import MyQuests from './pages/MyQuests';
import Ranks from './pages/Ranks';
import GuildCreate from './pages/GuildCreate';
import GuildJoin from './pages/GuildJoin';
import GuildMy from './pages/GuildMy';
import GuildEnchant from './pages/GuildEnchant';
import ArtisanShop from './pages/ArtisanShop';
import Market from './pages/Market';
import Crafting from './pages/Crafting';
import Evolutions from './pages/Evolutions';
import Skills from './pages/Skills';
import Achievements from './pages/Achievements';
import Friends from './pages/Friends';
import Tower from './pages/Tower';
import TowerVendor from './pages/TowerVendor';
import CoopBar from './components/CoopBar';
import ChatBox from './components/ChatBox';
import IncubatorAlert from './components/IncubatorAlert';
import NavBar from './components/NavBar';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <NavBar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/quests" element={<ProtectedRoute><MyQuests /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/combat" element={<ProtectedRoute><Zones /></ProtectedRoute>} />
            <Route path="/combat/:zoneId" element={<ProtectedRoute><ExploreZone /></ProtectedRoute>} />
            <Route path="/ranks" element={<ProtectedRoute><Ranks /></ProtectedRoute>} />
            <Route path="/guild" element={<ProtectedRoute><Guild /></ProtectedRoute>} />
            <Route path="/guild/masters" element={<ProtectedRoute><GuildMasters /></ProtectedRoute>} />
            <Route path="/guild/masters/:classId" element={<ProtectedRoute><GuildMasterDetail /></ProtectedRoute>} />
            <Route path="/guild/adventurers" element={<ProtectedRoute><GuildAdventurers /></ProtectedRoute>} />
            <Route path="/guild/infirmary" element={<ProtectedRoute><Infirmary /></ProtectedRoute>} />
            <Route path="/guild/quests" element={<ProtectedRoute><GuildQuests /></ProtectedRoute>} />
            <Route path="/guild/create" element={<ProtectedRoute><GuildCreate /></ProtectedRoute>} />
            <Route path="/guild/join" element={<ProtectedRoute><GuildJoin /></ProtectedRoute>} />
            <Route path="/guild/my" element={<ProtectedRoute><GuildMy /></ProtectedRoute>} />
            <Route path="/guild/enchant" element={<ProtectedRoute><GuildEnchant /></ProtectedRoute>} />
            <Route path="/artisan-shop" element={<ProtectedRoute><ArtisanShop /></ProtectedRoute>} />
            <Route path="/market" element={<ProtectedRoute><Market /></ProtectedRoute>} />
            <Route path="/crafting" element={<ProtectedRoute><Crafting /></ProtectedRoute>} />
            <Route path="/evolutions" element={<ProtectedRoute><Evolutions /></ProtectedRoute>} />
            <Route path="/skills" element={<ProtectedRoute><Skills /></ProtectedRoute>} />
            <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
            <Route path="/formation" element={<ProtectedRoute><Formation /></ProtectedRoute>} />
            <Route path="/pets" element={<ProtectedRoute><Pets /></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
            <Route path="/tower" element={<ProtectedRoute><Tower /></ProtectedRoute>} />
            <Route path="/tower/vendor" element={<ProtectedRoute><TowerVendor /></ProtectedRoute>} />
          </Routes>
          <CoopBar />
          <ChatBox />
          <IncubatorAlert />
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
