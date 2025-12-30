import React from 'react';
import { GoogleGenAI } from "@google/genai";
import { useAppState } from '../context/AppState';

const RitualOracle: React.FC = () => {
  const { nftBalance, tokenBalance, stakingBalance, isConnected } = useAppState();
  const [oracleMsg, setOracleMsg] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const consultOracle = async () => {
    if (!isConnected) return;
    
    // API_KEY is injected by the environment.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setOracleMsg("The Ritual Altar requires an essence key to function.");
      return;
    }

    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are the MeeBot Ritual Oracle. Analyze the following blockchain soul state:
      - MTK Balance: ${tokenBalance}
      - NFT Count: ${nftBalance}
      - Staked Guardians: ${stakingBalance}
      Provide a short (2-3 sentences), mystical, and encouraging ritual prediction for this user. Speak like a wise digital wizard.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setOracleMsg(response.text || "The digital mists are too thick to read today...");
    } catch (error) {
      console.error("Oracle Error:", error);
      setOracleMsg("The Ritual Altar is vibrating with unknown energy. Try again soon.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) return null;

  return (
    <div className="ritual-card rounded-[2rem] p-6 border border-indigo-500/30 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
        <span className="text-6xl">🔮</span>
      </div>
      
      <h3 className="text-xl font-black ritual-font text-indigo-300 mb-4 flex items-center">
        <span className="mr-2 animate-pulse">✨</span> Ritual Oracle
      </h3>

      <div className="min-h-[80px] flex items-center justify-center text-center italic text-slate-300 font-medium">
        {isLoading ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs uppercase tracking-tighter">Consulting the Matrix...</p>
          </div>
        ) : oracleMsg ? (
          <p className="animate-fadeText">"{oracleMsg}"</p>
        ) : (
          <p className="text-slate-500">The Oracle awaits your call.</p>
        )}
      </div>

      <button
        onClick={consultOracle}
        disabled={isLoading}
        className="mt-6 w-full py-3 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/30 rounded-2xl font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
      >
        {oracleMsg ? "Re-consult Oracle" : "Consult the Oracle"}
      </button>
    </div>
  );
};

export default RitualOracle;