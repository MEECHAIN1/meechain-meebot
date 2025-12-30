import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAccount } from 'wagmi';
import Navbar from './components/Navbar';
import NetworkBanner from './components/NetworkBanner';
import GlobalLoader from './components/GlobalLoader';
import { useAppState } from './context/AppState';
import { publicClient } from './lib/viemClient';
import { watchNftEvents } from './lib/services/nft';
import { watchStakingEvents } from './lib/services/staking';
import { watchTokenEvents } from './lib/services/tokenEvents';
import SplashScreen from './components/SplashScreen';

// Direct imports for stability
import DashboardPage from './pages/DashboardPage';
import EventLogPage from './pages/EventLogPage';
import GalleryPage from './pages/GalleryPage';
import StakingPage from './pages/StakingPage';
import SwapPage from './pages/SwapPage';

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
  const { incrementLoading, decrementLoading } = useAppState();

  const loaderIncrementedRef = React.useRef(false);

  React.useEffect(() => {
    if (isConnecting && !loaderIncrementedRef.current) {
      incrementLoading();
      loaderIncrementedRef.current = true;
    } else if (!isConnecting && loaderIncrementedRef.current) {
      decrementLoading();
      loaderIncrementedRef.current = false;
    }

    return () => {
      if (loaderIncrementedRef.current) {
        decrementLoading();
      }
    };
  }, [isConnecting, incrementLoading, decrementLoading]);

  return null;
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col selection:bg-indigo-500/30">
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
          <Route path="/swap" element={<SwapPage />} />
          <Route path="/events" element={<EventLogPage />} />
          <Route path="*" element={<h2 className="text-white text-3xl text-center mt-20 font-black ritual-font">404 - LOST IN DIMENSION</h2>} />
        </Routes>
      </main>
      <footer className="p-8 text-center text-slate-700 text-[10px] uppercase font-bold tracking-[0.5em] border-t border-slate-900 mt-12">
        &copy; {new Date().getFullYear()} MeeChain Ritual Matrix • Protected by Cryptographic Spirits
      </footer>
    </div>
  );
};

export default App;