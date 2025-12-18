import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAccount } from 'wagmi';
import Navbar from './components/Navbar';
import NetworkBanner from './components/NetworkBanner';
import GlobalLoader from './components/GlobalLoader';
import DashboardPage from './pages/DashboardPage';
import EventLogPage from './pages/EventLogPage';
import GalleryPage from './pages/GalleryPage';
import StakingPage from './pages/StakingPage';
import { useAppState } from './context/AppState';
import { publicClient } from './lib/viemClient';
import { watchNftEvents } from './lib/services/nft';
import { watchStakingEvents } from './lib/services/staking';
import { watchTokenEvents } from './lib/services/tokenEvents';

const EventWatcher: React.FC = () => {
  const { addEvent } = useAppState();

  React.useEffect(() => {
    const unwatchNft = watchNftEvents(publicClient, addEvent);
    const unwatchStaking = watchStakingEvents(publicClient, addEvent);
    const unwatchToken = watchTokenEvents(publicClient, addEvent);

    return () => {
      unwatchNft();
      unwatchStaking();
      unwatchToken();
    };
  }, [addEvent]);

  return null;
};

const LoadingSynchronizer: React.FC = () => {
  const { isConnecting } = useAccount();
  const { setLoading } = useAppState();

  React.useEffect(() => {
    if (isConnecting) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [isConnecting, setLoading]);

  return null;
};

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col selection:bg-blue-500/30">
      <GlobalLoader />
      <LoadingSynchronizer />
      <NetworkBanner />
      <Navbar />
      <main className="flex-grow py-8 relative">
        <EventWatcher />
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/staking" element={<StakingPage />} />
          <Route path="/events" element={<EventLogPage />} />
          <Route path="*" element={<h2 className="text-white text-3xl text-center mt-20 font-black">404 - LOST IN DIMENSION</h2>} />
        </Routes>
      </main>
      <footer className="p-8 text-center text-slate-600 text-xs border-t border-slate-800/50 mt-12">
        &copy; {new Date().getFullYear()} MeeChain MeeBot Altar. Powering the decentralized future.
      </footer>
    </div>
  );
};

export default App;