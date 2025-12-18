
import { createPublicClient, http, PublicClient, Chain } from "viem";
import { localHardhat } from "../constants/chains";

export const publicClient: PublicClient = createPublicClient({
  chain: localHardhat as Chain,
  transport: http(localHardhat.rpcUrls.default.http[0]),
  // Fix: Explicitly set account to undefined for a general public client and added pollingInterval
  account: undefined,
  pollingInterval: 1000,
});