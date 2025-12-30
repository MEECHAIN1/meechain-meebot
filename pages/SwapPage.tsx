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
      setError(`Failed to fetch data: ${e.shortMessage || e.message}`);
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
    if (!walletClient || !account || !ADRS.token || !ADRS.swap) {
      setError("Wallet not connected or contract addresses missing.");
      return;
    }
    setIsApproving(true);
    incrementLoading();
    setError(null);
    try {
      const { hash } = await approveToken(walletClient, ADRS.swap, parseUnits("1000000000000000000000000", tokenDecimals), account);
      addEvent({
        timestamp: new Date().toISOString(),
        contract: 'token',
        event: 'Approval (Swap)',
        args: { spender: ADRS.swap, amount: 'Unlimited' },
        transactionHash: hash,
      });
      await fetchData();
    } catch (e: any) {
      setError(`Approval failed: ${e.shortMessage || e.message}`);
    } finally {
      setIsApproving(false);
      decrementLoading();
    }
  };

  const handleSwap = async () => {
    if (!walletClient || !account || !ADRS.token || !ADRS.swap || !amountFrom || parseFloat(amountFrom) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (parseFloat(appTokenBalance) < parseFloat(amountFrom)) {
      setError("Insufficient MTK balance.");
      return;
    }

    const amountToSwapBigInt = parseUnits(amountFrom, tokenDecimals);
    if (mtkAllowance < amountToSwapBigInt) {
      setError("MTK not approved. Please approve first.");
      return;
    }

    setIsSwapping(true);
    incrementLoading();
    setError(null);

    try {
      const currentBlock = await publicClient.getBlock({ blockTag: 'latest' });
      const deadline = currentBlock.timestamp + BigInt(60 * 20);

      const estimatedOutEth = parseFloat(estimatedAmountTo);
      const amountOutMinEth = estimatedOutEth * (1 - slippage / 100);
      const amountOutMinBigInt = parseEther(amountOutMinEth.toFixed(18));

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
          event: 'Tokens Swapped',
          args: {
            from: 'MTK',
            to: 'ETH',
            amountIn: amountFrom,
            amountOut: estimatedAmountTo,
          },
          transactionHash: result.hash,
        });

        if (jsConfetti) {
          jsConfetti.addConfetti({
            emojis: ['💱', '🚀', '🌈'],
            confettiNumber: 100,
          });
        }

        setAmountFrom('');
        setEstimatedAmountTo('0');
        await fetchData();
      }

    } catch (e: any) {
      setError(`Swap failed: ${e.shortMessage || e.message}`);
    } finally {
      setIsSwapping(false);
      decrementLoading();
    }
  };

  const amountToSwapNum = parseFloat(amountFrom || '0');
  const hasEnoughMtk = parseFloat(appTokenBalance) >= amountToSwapNum;
  const isMtkApproved = mtkAllowance >= parseUnits(amountFrom || '0', tokenDecimals);
  const isInputValid = amountFrom && !isNaN(amountToSwapNum) && amountToSwapNum > 0;

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-lg">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic ritual-gradient-text">
              MeeSwap <span className="text-pink-500">v1</span>
            </h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Interdimensional Exchange</p>
          </div>
          <div className="text-right">
             <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${isConnected ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400 animate-pulse'}`}>
                {isConnected ? 'Connected' : 'Offline'}
             </div>
          </div>
        </header>

        {error && (
          <div className="bg-red-900/40 border border-red-500/50 backdrop-blur-md p-4 rounded-2xl text-red-200 mb-6 flex items-start space-x-3 shadow-xl animate-shake">
            <span className="text-xl">⚠️</span>
            <div className="flex-1 text-sm font-medium">{error}</div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white">✕</button>
          </div>
        )}

        <div className="ritual-card rounded-[2.5rem] shadow-2xl p-2 border border-slate-700/50">
          <div className="p-6 space-y-4">
            
            {/* Input Section */}
            <div className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800 hover:border-indigo-500/30 transition-all group">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pay With</span>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 text-xs font-medium">Balance: {parseFloat(appTokenBalance).toLocaleString()} MTK</span>
                  <button 
                    onClick={handleMax}
                    className="text-indigo-400 hover:text-indigo-300 text-xs font-black uppercase bg-indigo-500/10 px-2 py-0.5 rounded-md transition-colors"
                  >
                    Max
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  value={amountFrom}
                  onChange={handleAmountChange}
                  placeholder="0.0"
                  className="flex-1 bg-transparent border-none text-white text-3xl font-bold placeholder-slate-700 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  disabled={isSwapping}
                />
                <div className="flex items-center space-x-2 bg-slate-800 px-4 py-2 rounded-2xl border border-slate-700 shadow-inner">
                  <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg">M</div>
                  <span className="text-white font-bold tracking-tight">MTK</span>
                </div>
              </div>
            </div>

            {/* Direction Indicator */}
            <div className="relative h-4 flex justify-center items-center">
              <div className="absolute bg-slate-800 border-4 border-slate-950 p-2 rounded-xl shadow-xl hover:scale-110 transition-transform cursor-pointer z-10 group">
                <div className="w-6 h-6 bg-slate-700 group-hover:bg-indigo-600 rounded-lg flex items-center justify-center text-slate-300 group-hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
              <div className="w-full h-[1px] bg-slate-800"></div>
            </div>

            {/* Output Section */}
            <div className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800 hover:border-pink-500/30 transition-all">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Receive (Estimated)</span>
                <span className="text-slate-400 text-xs font-medium">Balance: {parseFloat(nativeBalance).toFixed(4)} ETH</span>
              </div>
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  value={estimatedAmountTo}
                  readOnly
                  placeholder="0.0"
                  className="flex-1 bg-transparent border-none text-white text-3xl font-bold placeholder-slate-700 focus:outline-none cursor-default"
                />
                <div className="flex items-center space-x-2 bg-slate-800 px-4 py-2 rounded-2xl border border-slate-700 shadow-inner">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg">Ξ</div>
                  <span className="text-white font-bold tracking-tight">ETH</span>
                </div>
              </div>
            </div>

            {/* Swap Details Card */}
            {isInputValid && (
              <div className="p-5 bg-slate-950/40 rounded-3xl space-y-3 border border-slate-800/50 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Exchange Rate</span>
                  <button 
                    onClick={() => setInvertedRate(!invertedRate)}
                    className="text-indigo-400 text-xs font-mono font-bold hover:text-indigo-300 bg-indigo-500/5 px-2 py-1 rounded-lg transition-all border border-indigo-500/10 flex items-center"
                  >
                    <span className="mr-2">
                      {invertedRate 
                        ? `1 ETH = ${(1/MTK_TO_ETH_RATE).toLocaleString()} MTK` 
                        : `1 MTK = ${MTK_TO_ETH_RATE} ETH`}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Price Impact</span>
                  <span className="text-green-400 text-xs font-bold">~0.01%</span>
                </div>

                <div className="flex justify-between items-center">
                   <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Slippage Tolerance</span>
                   <div className="flex items-center space-x-2">
                     <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                        {[0.1, 0.5, 1.0].map((v) => (
                           <button 
                             key={v}
                             onClick={() => setSlippage(v)}
                             className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all ${slippage === v ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                           >
                             {v}%
                           </button>
                        ))}
                     </div>
                     <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 px-2 py-1">
                        <input 
                          type="number" 
                          value={slippage}
                          onChange={(e) => setSlippage(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                          className="w-10 bg-transparent text-pink-400 text-[10px] font-black text-center focus:outline-none"
                        />
                        <span className="text-slate-600 text-[8px] font-black">%</span>
                     </div>
                   </div>
                </div>

                <div className="pt-2 border-t border-slate-800/50 flex justify-between items-center">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Min. Received</span>
                  <span className="text-white text-xs font-mono font-bold">
                    {(parseFloat(estimatedAmountTo) * (1 - slippage / 100)).toFixed(8)} ETH
                  </span>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              {!isConnected ? (
                <div className="w-full py-4 bg-slate-800 text-slate-500 text-center rounded-3xl font-black uppercase tracking-widest italic border border-slate-700">
                  Connect Wallet to Swap
                </div>
              ) : !isInputValid ? (
                <button disabled className="w-full py-5 bg-slate-800/50 text-slate-600 rounded-3xl font-black uppercase tracking-widest border border-slate-800 cursor-not-allowed">
                  Enter an Amount
                </button>
              ) : !hasEnoughMtk ? (
                <button disabled className="w-full py-5 bg-red-900/20 text-red-500/50 rounded-3xl border border-red-900/50 font-black uppercase tracking-widest cursor-not-allowed">
                  Insufficient MTK Balance
                </button>
              ) : !isMtkApproved ? (
                <button 
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-indigo-900/40 transition-all active:scale-95 flex items-center justify-center space-x-3 group"
                >
                  {isApproving ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Approving...</span>
                    </>
                  ) : (
                    <>
                      <span>Unlock Ritual Essence</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </>
                  )}
                </button>
              ) : (
                <button 
                  onClick={handleSwap}
                  disabled={isSwapping}
                  className="w-full py-5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:brightness-110 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-pink-900/40 transition-all active:scale-95 flex items-center justify-center space-x-3"
                >
                  {isSwapping ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Transmuting...</span>
                    </>
                  ) : (
                    <>
                      <span>Shift Reality</span>
                      <span className="animate-pulse">✨</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-8 grid grid-cols-2 gap-4">
           <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Fee Tier</p>
              <p className="text-white font-bold text-sm">0.3% Ritual Tax</p>
           </div>
           <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Execution</p>
              <p className="text-indigo-400 font-bold text-sm">Instant Matrix</p>
           </div>
        </div>

        <div className="mt-8 text-center">
           <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">
             Powered by MeeChain Swap Protocol v1.0.4
           </p>
        </div>
      </div>
    </div>
  );
};

export default SwapPage;