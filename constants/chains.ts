
import { Chain } from 'viem';
import { localhost } from 'viem/chains';

// Custom localhost chain definition
export const localHardhat: Chain = {
  ...localhost,
  id: 31337, // Default Hardhat Network ID
  rpcUrls: {
    // Read RPC URL from global window object instead of import.meta.env
    default: { http: [window.VITE_RPC_URL || "http://127.0.0.1:9545"] },
    public: { http: [window.VITE_RPC_URL || "http://127.0.0.1:9545"] },
  },
  contracts: {
    // Example contract addresses if needed for a specific chain
  }
};

// Fix: Asserted chains as const to satisfy Wagmi v2's createConfig type requirement.
export const chains = [localHardhat] as const;