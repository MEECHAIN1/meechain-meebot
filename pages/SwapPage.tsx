import React from 'react';
import { useAppState } from '../context/AppState';
import { useAccount, useWalletClient } from 'wagmi';
import { Address, formatUnits, parseUnits, parseEther, getBlock } from 'viem';
import { getTokenBalance, getTokenDecimals, approveToken, getTokenAllowance } from '../lib/services/token';
import { swapExactMTKForETH } from '../lib/services/swap'; // Import the actual swap function
import { ADRS } from '../lib/contracts';
import { publicClient } from '../lib/viemClient'; // For native balance
import JSConfetti from 'js-confetti';

const MTK_TO_ETH_RATE = 0.0001; // Mock exchange rate: 1 MTK = 0.0001 ETH

const SwapPage: React.FC = () => {
  const {
    account,
    isConnected,
    tokenBalance: appTokenBalance, // MTK balance from app state
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
  const [slippage, setSlippage] = React.useState<number>(0.5); // Default slippage 0.5%

  const [isApproving, setIsApproving] = React.useState(false);
  const [isSwapping, setIsSwapping] = React.useState(false);
  
  const jsConfetti = React.useMemo(() => new JSConfetti(), []);

  // Fetch balances and allowance
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
        getTokenAllowance(account, ADRS.swap!), // Check allowance for the mock swap contract
      ]);

      setNativeBalance(formatUnits(currentNativeBalance, 18)); // Assuming 18 decimals for native token
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, appTokenBalance]); // Re-fetch if MTK balance changes

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmountFrom(value);
    if (value && !isNaN(Number(value))) {
      const mtkAmount = parseFloat(value);
      const ethEquivalent = mtkAmount * MTK_TO_ETH_RATE;
      setEstimatedAmountTo(ethEquivalent.toFixed(6));
    } else {
      setEstimatedAmountTo('0');
    }
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
      // Approve a large amount for the mock swap contract
      const { hash } = await approveToken(walletClient, ADRS.swap, parseUnits("1000000000000000000000000", tokenDecimals), account); // A very large amount
      addEvent({
        timestamp: new Date().toISOString(),
        contract: 'token',
        event: 'Approval (Swap)',
        args: { spender: ADRS.swap, amount: 'Max Amount' },
        transactionHash: hash,
      });
      await fetchData(); // Refresh allowance
    } catch (e: any) {
      console.error("Approval failed:", e);
      setError(`Approval failed: ${e.shortMessage || e.message}`);
    } finally {
      setIsApproving(false);
      decrementLoading();
    }
  };

  const handleSwap = async () => {
    if (!walletClient || !account || !ADRS.token || !ADRS.swap || !amountFrom || parseFloat(amountFrom) <= 0) {
      setError("Wallet not connected, contract addresses missing, or invalid amount.");
      return;
    }
    if (parseFloat(appTokenBalance) < parseFloat(amountFrom)) {
      setError("Insufficient MTK balance.");
      return;
    }

    const amountToSwapBigInt = parseUnits(amountFrom, tokenDecimals);
    if (mtkAllowance < amountToSwapBigInt) {
      setError("MTK not approved for the swap contract. Please approve first.");
      return;
    }

    setIsSwapping(true);
    incrementLoading();
    setError(null);

    try {
      const currentBlock = await publicClient.getBlock({ blockTag: 'latest' });
      const deadline = currentBlock.timestamp + BigInt(60 * 20); // 20 minutes from now

      const estimatedOutEth = parseFloat(estimatedAmountTo);
      const amountOutMinEth = estimatedOutEth * (1 - slippage / 100);
      const amountOutMinBigInt = parseEther(amountOutMinEth.toFixed(18)); // Ensure correct precision for ETH

      const { hash } = await swapExactMTKForETH(
        walletClient,
        account,
        amountToSwapBigInt,
        amountOutMinBigInt,
        account, // 'to' address is the user's account
        deadline
      );

      addEvent({
        timestamp: new Date().toISOString(),
        contract: 'swap',
        event: 'Tokens Swapped',
        args: {
          fromToken: 'MTK',
          toToken: 'ETH',
          amountIn: amountFrom,
          amountOutMin: amountOutMinEth.toFixed(6),
          transactionHash: hash,
        },
        transactionHash: hash,
      });

      jsConfetti.addConfetti({
        emojis: ['💱', '✨', '💸'],
        confettiNumber: 70,
      });

      setAmountFrom('');
      setEstimatedAmountTo('0');
      await fetchData(); // Refresh balances

    } catch (e: any) {
      console.error("Swap failed:", e);
      setError(`Swap failed: ${e.shortMessage || e.message}`);
    } finally {
      setIsSwapping(false);
      decrementLoading();
    }
  };

  const amountToSwap = parseFloat(amountFrom || '0');
  const hasEnoughMtk = parseFloat(appTokenBalance) >= amountToSwap;
  const isMtkApproved = mtkAllowance >= parseUnits(amountFrom || '0', tokenDecimals);
  const isInputValid = amountFrom && !isNaN(amountToSwap) && amountToSwap > 0;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-extrabold text-white mb-8 text-center">💱 Token Swap</h1>

      {loading && <p className="text-blue-400 text-center text-lg mb-4">Loading data...</p>}
      {error && (
        <div className="bg-red-700 p-4 rounded-lg text-white mb-6 text-center">
          Error: {error}
        </div>
      )}

      {!isConnected && (
        <p className="text-slate-400 text-center text-lg">Connect your wallet to swap tokens.</p>
      )}

      {isConnected && (
        <div className="max-w-xl mx-auto bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 space-y-6 border border-gray-700">
          {/* From Token */}
          <div className="bg-gray-700 p-5 rounded-lg border border-gray-600">
            <label htmlFor="amount-from" className="block text-slate-300 text-sm font-semibold mb-2">You pay:</label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                id="amount-from"
                value={amountFrom}
                onChange={handleAmountChange}
                placeholder="0.0"
                className="flex-grow px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isConnected || loading || isSwapping}
              />
              <span className="text-white text-xl font-bold">MTK</span>
            </div>
            <p className="text-sm text-slate-400 mt-2">Balance: {parseFloat(appTokenBalance).toFixed(2)} MTK</p>
            {!hasEnoughMtk && isInputValid && <p className="text-red-400 text-sm mt-1">Insufficient MTK balance.</p>}
          </div>

          {/* Exchange Rate */}
          <div className="text-center text-slate-400 text-md font-medium">
            1 MTK ≈ {MTK_TO_ETH_RATE} ETH (Mock Rate)
          </div>

          {/* To Token */}
          <div className="bg-gray-700 p-5 rounded-lg border border-gray-600">
            <label htmlFor="amount-to" className="block text-slate-300 text-sm font-semibold mb-2">You receive (estimated):</label>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                id="amount-to"
                value={estimatedAmountTo}
                readOnly
                className="flex-grow px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-not-allowed"
                disabled
              />
              <span className="text-white text-xl font-bold">ETH</span>
            </div>
            <p className="text-sm text-slate-400 mt-2">Balance: {parseFloat(nativeBalance).toFixed(4)} ETH</p>
          </div>

          {/* Slippage Tolerance */}
          <div className="bg-gray-700 p-5 rounded-lg border border-gray-600">
            <label htmlFor="slippage" className="block text-slate-300 text-sm font-semibold mb-2">Slippage Tolerance:</label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                id="slippage"
                value={slippage}
                onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
                placeholder="0.5"
                min="0"
                max="100"
                step="0.1"
                className="w-24 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isConnected || loading || isSwapping}
              />
              <span className="text-white text-xl font-bold">%</span>
              <span className="text-sm text-slate-400 flex-grow">
                {isInputValid && `Min. received: ${(parseFloat(estimatedAmountTo) * (1 - slippage / 100)).toFixed(6)} ETH`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {!isMtkApproved && isInputValid && hasEnoughMtk && (
              <button
                onClick={handleApprove}
                disabled={!isConnected || isApproving || loading || !isInputValid || !hasEnoughMtk}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApproving ? 'Approving MTK...' : `Approve MTK for Swap`}
              </button>
            )}

            <button
              onClick={handleSwap}
              disabled={
                !isConnected ||
                isSwapping ||
                loading ||
                !isInputValid ||
                !hasEnoughMtk ||
                !isMtkApproved
              }
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSwapping ? 'Swapping...' : 'Swap Tokens'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwapPage;