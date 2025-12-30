
import { createConfig } from 'wagmi';
import { metaMask, walletConnect } from 'wagmi/connectors';
import { http } from 'viem';
import { chains } from '../constants/chains';

// Set up wagmi config for v2
export const wagmiConfig = createConfig({
  chains: chains,
  transports: chains.reduce((acc, chain) => {
    acc[chain.id] = http(chain.rpcUrls.default.http[0]);
    return acc;
  }, {} as Record<number, ReturnType<typeof http>>),
  connectors: [
    metaMask({ projectId: 'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96' }),
    walletConnect({
      projectId: 'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    }),
  ],
});
