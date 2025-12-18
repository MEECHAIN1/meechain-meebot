import React from 'react';
import { useAppState } from '../context/AppState';
import { useAccount, useWalletClient } from 'wagmi';
import { Address, formatUnits } from 'viem';
import { getStakedNFTs, getRewardRate, getEarned, stakeNft, unstakeNft, claimRewards } from '../lib/services/staking';
import { fetchNftMetadata, getNftBalance, approveNft, getApproved } from '../lib/services/nft';
import { getTokenDecimals } from '../lib/services/token';
import { NFTMetadata } from '../types';
import { ADRS } from '../lib/contracts';
import BalanceCard from '../components/BalanceCard';
import JSConfetti from 'js-confetti';

const StakingPage: React.FC = () => {
  const {
    account,
    isConnected,
    stakingBalance,
    rewardRate,
    setStakingBalance,
    setRewardRate,
    addEvent,
    setError,
    loading,
    error,
  } = useAppState();
  // Destructure new loading functions
  const { incrementLoading, decrementLoading } = useAppState();
  const { data: walletClient } = useWalletClient();
  const { chain } = useAccount();

  const [availableNfts, setAvailableNfts] = React.useState<NFTMetadata[]>([]);
  const [stakedNfts, setStakedNfts] = React.useState<NFTMetadata[]>([]);
  const [earnedRewards, setEarnedRewards] = React.useState<bigint>(0n);
  const [tokenDecimals, setTokenDecimals] = React.useState<number>(18);
  
  const jsConfetti = React.useMemo(() => new JSConfetti(), []);

  const fetchStakingData = React.useCallback(async () => {
    if (!account || !isConnected || !chain) {
      setAvailableNfts([]);
      setStakedNfts([]);
      setEarnedRewards(0n);
      return;
    }

    incrementLoading(); // Use incrementLoading
    try {
      const decimals = await getTokenDecimals();
      setTokenDecimals(decimals);

      const [stakedIds, rewardRateBigInt, earned] = await Promise.all([
        getStakedNFTs(account),
        getRewardRate(),
        getEarned(account),
      ]);

      setStakingBalance(stakedIds.length.toString());
      setRewardRate(formatUnits(rewardRateBigInt, decimals));
      setEarnedRewards(earned);

      const fetchedStakedNfts = await Promise.all(
        stakedIds.map(async (id) => await fetchNftMetadata(id))
      );
      setStakedNfts(fetchedStakedNfts.filter((nft): nft is NFTMetadata => nft !== undefined));

      const userOwnedNftCount = await getNftBalance(account);
      const ownedNfts: NFTMetadata[] = [];
      const MAX_FAKE_NFTS = 10;
      for (let i = 0; i < Math.min(Number(userOwnedNftCount), MAX_FAKE_NFTS); i++) {
        const dummyTokenId = BigInt(i + 1);
        const nftData = await fetchNftMetadata(dummyTokenId);
        if (nftData && nftData.owner === account && !stakedIds.some(stakedId => stakedId === nftData.tokenId)) {
          ownedNfts.push(nftData);
        }
      }
      setAvailableNfts(ownedNfts);
    } catch (e: any) {
      setError(`Failed to fetch staking data: ${e.shortMessage || e.message}`);
    } finally {
      decrementLoading(); // Use decrementLoading
    }
  }, [account, isConnected, chain, setStakingBalance, setRewardRate, incrementLoading, decrementLoading, setError]);

  React.useEffect(() => {
    fetchStakingData();
  }, [fetchStakingData]);

  const handleApprove = async (tokenId: bigint) => {
    if (!walletClient || !account || !ADRS.staking) return;
    incrementLoading(); // Use incrementLoading
    setError(null);
    try {
      const { hash } = await approveNft(walletClient, ADRS.staking, tokenId, account);
      addEvent({
        timestamp: new Date().toISOString(),
        contract: 'nft',
        event: 'NFT Approved',
        args: { tokenId: tokenId, approved: ADRS.staking },
        transactionHash: hash,
      });
      await fetchStakingData();
    } catch (e: any) {
      setError(`NFT Approval failed: ${e.shortMessage || e.message}`);
    } finally {
      decrementLoading(); // Use decrementLoading
    }
  };

  const handleStake = async (tokenId: bigint) => {
    if (!walletClient || !account || !ADRS.staking) return;
    incrementLoading(); // Use incrementLoading
    setError(null);
    try {
      const approvedAddress = await getApproved(tokenId);
      if (approvedAddress !== ADRS.staking) {
        setError("NFT not approved. Please approve first.");
        return;
      }
      const { hash } = await stakeNft(walletClient, tokenId, account);
      addEvent({
        timestamp: new Date().toISOString(),
        contract: 'staking',
        event: 'NFT Staked',
        args: { tokenId: tokenId },
        transactionHash: hash,
      });
      await fetchStakingData();
    } catch (e: any) {
      setError(`Staking failed: ${e.shortMessage || e.message}`);
    } finally {
      decrementLoading(); // Use decrementLoading
    }
  };

  const handleUnstake = async (tokenId: bigint) => {
    if (!walletClient || !account) return;
    incrementLoading(); // Use incrementLoading
    setError(null);
    try {
      const { hash } = await unstakeNft(walletClient, tokenId, account);
      addEvent({
        timestamp: new Date().toISOString(),
        contract: 'staking',
        event: 'NFT Unstaked',
        args: { tokenId: tokenId },
        transactionHash: hash,
      });
      await fetchStakingData();
    } catch (e: any) {
      setError(`Unstaking failed: ${e.shortMessage || e.message}`);
    } finally {
      decrementLoading(); // Use decrementLoading
    }
  };

  const handleClaim = async () => {
    if (!walletClient || !account || earnedRewards === 0n) return;
    incrementLoading(); // Use incrementLoading
    setError(null);
    try {
      const { hash } = await claimRewards(walletClient, account);
      addEvent({
        timestamp: new Date().toISOString(),
        contract: 'staking',
        event: 'Rewards Claimed',
        args: { amount: formatUnits(earnedRewards, tokenDecimals) },
        transactionHash: hash,
      });
      jsConfetti.addConfetti({
        emojis: ['🎉', '💰', '✨'],
        confettiNumber: 100,
      });
      await fetchStakingData();
    } catch (e: any) {
      setError(`Claiming failed: ${e.shortMessage || e.message}`);
    } finally {
      decrementLoading(); // Use decrementLoading
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-extrabold text-white mb-8 text-center uppercase tracking-tighter">
        💎 MeeBot Staking Altar
      </h1>

      {error && (
        <div className="bg-red-700/80 backdrop-blur-md p-4 rounded-xl text-white mb-6 text-center border border-red-500/50 shadow-lg animate-bounce">
          ❌ {error}
        </div>
      )}

      {!isConnected ? (
        <div className="bg-gray-800 p-12 rounded-3xl text-center border border-gray-700">
           <p className="text-slate-400 text-xl font-medium italic">Initiate connection to enter the Staking Altar...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <BalanceCard title="Staked Guardians" value={stakingBalance} unit="NFTs" emoji="🔗" loading={loading} className="bg-emerald-900/20 border border-emerald-500/30" />
            <BalanceCard title="Ritual Power" value={parseFloat(rewardRate).toFixed(4)} unit="MTK/Block" emoji="⚡" loading={loading} className="bg-yellow-900/20 border border-yellow-500/30" />
            <div className="relative group">
               <BalanceCard 
                 title="Accumulated Essence" 
                 value={parseFloat(formatUnits(earnedRewards, tokenDecimals)).toFixed(4)} 
                 unit="MTK" emoji="💰" 
                 loading={loading} 
                 className="bg-purple-900/20 border border-purple-500/30" 
               />
               <button
                  onClick={handleClaim}
                  disabled={loading || earnedRewards === 0n}
                  className="mt-4 w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:grayscale uppercase tracking-widest"
                >
                  {loading ? 'Processing...' : 'Harvest Essence'}
                </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-gray-800/50 rounded-3xl shadow-2xl p-8 border border-slate-700">
              <h2 className="text-2xl font-black text-white mb-6 flex items-center">
                <span className="mr-3">🧧</span> Available to Bind
              </h2>
              {availableNfts.length === 0 ? (
                <p className="text-slate-500 italic text-center py-12">No MeeBots found in your dimensional pocket.</p>
              ) : (
                <div className="space-y-4">
                  {availableNfts.map((nft) => (
                    <div key={nft.tokenId.toString()} className="bg-slate-900/50 rounded-2xl p-4 flex items-center space-x-4 border border-slate-700/50 group hover:border-blue-500/50 transition-all">
                      <img src={nft.image} alt={nft.name} className="w-16 h-16 rounded-xl object-cover shadow-lg group-hover:rotate-6 transition-transform" />
                      <div className="flex-grow">
                        <h3 className="font-bold text-slate-100">{nft.name}</h3>
                        <p className="text-xs text-slate-500 font-mono">ID: {nft.tokenId.toString()}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => handleApprove(nft.tokenId)} disabled={loading} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-all uppercase">Approve</button>
                        <button onClick={() => handleStake(nft.tokenId)} disabled={loading} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all uppercase">Bind</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-800/50 rounded-3xl shadow-2xl p-8 border border-slate-700">
              <h2 className="text-2xl font-black text-white mb-6 flex items-center">
                <span className="mr-3">🔒</span> Bound Guardians
              </h2>
              {stakedNfts.length === 0 ? (
                <p className="text-slate-500 italic text-center py-12">No MeeBots currently guarding the altar.</p>
              ) : (
                <div className="space-y-4">
                  {stakedNfts.map((nft) => (
                    <div key={nft.tokenId.toString()} className="bg-slate-900/50 rounded-2xl p-4 flex items-center space-x-4 border border-slate-700/50 group hover:border-red-500/50 transition-all">
                      <img src={nft.image} alt={nft.name} className="w-16 h-16 rounded-xl object-cover shadow-lg group-hover:-rotate-6 transition-transform" />
                      <div className="flex-grow">
                        <h3 className="font-bold text-slate-100">{nft.name}</h3>
                        <p className="text-xs text-slate-500 font-mono">ID: {nft.tokenId.toString()}</p>
                      </div>
                      <button onClick={() => handleUnstake(nft.tokenId)} disabled={loading} className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-xl border border-red-500/30 transition-all uppercase">Unbind</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StakingPage;