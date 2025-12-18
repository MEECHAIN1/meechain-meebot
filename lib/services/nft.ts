
// Fix: Updated Viem imports for waitForTransactionReceipt, Hex
import { readContract, writeContract, simulateContract, Address, WalletClient, decodeEventLog, PublicClient, Log, Hex, waitForTransactionReceipt } from 'viem';
import { publicClient } from '../viemClient';
import { ADRS, ABIS } from "../contracts";
import { NFTMetadata, ContractEvent } from '../../types';
import { localHardhat } from '../../constants/chains';

interface WriteContractResult {
  hash: Hex;
  receipt: any; // TransactionReceipt
}

export async function getNftBalance(account: Address): Promise<bigint> {
  if (!ADRS.nft || !account) return 0n;
  try {
    // Fix: Ensure ADRS.nft is an Address and cast ABI for stricter type inference
    const balance = await publicClient.readContract({
      address: ADRS.nft as Address,
      abi: ABIS.nft,
      functionName: "balanceOf",
      args: [account]
    });
    return balance as bigint;
  } catch (error) {
    console.error("Error fetching NFT balance:", error);
    return 0n;
  }
}

export async function getApproved(tokenId: bigint): Promise<Address | undefined> {
  if (!ADRS.nft) return undefined;
  try {
    // Fix: Ensure ADRS.nft is an Address and cast ABI for stricter type inference
    const approved = await publicClient.readContract({
      address: ADRS.nft as Address,
      abi: ABIS.nft,
      functionName: "getApproved",
      args: [tokenId]
    });
    return approved as Address;
  } catch (error) {
    console.error(`Error fetching approved for tokenId ${tokenId}:`, error);
    return undefined;
  }
}

export async function getTokenURI(tokenId: bigint): Promise<string | undefined> {
  if (!ADRS.nft) return undefined;
  try {
    // Fix: Ensure ADRS.nft is an Address and cast ABI for stricter type inference
    const uri = await publicClient.readContract({
      address: ADRS.nft as Address,
      abi: ABIS.nft,
      functionName: "tokenURI",
      args: [tokenId]
    });
    return uri as string;
  } catch (error) {
    console.error(`Error fetching tokenURI for tokenId ${tokenId}:`, error);
    return undefined;
  }
}

export async function getOwnerOf(tokenId: bigint): Promise<Address | undefined> {
  if (!ADRS.nft) return undefined;
  try {
    // Fix: Ensure ADRS.nft is an Address and cast ABI for stricter type inference
    const owner = await publicClient.readContract({
      address: ADRS.nft as Address,
      abi: ABIS.nft,
      functionName: "ownerOf",
      args: [tokenId]
    });
    return owner as Address;
  } catch (error) {
    console.error(`Error fetching ownerOf for tokenId ${tokenId}:`, error);
    return undefined;
  }
}

export async function approveNft(
  walletClient: WalletClient,
  spender: Address,
  tokenId: bigint,
  account: Address
): Promise<WriteContractResult | undefined> {
  if (!ADRS.nft || !spender || !tokenId || !walletClient || !account) {
    console.error("Missing parameters for approveNft");
    return;
  }
  try {
    // Fix: Ensure ADRS.nft is an Address and cast ABI for stricter type inference
    const { request } = await publicClient.simulateContract({
      account,
      address: ADRS.nft as Address,
      abi: ABIS.nft,
      functionName: "approve",
      args: [spender, tokenId],
      chain: localHardhat,
    });
    const hash = await walletClient.writeContract(request);
    // Fix: Changed waitForTransaction to waitForTransactionReceipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return { hash, receipt };
  } catch (error) {
    console.error("Error approving NFT:", error);
    throw error;
  }
}

export async function transferNft(
  walletClient: WalletClient,
  from: Address,
  to: Address,
  tokenId: bigint,
  account: Address
): Promise<WriteContractResult | undefined> {
  if (!ADRS.nft || !from || !to || !tokenId || !walletClient || !account) {
    console.error("Missing parameters for transferNft");
    return;
  }
  try {
    // Fix: Ensure ADRS.nft is an Address and cast ABI for stricter type inference
    const { request } = await publicClient.simulateContract({
      account,
      address: ADRS.nft as Address,
      abi: ABIS.nft,
      functionName: "transferFrom",
      args: [from, to, tokenId],
      chain: localHardhat,
    });
    const hash = await walletClient.writeContract(request);
    // Fix: Changed waitForTransaction to waitForTransactionReceipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return { hash, receipt };
  } catch (error) {
    console.error("Error transferring NFT:", error);
    throw error;
  }
}

