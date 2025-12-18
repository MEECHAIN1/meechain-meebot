
// Fix: Updated Viem imports for waitForTransactionReceipt, Hex
import { readContract, writeContract, simulateContract, Address, WalletClient, decodeEventLog, PublicClient, Log, Hex, waitForTransactionReceipt } from 'viem';
import { publicClient } from '../viemClient';
import { ADRS, ABIS } from "../contracts";
import { ContractEvent } from '../../types';
import { localHardhat } from '../../constants/chains';

interface WriteContractResult {
  hash: Hex;
  receipt: any; // TransactionReceipt
}

export async function getStakedNFTs(account: Address): Promise<bigint[]> {
  if (!ADRS.staking || !account) return [];
  try {
    // Fix: Ensure ADRS.staking is an Address and cast ABI for stricter type inference
    const nfts = await publicClient.readContract({
      address: ADRS.staking as Address,
      abi: ABIS.staking,
      functionName: "getStakedNFTs",
      args: [account]
    });
    return nfts as bigint[];
  } catch (error) {
    console.error("Error fetching staked NFTs:", error);
    return [];
  }
}

export async function getRewardRate(): Promise<bigint> {
  if (!ADRS.staking) return 0n;
  try {
    // Fix: Ensure ADRS.staking is an Address and cast ABI for stricter type inference
    const rate = await publicClient.readContract({
      address: ADRS.staking as Address,
      abi: ABIS.staking,
      functionName: "getRewardRate",
    });
    return rate as bigint;
  } catch (error) {
    console.error("Error fetching reward rate:", error);
    return 0n;
  }
}

export async function getEarned(account: Address): Promise<bigint> {
  if (!ADRS.staking || !account) return 0n;
  try {
    // Fix: Ensure ADRS.staking is an Address and cast ABI for stricter type inference
    const earnedAmount = await publicClient.readContract({
      address: ADRS.staking as Address,
      abi: ABIS.staking,
      functionName: "earned",
      args: [account]
    });
    return earnedAmount as bigint;
  } catch (error) {
    console.error("Error fetching earned rewards:", error);
    return 0n;
  }
}

export async function stakeNft(
  walletClient: WalletClient,
  tokenId: bigint,
  account: Address
): Promise<WriteContractResult | undefined> {
  if (!ADRS.staking || !tokenId || !walletClient || !account) {
    console.error("Missing parameters for stakeNft");
    return;
  }
  try {
    // Fix: Ensure ADRS.staking is an Address and cast ABI for stricter type inference
    const { request } = await publicClient.simulateContract({
      account,
      address: ADRS.staking as Address,
      abi: ABIS.staking,
      functionName: "stake",
      args: [tokenId],
      chain: localHardhat,
    });
    const hash = await walletClient.writeContract(request);
    // Fix: Changed waitForTransaction to waitForTransactionReceipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return { hash, receipt };
  } catch (error) {
    console.error("Error staking NFT:", error);
    throw error;
  }
}

export async function unstakeNft(
  walletClient: WalletClient,
  tokenId: bigint,
  account: Address
): Promise<WriteContractResult | undefined> {
  if (!ADRS.staking || !tokenId || !walletClient || !account) {
    console.error("Missing parameters for unstakeNft");
    return;
  }
  try {
    // Fix: Ensure ADRS.staking is an Address and cast ABI for stricter type inference
    const { request } = await publicClient.simulateContract({
      account,
      address: ADRS.staking as Address,
      abi: ABIS.staking,
      functionName: "unstake",
      args: [tokenId],
      chain: localHardhat,
    });
    const hash = await walletClient.writeContract(request);
    // Fix: Changed waitForTransaction to waitForTransactionReceipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return { hash, receipt };
  } catch (error) {
    console.error("Error unstaking NFT:", error);
    throw error;
  }
}

export async function claimRewards(
  walletClient: WalletClient,
  account: Address
): Promise<WriteContractResult | undefined> {
  if (!ADRS.staking || !walletClient || !account) {
    console.error("Missing parameters for claimRewards");
    return;
  }
  try {
    // Fix: Ensure ADRS.staking is an Address and cast ABI for stricter type inference
    const { request } = await publicClient.simulateContract({
      account,
      address: ADRS.staking as Address,
      abi: ABIS.staking,
      functionName: "claimReward",
      args: [],
      chain: localHardhat,
    });
    const hash = await walletClient.writeContract(request);
    // Fix: Changed waitForTransaction to waitForTransactionReceipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return { hash, receipt };
  } catch (error) {
    console.error("Error claiming rewards:", error);
    throw error;
  }
}

// Event watching
export function watchStakingEvents(publicClient: PublicClient, addEvent: (event: ContractEvent) => void) {
  if (!ADRS.staking) {
    console.warn("Staking contract address not set, cannot watch events.");
    return () => {};
  }

  const unwatchNFTStaked = publicClient.watchContractEvent({
    address: ADRS.staking,
    abi: ABIS.staking,
    eventName: 'NFTStaked',
    onLogs: (logs) => {
      logs.forEach(log => {
        try {
          const decoded = decodeEventLog({
            abi: ABIS.staking,
            data: log.data,
            topics: log.topics,
          });
          // Fix: Check if decoded is not null/undefined and has 'args' property
          if (decoded && 'args' in decoded) {
            addEvent({
              timestamp: new Date().toISOString(),
              contract: 'staking',
              event: 'NFTStaked',
              args: decoded.args as Record<string, any>,
              transactionHash: log.transactionHash as Address,
            });
          }
        } catch (e) {
          console.error("Error decoding NFTStaked event:", e);
        }
      });
    },
  });

  const unwatchNFTUnstaked = publicClient.watchContractEvent({
    address: ADRS.staking,
    abi: ABIS.staking,
    eventName: 'NFTUnstaked',
    onLogs: (logs) => {
      logs.forEach(log => {
        try {
          const decoded = decodeEventLog({
            abi: ABIS.staking,
            data: log.data,
            topics: log.topics,
          });
          // Fix: Check if decoded is not null/undefined and has 'args' property
          if (decoded && 'args' in decoded) {
            addEvent({
              timestamp: new Date().toISOString(),
              contract: 'staking',
              event: 'NFTUnstaked',
              args: decoded.args as Record<string, any>,
              transactionHash: log.transactionHash as Address,
            });
          }
        } catch (e) {
          console.error("Error decoding NFTUnstaked event:", e);
        }
      });
    },
  });

  const unwatchClaimed = publicClient.watchContractEvent({
    address: ADRS.staking,
    abi: ABIS.staking,
    eventName: 'Claimed',
    onLogs: (logs) => {
      logs.forEach(log => {
        try {
          const decoded = decodeEventLog({
            abi: ABIS.staking,
            data: log.data,
            topics: log.topics,
          });
          // Fix: Check if decoded is not null/undefined and has 'args' property
          if (decoded && 'args' in decoded) {
            addEvent({
              timestamp: new Date().toISOString(),
              contract: 'staking',
              event: 'Claimed',
              args: decoded.args as Record<string, any>,
              transactionHash: log.transactionHash as Address,
            });
          }
        } catch (e) {
          console.error("Error decoding Claimed event:", e);
        }
      });
    },
  });

  return () => {
    unwatchNFTStaked();
    unwatchNFTUnstaked();
    unwatchClaimed();
  };
}