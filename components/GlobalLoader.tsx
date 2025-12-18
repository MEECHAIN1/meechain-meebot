
import React from 'react';
import { useAppState } from '../context/AppState';

const GlobalLoader: React.FC = () => {
  const { loading } = useAppState();

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm transition-all duration-500">
      <div className="relative">
        {/* Outer Glow */}
        <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-2xl animate-pulse"></div>
        
        {/* Spinner Ring */}
        <div className="w-24 h-24 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
        
        {/* Center Icon/Text */}
        <div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce">
          ⚡
        </div>
      </div>
      
      <h2 className="mt-8 text-2xl font-bold text-white tracking-widest animate-pulse">
        CONDUCTING RITUAL...
      </h2>
      <p className="mt-2 text-slate-400 text-sm font-medium uppercase tracking-[0.2em]">
        Connecting to the MeeChain matrix
      </p>
    </div>
  );
};

export default GlobalLoader;