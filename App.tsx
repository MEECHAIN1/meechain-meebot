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
import SwapPage from './pages/SwapPage'; // Import SwapPage
import { useAppState } from './context/AppState';
import { publicClient } from './lib/viemClient';
import { watchNftEvents } from './lib/services/nft';
import { watchStakingEvents } from './lib/services/staking';
import { watchTokenEvents } from './lib/services/tokenEvents';
import SplashScreen from './components/SplashScreen'; // Import SplashScreen

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
  const { incrementLoading, decrementLoading } = useAppState(); // Use new functions

  // Keep track of whether the effect has incremented the loader
  const loaderIncrementedRef = React.useRef(false);

  React.useEffect(() => {
    if (isConnecting && !loaderIncrementedRef.current) {
      incrementLoading();
      loaderIncrementedRef.current = true;
    } else if (!isConnecting && loaderIncrementedRef.current) {
      decrementLoading();
      loaderIncrementedRef.current = false;
    }

    // Cleanup function: ensure decrement is called if the component unmounts
    // while isConnecting was true and the loader was incremented by this effect.
    return () => {
      if (loaderIncrementedRef.current) {
        decrementLoading();
        loaderIncrementedRef.current = false;
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
    }, 3500); // Hide splash screen after 3.5 seconds

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

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
          <Route path="/swap" element={<SwapPage />} /> {/* New Route for SwapPage */}
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