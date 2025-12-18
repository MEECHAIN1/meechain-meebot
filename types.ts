import { Address } from 'viem';

declare global {
  interface Window {
    VITE_RPC_URL?: string;
    VITE_NFT_ADDRESS?: string;
    VITE_TOKEN_ADDRESS?: string;
    VITE_STAKING_ADDRESS?: string;
  }
}

export type ADRSKey = 'nft' | 'token' | 'staking';

export interface ContractAddresses {
  nft: Address | undefined;
  token: Address | undefined;
  staking: Address | undefined;
}

export interface AppState {
  account: Address | undefined;
  isConnected: boolean;
  chainName: string | undefined;
  chainId: number | undefined;
  nftBalance: string;
  tokenBalance: string;
  stakingBalance: string;
  rewardRate: string;
  events: ContractEvent[];
  loading: boolean; // Computed from loadingCount
  loadingCount: number; // For ref-counting
  error: string | null;
  setAccount: (account: Address | undefined) => void;
  setIsConnected: (connected: boolean) => void;
  setChain: (chainName: string | undefined, chainId: number | undefined) => void;
  setNftBalance: (balance: string) => void;
  setTokenBalance: (balance: string) => void;
  setStakingBalance: (balance: string) => void;
  setRewardRate: (rate: string) => void;
  addEvent: (event: ContractEvent) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
}

export interface ContractEvent {
  timestamp: string;
  contract: ADRSKey;
  event: string;
  args: Record<string, any>;
  transactionHash: Address;
}

export interface NFTMetadata {
  tokenId: bigint;
  name: string;
  description: string;
  image: string;
  owner: Address;
  approved: Address;
}