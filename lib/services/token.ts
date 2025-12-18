
// Fix: Updated Viem imports for waitForTransactionReceipt, Hex, and parseUnits
import { readContract, writeContract, simulateContract, Address, WalletClient, parseUnits, Hex, waitForTransactionReceipt } from 'viem';
import { publicClient } from '../viemClient';
import { ADRS, ABIS } from "../contracts";
import { localHardhat } from '../../constants/chains';

interface WriteContractResult {
  hash: Hex;
  receipt: any; // TransactionReceipt
}

const getWalletClient = async (): Promise<WalletClient> => {
  // This is a placeholder. In a real wagmi app, you would use useWalletClient hook or similar.
  // For direct viem interaction without wagmi context, you'd need to manually create a WalletClient.
  // For demonstration, we'll assume a global walletClient or pass it.
  // In `wagmi`, `writeContract` automatically uses the connected wallet's client.
  throw new Error("Wallet client not available. Use wagmi's `useWriteContract` hook for actual transactions.");
};

export async function getTokenBalance(account: Address): Promise<bigint> {
  if (!ADRS.token || !account) return 0n;
  try {
    // Fix: Ensure ADRS.token is an Address and cast ABI for stricter type inference
    const balance = await publicClient.readContract({
      address: ADRS.token as Address,
      abi: ABIS.token,
      functionName: "balanceOf",
      args: [account]
    });
    return balance as bigint;
  } catch (error) {
    console.error("Error fetching token balance:", error);
    return 0n;
  }
}

export async function getTokenDecimals(): Promise<number> {
  if (!ADRS.token) return 18; // Default to 18 decimals
  try {
    // Fix: Ensure ADRS.token is an Address and cast ABI for stricter type inference
    const decimals = await publicClient.readContract({
      address: ADRS.token as Address,
      abi: ABIS.token,
      functionName: "decimals"
    });
    return decimals as number;
  } catch (error) {
    console.error("Error fetching token decimals:", error);
    return 18;
  }
}

export async function getTokenSymbol(): Promise<string> {
  if (!ADRS.token) return 'TOKEN';
  try {
    // Fix: Ensure ADRS.token is an Address and cast ABI for stricter type inference
    const symbol = await publicClient.readContract({
      address: ADRS.token as Address,
      abi: ABIS.token,
      functionName: "symbol"
    });
    return symbol as string;
  } catch (error) {
    console.error("Error fetching token symbol:", error);
    return 'TOKEN';
  }
}

export async function getTokenAllowance(owner: Address, spender: Address): Promise<bigint> {
  if (!ADRS.token || !owner || !spender) return 0n;
  try {
    // Fix: Ensure ADRS.token is an Address and cast ABI for stricter type inference
    const allowance = await publicClient.readContract({
      address: ADRS.token as Address,
      abi: ABIS.token,
      functionName: "allowance",
      args: [owner, spender]
    });
    return allowance as bigint;
  } catch (error) {
    console.error("Error fetching token allowance:", error);
    return 0n;
  }
}

export async function approveToken(
  walletClient: WalletClient, // Pass walletClient from wagmi's useWalletClient
  spender: Address,
  amount: bigint,
  account: Address
): Promise<WriteContractResult | undefined> {
  if (!ADRS.token || !spender || !amount || !walletClient || !account) {
    console.error("Missing parameters for approveToken");
    return;
  }
  try {
    // Fix: Ensure ADRS.token is an Address and cast ABI for stricter type inference
    const { request } = await publicClient.simulateContract({
      account,
      address: ADRS.token as Address,
      abi: ABIS.token,
      functionName: "approve",
      args: [spender, amount],
      chain: localHardhat,
    });
    const hash = await walletClient.writeContract(request);
    // Fix: Changed waitForTransaction to waitForTransactionReceipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return { hash, receipt };
  } catch (error) {
    console.error("Error approving token:", error);
    throw error; // Re-throw to be handled by caller
  }
}

// Fix: parseUnits imported from viem directly
export function parseTokenAmount(amount: string, decimals: number): bigint {
  try {
    return parseUnits(amount, decimals);
  } catch (error) {
    console.error("Error parsing token amount:", error);
    return 0n;
  }
}