export async function fetchNftMetadata(tokenId: bigint): Promise<NFTMetadata | undefined> {
  if (!ADRS.nft) return undefined;
  try {
    const tokenUri = await getTokenURI(tokenId);
    const owner = await getOwnerOf(tokenId);
    const approved = await getApproved(tokenId);

    if (!tokenUri || !owner || !approved) return undefined;

    // Assuming tokenURI returns a base64 encoded JSON or a direct URL
    let metadata: { name: string; description: string; image: string; } = { name: `MeeBot #${tokenId}`, description: '', image: `https://picsum.photos/300/300?random=${tokenId}` };

    if (tokenUri.startsWith('data:application/json;base64,')) {
      const base64 = tokenUri.split(',')[1];
      const decoded = atob(base64);
      metadata = JSON.parse(decoded);
    } else {
      // In a real app, you would fetch from the URL
      // const res = await fetch(tokenUri);
      // metadata = await res.json();
      // For now, use a placeholder image if it's a generic URL
      metadata = { name: `MeeBot #${tokenId}`, description: `A digital collectible MeeBot #${tokenId}.`, image: `https://picsum.photos/300/300?random=${tokenId}` };
    }


    return {
      tokenId,
      name: metadata.name,
      description: metadata.description,
      image: metadata.image,
      owner,
      approved,
    };
  } catch (error) {
    console.error(`Failed to fetch metadata for tokenId ${tokenId}:`, error);
    return undefined;
  }
}

// Event watching
export function watchNftEvents(publicClient: PublicClient, addEvent: (event: ContractEvent) => void) {
  if (!ADRS.nft) {
    console.warn("NFT contract address not set, cannot watch events.");
    return () => {}; // Return a no-op unsubscribe function
  }

  const unwatchApproval = publicClient.watchContractEvent({
    address: ADRS.nft,
    abi: ABIS.nft,
    eventName: 'Approval',
    onLogs: (logs) => {
      logs.forEach(log => {
        try {
          const decoded = decodeEventLog({
            abi: ABIS.nft,
            data: log.data,
            topics: log.topics,
          });
          // Fix: Check if decoded is not null/undefined and has 'args' property
          if (decoded && 'args' in decoded) {
            addEvent({
              timestamp: new Date().toISOString(),
              contract: 'nft',
              event: 'Approval',
              args: decoded.args as Record<string, any>,
              transactionHash: log.transactionHash as Address,
            });
          }
        } catch (e) {
          console.error("Error decoding Approval event:", e);
        }
      });
    },
  });

  const unwatchTransfer = publicClient.watchContractEvent({
    address: ADRS.nft,
    abi: ABIS.nft,
    eventName: 'Transfer',
    onLogs: (logs) => {
      logs.forEach(log => {
        try {
          const decoded = decodeEventLog({
            abi: ABIS.nft,
            data: log.data,
            topics: log.topics,
          });
          // Fix: Check if decoded is not null/undefined and has 'args' property
          if (decoded && 'args' in decoded) {
            addEvent({
              timestamp: new Date().toISOString(),
              contract: 'nft',
              event: 'Transfer',
              args: decoded.args as Record<string, any>,
              transactionHash: log.transactionHash as Address,
            });
          }
        } catch (e) {
          console.error("Error decoding Transfer event:", e);
        }
      });
    },
  });

  const unwatchOwnershipTransferred = publicClient.watchContractEvent({
    address: ADRS.nft,
    abi: ABIS.nft,
    eventName: 'OwnershipTransferred',
    onLogs: (logs) => {
      logs.forEach(log => {
        try {
          const decoded = decodeEventLog({
            abi: ABIS.nft,
            data: log.data,
            topics: log.topics,
          });
          // Fix: Check if decoded is not null/undefined and has 'args' property
          if (decoded && 'args' in decoded) {
            addEvent({
              timestamp: new Date().toISOString(),
              contract: 'nft',
              event: 'OwnershipTransferred',
              args: decoded.args as Record<string, any>,
              transactionHash: log.transactionHash as Address,
            });
          }
        } catch (e) {
          console.error("Error decoding OwnershipTransferred event:", e);
        }
      });
    },
  });

  return () => {
    unwatchApproval();
    unwatchTransfer();
    unwatchOwnershipTransferred();
  };
}