import React from 'react';
import BalanceCard from '../components/BalanceCard';
import EventStream from '../components/EventStream';
import { useAppState } from '../context/AppState';
import { useAccount, useWalletClient } from 'wagmi';
import { Address, formatUnits, parseUnits } from 'viem';
import { getTokenBalance, getTokenDecimals, approveToken } from '../lib/services/token';
import { getNftBalance } from '../lib/services/nft';
import { getEarned, getRewardRate, getStakedNFTs, stakeNft, claimRewards } from '../lib/services/staking';
import { ADRS } from '../lib/contracts';

const DashboardPage: React.FC = () => {
  const {
    account,
    isConnected,
    nftBalance,
    tokenBalance,
    stakingBalance,
    rewardRate,
    setNftBalance,
    setTokenBalance,
    setStakingBalance,
    setRewardRate,
    addEvent, // Changed from addEventLog
    setLoading, // Changed from setIsLoading
    setError,
    loading, // Changed from isLoading
    error // Directly use error from state
  } = useAppState();
  const { data: walletClient } = useWalletClient();
  const { chain } = useAccount();

  const [tokenDecimals, setTokenDecimals] = React.useState<number>(18);
  const [earnedRewards, setEarnedRewards] = React.useState<bigint>(0n);
  const [stakeAmount, setStakeAmount] = React.useState<string>(''); // For NFT ID
  const [approveAmount, setApproveAmount] = React.useState<string>(''); // For token approval (unused currently)
  const [approving, setApproving] = React.useState(false);
  const [staking, setStaking] = React.useState(false);
  const [claiming, setClaiming] = React.useState(false);

  // Fetch initial data
  const fetchData = React.useCallback(async () => {
    if (!account || !isConnected || !chain) {
      setNftBalance("0");
      setTokenBalance("0");
      setStakingBalance("0");
      setRewardRate("0");
      setEarnedRewards(0n);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const decimals = await getTokenDecimals();
      setTokenDecimals(decimals);

      const [nftBal, tokenBal, stakedBal, rewardRateBigInt, earned] = await Promise.all([
        getNftBalance(account),
        getTokenBalance(account),
        getStakedNFTs(account).then(nfts => BigInt(nfts.length)), // Get count of staked NFTs
        getRewardRate(),
        getEarned(account),
      ]);

      setNftBalance(nftBal.toString());
      setTokenBalance(formatUnits(tokenBal, decimals));
      setStakingBalance(stakedBal.toString());
      setRewardRate(formatUnits(rewardRateBigInt, decimals));
      setEarnedRewards(earned);

    } catch (e: any) {
      console.error("Error fetching dashboard data:", e);
      setError(`Failed to fetch data: ${e.shortMessage || e.message}`);
    } finally {
      setLoading(false);
    }
  }, [account, isConnected, chain, setNftBalance, setTokenBalance, setStakingBalance, setRewardRate, setLoading, setError]);

  React.useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  // Actions
  const handleApprove = async () => {
    if (!walletClient || !account || !ADRS.token || !ADRS.staking) {
      setError("Wallet not connected or contract addresses missing.");
      return;
    }
    setApproving(true);
    setError(null);
    try {
      // Approve a large amount for the staking contract
      const { hash } = await approveToken(walletClient, ADRS.staking, parseUnits("1000000000000000000", tokenDecimals), account);
      addEvent({ // Changed from addEventLog
        timestamp: new Date().toISOString(),
        contract: 'token',
        event: 'Approval Sent',
        args: { spender: ADRS.staking, amount: 'Large amount' },
        transactionHash: hash,
      });
      await fetchData(); // Refresh balances
    } catch (e: any) {
      console.error("Approval failed:", e);
      setError(`Approval failed: ${e.shortMessage || e.message}`);
    } finally {
      setApproving(false);
    }
  };

  const handleStake = async () => {
    if (!walletClient || !account || !ADRS.staking || !stakeAmount) {
      setError("Wallet not connected, staking contract missing, or NFT ID not provided.");
      return;
    }
    setStaking(true);
    setError(null);
    try {
      const tokenId = BigInt(stakeAmount);
      const { hash } = await stakeNft(walletClient, tokenId, account);
      addEvent({ // Changed from addEventLog
        timestamp: new Date().toISOString(),
        contract: 'staking',
        event: 'NFT Staked',
        args: { tokenId: tokenId },
        transactionHash: hash,
      });
      setStakeAmount('');
      await fetchData(); // Refresh balances
    } catch (e: any) {
      console.error("Staking failed:", e);
      setError(`Staking failed: ${e.shortMessage || e.message}`);
    } finally {
      setStaking(false);
    }
  };

  const handleClaim = async () => {
    if (!walletClient || !account || !ADRS.staking || earnedRewards === 0n) {
      setError("Wallet not connected, staking contract missing, or no rewards to claim.");
      return;
    }
    setClaiming(true);
    setError(null);
    try {
      const { hash } = await claimRewards(walletClient, account);
      addEvent({ // Changed from addEventLog
        timestamp: new Date().toISOString(),
        contract: 'staking',
        event: 'Rewards Claimed',
        args: { amount: formatUnits(earnedRewards, tokenDecimals) },
        transactionHash: hash,
      });
      await fetchData(); // Refresh balances
    } catch (e: any) {
      console.error("Claiming failed:", e);
      setError(`Claiming failed: ${e.shortMessage || e.message}`);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-extrabold text-white mb-8 text-center">Dashboard Overview</h1>

      {loading && <p className="text-blue-400 text-center text-lg mb-4">Loading data...</p>}
      {error && (
        <div className="bg-red-700 p-4 rounded-lg text-white mb-6 text-center">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <BalanceCard
          title="Your NFTs"
          value={nftBalance}
          unit="NFTs"
          loading={loading}
          emoji="🖼️"
          className="bg-gray-800 text-blue-400"
        />
        <BalanceCard
          title="Your Tokens"
          value={parseFloat(tokenBalance).toFixed(2)}
          unit="MTK"
          loading={loading}
          emoji="💎"
          className="bg-gray-800 text-green-400"
        />
        <BalanceCard
          title="Staked NFTs"
          value={stakingBalance}
          unit="NFTs"
          loading={loading}
          emoji="🔗"
          className="bg-gray-800 text-emerald-400"
        />
        <BalanceCard
          title="Earned Rewards"
          value={parseFloat(formatUnits(earnedRewards, tokenDecimals)).toFixed(4)}
          unit="MTK"
          loading={loading}
          emoji="💰"
          className="bg-gray-800 text-purple-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-100 mb-4">Actions</h2>
          <div className="space-y-4">
            {/* Approve Token */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-gray-700 rounded-lg">
              <span className="text-lg text-slate-200 min-w-[120px]">Approve Tokens:</span>
              <button
                onClick={handleApprove}
                disabled={!isConnected || approving || !walletClient}
                className="flex-grow px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approving ? 'Approving...' : 'Approve for Staking'}
              </button>
            </div>

            {/* Stake NFT */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-gray-700 rounded-lg">
              <span className="text-lg text-slate-200 min-w-[120px]">Stake NFT (ID):</span>
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="NFT Token ID"
                className="flex-grow px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isConnected}
              />
              <button
                onClick={handleStake}
                disabled={!isConnected || staking || !stakeAmount || !walletClient}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {staking ? 'Staking...' : 'Stake'}
              </button>
            </div>

            {/* Claim Rewards */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-gray-700 rounded-lg">
              <span className="text-lg text-slate-200 min-w-[120px]">Claim Rewards:</span>
              <button
                onClick={handleClaim}
                disabled={!isConnected || claiming || earnedRewards === 0n || !walletClient}
                className="flex-grow px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg shadow-md transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {claiming ? 'Claiming...' : `Claim ${parseFloat(formatUnits(earnedRewards, tokenDecimals)).toFixed(4)} MTK`}
              </button>
            </div>
          </div>
        </div>

        <div>
          <EventStream />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;