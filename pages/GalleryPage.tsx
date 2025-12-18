import React from 'react';
import { useAppState } from '../context/AppState';
import { useAccount, useWalletClient } from 'wagmi';
import { Address } from 'viem';
import { fetchNftMetadata, getNftBalance, approveNft, transferNft } from '../lib/services/nft';
import { NFTMetadata } from '../types';
import { ADRS } from '../lib/contracts';

const GalleryPage: React.FC = () => {
  const { account, isConnected, setNftBalance, addEvent, setError, loading, error } = useAppState();
  // Destructure new loading functions
  const { incrementLoading, decrementLoading } = useAppState();
  const { data: walletClient } = useWalletClient();
  const { chain } = useAccount();

  const [userNfts, setUserNfts] = React.useState<NFTMetadata[]>([]);
  const [selectedNftId, setSelectedNftId] = React.useState<bigint | undefined>(undefined);
  const [transferToAddress, setTransferToAddress] = React.useState<Address | ''>('');
  const [approvingNft, setApprovingNft] = React.useState(false);
  const [transferringNft, setTransferringNft] = React.useState(false);

  const fetchUserNfts = React.useCallback(async () => {
    if (!account || !isConnected || !chain) {
      setUserNfts([]);
      return;
    }

    incrementLoading(); // Use incrementLoading
    setError(null);
    try {
      const balance = await getNftBalance(account);
      setNftBalance(balance.toString()); // Convert bigint to string
      if (balance === 0n) {
        setUserNfts([]);
        decrementLoading(); // Use decrementLoading
        return;
      }

      // In a real application, you'd have to query a subgraph or iterate
      // through all possible token IDs to find the ones owned by the user.
      // For this scaffold, we'll simulate by fetching a few placeholder NFTs.
      // If the NFT contract has a `tokenOfOwnerByIndex` function, that would be used here.
      // Let's assume some dummy token IDs for now, e.g., 1, 2, 3... up to balance.
      const fetchedNfts: NFTMetadata[] = [];
      const MAX_FAKE_NFTS = 10; // Limit for simulation
      for (let i = 0; i < Math.min(Number(balance), MAX_FAKE_NFTS); i++) {
        const dummyTokenId = BigInt(i + 1);
        const nftData = await fetchNftMetadata(dummyTokenId);
        if (nftData && nftData.owner === account) { // Only add if actually owned by current account
          fetchedNfts.push(nftData);
        }
      }
      setUserNfts(fetchedNfts);

    } catch (e: any) {
      console.error("Error fetching NFTs:", e);
      setError(`Failed to fetch NFTs: ${e.shortMessage || e.message}`);
    } finally {
      decrementLoading(); // Use decrementLoading
    }
  }, [account, isConnected, chain, setNftBalance, setError, incrementLoading, decrementLoading]);

  React.useEffect(() => {
    fetchUserNfts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUserNfts]);

  const handleApproveNft = async (tokenId: bigint) => {
    if (!walletClient || !account || !ADRS.nft || !ADRS.staking) {
      setError("Wallet not connected or contract addresses missing.");
      return;
    }
    setApprovingNft(true);
    incrementLoading(); // Use incrementLoading
    setError(null);
    try {
      const { hash } = await approveNft(walletClient, ADRS.staking, tokenId, account); // Approve staking contract
      addEvent({
        timestamp: new Date().toISOString(),
        contract: 'nft',
        event: 'NFT Approved',
        args: { tokenId: tokenId, approved: ADRS.staking },
        transactionHash: hash,
      });
      await fetchUserNfts(); // Refresh NFT data
    } catch (e: any) {
      console.error("NFT Approval failed:", e);
      setError(`NFT Approval failed: ${e.shortMessage || e.message}`);
    } finally {
      setApprovingNft(false);
      decrementLoading(); // Use decrementLoading
    }
  };

  const handleTransferNft = async () => {
    if (!walletClient || !account || !selectedNftId || !transferToAddress || !ADRS.nft) {
      setError("Wallet not connected, NFT not selected, transfer address missing, or contract address missing.");
      return;
    }
    setTransferringNft(true);
    incrementLoading(); // Use incrementLoading
    setError(null);
    try {
      const { hash } = await transferNft(walletClient, account, transferToAddress, selectedNftId, account);
      addEvent({
        timestamp: new Date().toISOString(),
        contract: 'nft',
        event: 'NFT Transferred',
        args: { from: account, to: transferToAddress, tokenId: selectedNftId },
        transactionHash: hash,
      });
      setSelectedNftId(undefined);
      setTransferToAddress('');
      await fetchUserNfts(); // Refresh NFT data
    } catch (e: any) {
      console.error("NFT Transfer failed:", e);
      setError(`NFT Transfer failed: ${e.shortMessage || e.message}`);
    } finally {
      setTransferringNft(false);
      decrementLoading(); // Use decrementLoading
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-extrabold text-white mb-8 text-center">My MeeBot NFTs</h1>

      {loading && <p className="text-blue-400 text-center text-lg mb-4">Loading your NFTs...</p>}
      {error && (
        <div className="bg-red-700 p-4 rounded-lg text-white mb-6 text-center">
          Error: {error}
        </div>
      )}

      {!isConnected && (
        <p className="text-slate-400 text-center text-lg">Connect your wallet to view your NFTs.</p>
      )}

      {isConnected && userNfts.length === 0 && !loading && (
        <p className="text-slate-400 text-center text-lg">You don't own any MeeBot NFTs yet.</p>
      )}

      {isConnected && userNfts.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            {userNfts.map((nft) => (
              <div
                key={nft.tokenId.toString()}
                className="bg-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.02]"
              >
                <img
                  src={nft.image}
                  alt={nft.name}
                  className="w-full h-48 object-cover object-center"
                />
                <div className="p-4 flex-grow flex flex-col">
                  <h3 className="text-xl font-bold text-slate-100 mb-2">{nft.name}</h3>
                  <p className="text-slate-300 text-sm mb-3 line-clamp-2">{nft.description}</p>
                  <p className="text-xs text-slate-400 mb-2">
                    Owner: {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}
                  </p>
                  <p className="text-xs text-slate-400 mb-4">
                    Approved: {nft.approved === ADRS.staking ? (
                      <span className="text-green-400">Staking Contract</span>
                    ) : (
                      `${nft.approved.slice(0, 6)}...${nft.approved.slice(-4)}`
                    )}
                  </p>

                  <div className="mt-auto flex flex-col space-y-2">
                    {nft.approved !== ADRS.staking && (
                      <button
                        onClick={() => handleApproveNft(nft.tokenId)}
                        disabled={approvingNft || !walletClient}
                        className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {approvingNft ? 'Approving...' : 'Approve for Staking'}
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedNftId(nft.tokenId)}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-200"
                    >
                      Transfer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedNftId && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md">
                <h3 className="text-2xl font-bold text-slate-100 mb-4">Transfer NFT #{selectedNftId.toString()}</h3>
                <input
                  type="text"
                  placeholder="Recipient Address (0x...)"
                  value={transferToAddress}
                  onChange={(e) => setTransferToAddress(e.target.value as Address)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setSelectedNftId(undefined)}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTransferNft}
                    disabled={transferringNft || !transferToAddress || !walletClient}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {transferringNft ? 'Transferring...' : 'Confirm Transfer'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GalleryPage;