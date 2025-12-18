// lib/services/swap.ts
import { Address, WalletClient, Hex } from 'viem';
import { publicClient } from '../viemClient';
import { ADRS, ABIS } from "../contracts";
import { localHardhat } from '../../constants/chains';

interface WriteContractResult {
  hash: Hex;
  receipt: any; // TransactionReceipt
}

export async function swapExactMTKForETH(
  walletClient: WalletClient,
  account: Address,
  amountIn: bigint,
  amountOutMin: bigint,
  to: Address,
  deadline: bigint,
): Promise<WriteContractResult | undefined> {
  if (!ADRS.swap || !amountIn || !amountOutMin || !to || !deadline || !walletClient || !account) {
    console.error("Missing parameters for swapExactMTKForETH");
    return;
  }
  try {
    const { request } = await publicClient.simulateContract({
      account,
      address: ADRS.swap as Address,
      abi: ABIS.swap,
      functionName: "swapExactMTKForETH",
      args: [amountIn, amountOutMin, to, deadline],
      chain: localHardhat,
    });
    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return { hash, receipt };
  } catch (error) {
    console.error("Error swapping MTK for ETH:", error);
    throw error;
  }
}
