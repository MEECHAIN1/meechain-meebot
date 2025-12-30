
import React from 'react';
import BalanceCard from '../components/BalanceCard';
import EventStream from '../components/EventStream';
import RitualOracle from '../components/RitualOracle';
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
    addEvent,
    setError,
    loading,
    error,
    incrementLoading,
    decrementLoading,
  } = useAppState();
  
  const { data: walletClient } = useWalletClient();
  const { chain } = useAccount();

  const [tokenDecimals, setTokenDecimals] = React.useState<number>(18);
  const [earnedRewards, setEarnedRewards] = React.useState<bigint>(0n);
  const [stakeAmount, setStakeAmount] = React.useState<string>('');
  const [approving, setApproving] = React.useState(false);
  const [staking, setStaking] = React.useState(false);
  const [claiming, setClaiming] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!account || !isConnected || !chain) {
      setNftBalance("0");
      setTokenBalance("0");
      setStakingBalance("0");
      setRewardRate("0");
      setEarnedRewards(0n);
      return;
    }

    incrementLoading();
    setError(null);

    try {
      const decimals = await getTokenDecimals();
      setTokenDecimals(decimals);

      const [nftBal, tokenBal, stakedBal, rewardRateBigInt, earned] = await Promise.all([
        getNftBalance(account),
        getTokenBalance(account),
        getStakedNFTs(account).then(nfts => BigInt(nfts.length)),
        getRewardRate(),
        getEarned(account),
      ]);

      setNftBalance(nftBal.toString());
      setTokenBalance(formatUnits(tokenBal, decimals));
      setStakingBalance(stakedBal.toString());
      setRewardRate(formatUnits(rewardRateBigInt, decimals));
      setEarnedRewards(earned);

    } catch (e: any) {
      setError(`Failed to fetch ritual data: ${e.shortMessage || e.message}`);
    } finally {
      decrementLoading();
    }
  }, [account, isConnected, chain, setNftBalance, setTokenBalance, setStakingBalance, setRewardRate, incrementLoading, decrementLoading, setError]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async () => {
    if (!walletClient || !account || !ADRS.token || !ADRS.staking) return;
    setApproving(true);
    incrementLoading();
    try {
      const { hash } = await approveToken(walletClient, ADRS.staking, parseUnits("1000000000000000000", tokenDecimals), account);
      addEvent({
        timestamp: new Date().toISOString(),
        contract: 'token',
        event: 'Approval Sent',
        args: { spender: ADRS.staking, amount: 'Sacrificial Approval' },
        transactionHash: hash,
      });
      await fetchData();
    } catch (e: any) {
      setError(`Approval ritual failed: ${e.shortMessage || e.message}`);
    } finally {
      setApproving(false);
      decrementLoading();
    }
  };

  const handleStake = async () => {
    if (!walletClient || !account || !ADRS.staking || !stakeAmount) return;
    setStaking(true);
    incrementLoading();
    try {
      const tokenId = BigInt(stakeAmount);
      const { hash } = await stakeNft(walletClient, tokenId, account);
      addEvent({
        timestamp: new Date().toISOString(),
        contract: 'staking',
        event: 'NFT Bound',
        args: { tokenId: tokenId },
        transactionHash: hash,
      });
      setStakeAmount('');
      await fetchData();
    } catch (e: any) {
      setError(`Binding failed: ${e.shortMessage || e.message}`);
    } finally {
      setStaking(false);
      decrementLoading();
    }
  };

  const handleClaim = async () => {
    if (!walletClient || !account || !ADRS.staking || earnedRewards === 0n) return;
    setClaiming(true);
    incrementLoading();
    try {
      const { hash } = await claimRewards(walletClient, account);
      addEvent({
        timestamp: new Date().toISOString(),
        contract: 'staking',
        event: 'Ritual Reward Harvested',
        args: { amount: formatUnits(earnedRewards, tokenDecimals) },
        transactionHash: hash,
      });
      await fetchData();
    } catch (e: any) {
      setError(`Harvest failed: ${e.shortMessage || e.message}`);
    } finally {
      setClaiming(false);
      decrementLoading();
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-12">
      <header className="text-center space-y-2">
        <h1 className="text-5xl font-black ritual-font tracking-tighter uppercase italic ritual-gradient-text">
          Ritual Altar
        </h1>
        <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-xs">MeeBot Dashboard</p>
      </header>

      {error && (
        <div className="bg-red-900/40 border border-red-500/50 backdrop-blur-md p-4 rounded-2xl text-red-200 text-center animate-shake">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <BalanceCard title="MeeBots" value={nftBalance} unit="Units" loading={loading} emoji="🤖" className="ritual-card text-blue-400" />
        <BalanceCard title="Ritual Essence" value={parseFloat(tokenBalance).toFixed(2)} unit="MTK" loading={loading} emoji="⚛️" className="ritual-card text-emerald-400" />
        <BalanceCard title="Bound Spirits" value={stakingBalance} unit="Staked" loading={loading} emoji="🔗" className="ritual-card text-indigo-400" />
        <BalanceCard title="Latent Power" value={parseFloat(formatUnits(earnedRewards, tokenDecimals)).toFixed(4)} unit="MTK" loading={loading} emoji="🔥" className="ritual-card text-pink-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="ritual-card rounded-[2.5rem] p-8 border border-slate-700/50">
            <h2 className="text-2xl font-black ritual-font text-slate-100 mb-6 flex items-center">
              <span className="mr-3">⚒️</span> Ritual Actions
            </h2>
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-5 bg-slate-900/60 rounded-3xl border border-slate-800">
                <div className="flex-grow">
                  <p className="text-white font-bold">Approve Essence</p>
                  <p className="text-xs text-slate-500">Enable the altar to utilize your MTK.</p>
                </div>
                <button
                  onClick={handleApprove}
                  disabled={!isConnected || approving}
                  className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs"
                >
                  {approving ? 'Ritualizing...' : 'Authorize'}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 p-5 bg-slate-900/60 rounded-3xl border border-slate-800">
                <div className="flex-grow">
                  <p className="text-white font-bold">Bind Guardian</p>
                  <p className="text-xs text-slate-500">Stake a MeeBot by ID to generate power.</p>
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="ID"
                    className="w-20 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                  <button
                    onClick={handleStake}
                    disabled={!isConnected || staking || !stakeAmount}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs"
                  >
                    Bind
                  </button>
                </div>
              </div>

              <button
                onClick={handleClaim}
                disabled={!isConnected || claiming || earnedRewards === 0n}
                className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black rounded-3xl shadow-xl transition-all active:scale-95 disabled:opacity-30 uppercase tracking-[0.2em]"
              >
                {claiming ? 'Harvesting...' : `Harvest ${parseFloat(formatUnits(earnedRewards, tokenDecimals)).toFixed(4)} MTK`}
              </button>
            </div>
          </div>
          <EventStream />
        </div>

        <div className="space-y-8">
          <RitualOracle />
          <div className="ritual-card rounded-[2.5rem] p-8 border border-slate-700/50">
            <h3 className="text-lg font-black ritual-font text-slate-100 mb-4 uppercase tracking-widest">Ritual Info</h3>
            <ul className="space-y-4 text-sm font-medium text-slate-400">
              <li className="flex justify-between border-b border-slate-800 pb-2">
                <span>Reward Multiplier</span>
                <span className="text-emerald-400">1.0x</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-2">
                <span>Emission Rate</span>
                <span className="text-indigo-400">{rewardRate} / Block</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-2">
                <span>Altar Stability</span>
                <span className="text-blue-400">99.9%</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
