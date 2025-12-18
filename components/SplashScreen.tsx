import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-black animate-splashFade">
      <div className="relative">
        {/* Stylized M Logo */}
        <div className="text-9xl md:text-[10rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 animate-pulse animate-scaleIn">
          M
        </div>
        {/* Subtle glow behind M */}
        <div className="absolute inset-0 -m-2 rounded-full bg-blue-500/30 blur-xl opacity-0 animate-pulseGlowSlow"></div>
      </div>
      <p className="mt-8 text-xl md:text-2xl font-semibold text-slate-300 animate-fadeText">
        MeeChain MeeBot
      </p>
    </div>
  );
};

export default SplashScreen;