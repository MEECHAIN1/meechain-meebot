import React from 'react';
import { useAppState } from '../context/AppState';
import { useAccount, useWalletClient } from 'wagmi';
import { Address, formatUnits, parseUnits, parseEther } from 'viem';
import { getTokenDecimals, approveToken, getTokenAllowance } from '../lib/services/token';
import { swapExactMTKForETH } from '../lib/services/swap';
import { ADRS } from '../lib/contracts';
import { publicClient } from '../lib/viemClient';
import JSConfetti from 'js-confetti';

const MTK_TO_ETH_RATE = 0.0001; 

const SwapPage: React.FC = () => {
  const {
    account,
    isConnected,
    tokenBalance: appTokenBalance,
    addEvent,
    setError,
    loading,
    error,
    incrementLoading,
    decrementLoading,
  } = useAppState();
  const { data: walletClient } = useWalletClient();
  const { chain } = useAccount();

  const [amountFrom, setAmountFrom] = React.useState<string>('');
  const [estimatedAmountTo, setEstimatedAmountTo] = React.useState<string>('0');
  const [tokenDecimals, setTokenDecimals] = React.useState<number>(18);
  const [nativeBalance, setNativeBalance] = React.useState<string>('0');
  const [mtkAllowance, setMtkAllowance] = React.useState<bigint>(0n);
  const [slippage, setSlippage] = React.useState<number>(0.5);
  const [invertedRate, setInvertedRate] = React.useState<boolean>(false);

  const [isApproving, setIsApproving] = React.useState(false);
  const [isSwapping, setIsSwapping] = React.useState(false);
  
  const jsConfetti = React.useMemo(() => {
    try {
      return new JSConfetti();
    } catch (e) {
      return null;
    }
  }, []);

  const fetchData = React.useCallback(async () => {
    if (!account || !isConnected || !chain) {
      setNativeBalance("0");
      setMtkAllowance(0n);
      return;
    }

    incrementLoading();
    setError(null);

    try {
      const decimals = await getTokenDecimals();
      setTokenDecimals(decimals);

      const [currentNativeBalance, allowance] = await Promise.all([
        publicClient.getBalance({ address: account }),
        getTokenAllowance(account, ADRS.swap as Address),
      ]);

      setNativeBalance(formatUnits(currentNativeBalance, 18));
      setMtkAllowance(allowance);

    } catch (e: any) {
      console.error("Error fetching swap data:", e);
      setError(`Matrix connection weak: ${e.shortMessage || e.message}`);
    } finally {
      decrementLoading();
    }
  }, [account, isConnected, chain, incrementLoading, decrementLoading, setError]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData, appTokenBalance]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmountFrom(value);
    calculateEstimate(value);
  };

  const calculateEstimate = (value: string) => {
    if (value && !isNaN(Number(value)) && parseFloat(value) >= 0) {
      const mtkAmount = parseFloat(value);
      const ethEquivalent = mtkAmount * MTK_TO_ETH_RATE;
      setEstimatedAmountTo(ethEquivalent.toFixed(8));
    } else {
      setEstimatedAmountTo('0');
    }
  };

  const handleMax = () => {
    setAmountFrom(appTokenBalance);
    calculateEstimate(appTokenBalance);
  };

  const handleApprove = async () => {
    if (!walletClient || !account || !ADRS.token || !ADRS.swap) return;
    setIsApproving(true);
    incrementLoading();
    setError(null);
    try {
      const { hash } = await approveToken(walletClient, ADRS.swap, parseUnits("1000000000000000000000000", tokenDecimals), account);
      addEvent({
        timestamp: new Date().toISOString(),
        contract: 'token',
        event: 'Portal Unlocked',
        args: { spender: ADRS.swap, amount: 'Unlimited Ritual Access' },
        transactionHash: hash,
      });
      await fetchData();
    } catch (e: any) {
      setError(`Unlock failed: ${e.shortMessage || e.message}`);
    } finally {
      setIsApproving(false);
      decrementLoading();
    }
  };

  const handleSwap = async () => {
    if (!walletClient || !account || !ADRS.swap || !amountFrom || parseFloat(amountFrom) <= 0) {
      setError("Provide essence for the shift.");
      return;
    }

    const amountToSwapBigInt = parseUnits(amountFrom, tokenDecimals);
    if (mtkAllowance < amountToSwapBigInt) {
      setError("Ritual not authorized. Unlock MTK first.");
      return;
    }

    setIsSwapping(true);
    incrementLoading();
    setError(null);

    try {
      const currentBlock = await publicClient.getBlock({ blockTag: 'latest' });
      const deadline = currentBlock.timestamp + BigInt(60 * 20);

      const minOutEth = parseFloat(estimatedAmountTo) * (1 - slippage / 100);
      const amountOutMinBigInt = parseEther(minOutEth.toFixed(18));

      const result = await swapExactMTKForETH(
        walletClient,
        account,
        amountToSwapBigInt,
        amountOutMinBigInt,
        account,
        deadline
      );

      if (result) {
        addEvent({
          timestamp: new Date().toISOString(),
          contract: 'swap',
          event: 'Dimensional Shift',
          args: { in: amountFrom + ' MTK', out: estimatedAmountTo + ' ETH' },
          transactionHash: result.hash,
        });

        jsConfetti?.addConfetti({ emojis: ['✨', '🌌', '⚖️'] });
        setAmountFrom('');
        setEstimatedAmountTo('0');
        await fetchData();
      }
    } catch (e: any) {
      setError(`Shift failed: ${e.shortMessage || e.message}`);
    } finally {
      setIsSwapping(false);
      decrementLoading();
    }
  };

  const isInputValid = amountFrom && parseFloat(amountFrom) > 0;
  const hasEnoughMtk = parseFloat(appTokenBalance) >= parseFloat(amountFrom || '0');
  const isApproved = mtkAllowance >= parseUnits(amountFrom || '0', tokenDecimals);

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-6">
        <header className="text-center">
          <h1 className="text-4xl font-black ritual-font tracking-tighter uppercase italic ritual-gradient-text">
            Essence Shift
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Transmute MTK to ETH</p>
        </header>

        {error && (
          <div className="bg-red-900/40 border border-red-500/50 backdrop-blur-md p-4 rounded-2xl text-red-200 text-sm text-center animate-shake">
            {error}
          </div>
        )}

        <div className="ritual-card rounded-[2.5rem] p-6 border border-slate-700/50 space-y-4">
          {/* Input MTK */}
          <div className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Ritual Essence</span>
              <button onClick={handleMax} className="text-indigo-400 text-[10px] font-black uppercase bg-indigo-500/10 px-2 py-0.5 rounded-md hover:bg-indigo-500/20 transition-all">Max: {parseFloat(appTokenBalance).toFixed(2)}</button>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                value={amountFrom}
                onChange={handleAmountChange}
                placeholder="0.0"
                className="flex-1 bg-transparent border-none text-white text-3xl font-bold placeholder-slate-700 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-2xl border border-slate-700">
                <span className="text-xs font-black text-indigo-400">MTK</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center -my-2 relative z-10">
            <div className="bg-slate-800 border-4 border-slate-950 p-2 rounded-2xl shadow-xl text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            </div>
          </div>

          {/* Output ETH */}
          <div className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Manifested Value</span>
              <span className="text-slate-400 text-[10px] font-medium">Balance: {parseFloat(nativeBalance).toFixed(4)}</span>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={estimatedAmountTo}
                readOnly
                placeholder="0.0"
                className="flex-1 bg-transparent border-none text-white text-3xl font-bold placeholder-slate-700"
              />
              <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-2xl border border-slate-700">
                <span className="text-xs font-black text-blue-400">ETH</span>
              </div>
            </div>
          </div>

          {/* Details & Slippage */}
          {isInputValid && (
            <div className="p-4 bg-slate-950/40 rounded-3xl space-y-3 border border-slate-800/50 text-[11px] font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Exchange Rate</span>
                <button onClick={() => setInvertedRate(!invertedRate)} className="text-indigo-300 hover:text-white transition-colors">
                  {invertedRate ? `1 ETH = ${(1/MTK_TO_ETH_RATE).toLocaleString()} MTK` : `1 MTK = ${MTK_TO_ETH_RATE} ETH`}
                </button>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Slippage Tolerance</span>
                <div className="flex items-center space-x-2">
                  <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                    {[0.1, 0.5, 1.0].map(v => (
                      <button key={v} onClick={() => setSlippage(v)} className={`px-2 py-0.5 rounded-md text-[9px] transition-all ${slippage === v ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{v}%</button>
                    ))}
                  </div>
                  <input 
                    type="number" 
                    value={slippage} 
                    onChange={e => setSlippage(Math.max(0, parseFloat(e.target.value) || 0))} 
                    className="w-10 bg-slate-900 border border-slate-800 rounded px-1 text-center text-pink-400 focus:outline-none" 
                  />
                  <span className="text-slate-600">%</span>
                </div>
              </div>

              <div className="flex justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-500">Minimum Manifested</span>
                <span className="text-white">{(parseFloat(estimatedAmountTo) * (1 - slippage / 100)).toFixed(8)} ETH</span>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            {!isConnected ? (
              <div className="w-full py-4 bg-slate-800 text-slate-500 text-center rounded-3xl font-black uppercase tracking-widest text-xs italic border border-slate-700">Connect to Shift</div>
            ) : !isInputValid ? (
              <button disabled className="w-full py-5 bg-slate-800/50 text-slate-600 rounded-3xl font-black uppercase tracking-widest text-xs border border-slate-800 cursor-not-allowed">Enter Amount</button>
            ) : !hasEnoughMtk ? (
              <button disabled className="w-full py-5 bg-red-900/20 text-red-500/50 rounded-3xl border border-red-900/50 font-black uppercase tracking-widest text-xs cursor-not-allowed">Insufficient Essence</button>
            ) : !isApproved ? (
              <button onClick={handleApprove} disabled={isApproving} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-900/40 transition-all active:scale-95 flex items-center justify-center space-x-2">
                {isApproving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Unlocking...</span></> : "Authorize Shift"}
              </button>
            ) : (
              <button onClick={handleSwap} disabled={isSwapping} className="w-full py-5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:brightness-110 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-pink-900/40 transition-all active:scale-95 flex items-center justify-center space-x-2">
                {isSwapping ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Transmuting...</span></> : "Shift Reality ✨"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-slate-700 text-[9px] uppercase font-bold tracking-[0.3em]">MeeChain Swap Protocol v1.0.8</p>
      </div>
    </div>
  );
};

export default SwapPage;