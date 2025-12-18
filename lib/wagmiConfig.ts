
import { createConfig } from 'wagmi';
// Fix: Import metaMask and walletConnect factory functions from wagmi/connectors
import { metaMask, walletConnect } from 'wagmi/connectors';
import { http } from 'viem';
import { chains } from '../constants/chains';

// Set up wagmi config
export const wagmiConfig = createConfig({
  autoConnect: true,
  chains: chains, // Pass the chains array directly
  transports: chains.reduce((acc, chain) => {
    // Dynamically assign http transport for each chain based on its RPC URL
    // Ensure that chain.rpcUrls.default.http has at least one URL
    acc[chain.id] = http(chain.rpcUrls.default.http[0]);
    return acc;
  }, {} as Record<number, ReturnType<typeof http>>),
  connectors: [
    // Fix: Use metaMask and walletConnect factory functions
    metaMask({ projectId: 'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96' }), // Project ID can be optional for MetaMask
    walletConnect({
      projectId: 'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // WalletConnect project ID is required here
    }),
  ],
});