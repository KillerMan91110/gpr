import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './pages/NotFound';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Zones from './pages/Zones';
import Ranking from './pages/Ranking';
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
import GuildEvolutionMaster from './pages/GuildEvolutionMaster';
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
import WorldBoss from './pages/WorldBoss';
import WorldBossShop from './pages/WorldBossShop';
import DailyEvent from './pages/DailyEvent';
import AdminMonsters from './pages/AdminMonsters';
import AdminItems from './pages/AdminItems';
import CoopBar from './components/CoopBar';
import ChatBox from './components/ChatBox';
import IncubatorAlert from './components/IncubatorAlert';
import BackgroundMusic from './components/BackgroundMusic';
import TutorialTour from './components/TutorialTour';
import NavBar from './components/NavBar';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <NavBar />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<Home />} />
              <Route path="/quests" element={<ProtectedRoute><MyQuests /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/combat" element={<ProtectedRoute><Zones /></ProtectedRoute>} />
              <Route path="/combat/:zoneId" element={<ProtectedRoute><ExploreZone /></ProtectedRoute>} />
              <Route path="/ranks" element={<ProtectedRoute><Ranks /></ProtectedRoute>} />
              <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />
              <Route path="/guild" element={<ProtectedRoute><Guild /></ProtectedRoute>} />
              <Route path="/guild/masters" element={<ProtectedRoute><GuildMasters /></ProtectedRoute>} />
              <Route path="/guild/masters/:classId" element={<ProtectedRoute><GuildMasterDetail /></ProtectedRoute>} />
              <Route path="/guild/adventurers" element={<ProtectedRoute><GuildAdventurers /></ProtectedRoute>} />
              <Route path="/guild/infirmary" element={<ProtectedRoute><Infirmary /></ProtectedRoute>} />
              <Route path="/guild/quests" element={<ProtectedRoute><GuildQuests /></ProtectedRoute>} />
              <Route path="/guild/create" element={<ProtectedRoute><GuildCreate /></ProtectedRoute>} />
              <Route path="/guild/join" element={<ProtectedRoute><GuildJoin /></ProtectedRoute>} />
              <Route path="/guild/my" element={<ProtectedRoute><GuildMy /></ProtectedRoute>} />
            <Route path="/guild/my/masters/:masterId" element={<ProtectedRoute><GuildEvolutionMaster /></ProtectedRoute>} />
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
              <Route path="/abismo" element={<ProtectedRoute><Tower /></ProtectedRoute>} />
              <Route path="/abismo/vendor" element={<ProtectedRoute><TowerVendor /></ProtectedRoute>} />
              <Route path="/worldboss" element={<ProtectedRoute><WorldBoss /></ProtectedRoute>} />
              <Route path="/worldboss/shop" element={<ProtectedRoute><WorldBossShop /></ProtectedRoute>} />
              <Route path="/daily-event" element={<ProtectedRoute><DailyEvent /></ProtectedRoute>} />
              <Route path="/admin/monsters" element={<ProtectedRoute><AdminMonsters /></ProtectedRoute>} />
              <Route path="/admin/items" element={<ProtectedRoute><AdminItems /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CoopBar />
            <ChatBox />
            <IncubatorAlert />
            <BackgroundMusic />
            <TutorialTour />
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
