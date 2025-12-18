import React from 'react';
import { create } from 'zustand';
import { AppState, ContractEvent } from '../types';

// Helper to sanitize BigInts for State safety
const sanitizeArgs = (args: Record<string, any>): Record<string, any> => {
  const newArgs: Record<string, any> = {};
  for (const key in args) {
    const value = args[key];
    newArgs[key] = typeof value === 'bigint' ? value.toString() : value;
  }
  return newArgs;
};

export const useAppState = create<AppState>((set, get) => ({
  account: undefined,
  isConnected: false,
  chainName: undefined,
  chainId: undefined,
  nftBalance: "0",
  tokenBalance: "0",
  stakingBalance: "0",
  rewardRate: "0",
  events: [],
  loading: false,
  loadingCount: 0,
  error: null,

  setAccount: (account) => set({ account }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setChain: (chainName, chainId) => set({ chainName, chainId }),
  setNftBalance: (balance) => set({ nftBalance: balance }),
  setTokenBalance: (balance) => set({ tokenBalance: balance }),
  setStakingBalance: (balance) => set({ stakingBalance: balance }),
  setRewardRate: (rate) => set({ rewardRate: rate }),
  
  addEvent: (event) => {
    const sanitizedEvent = {
      ...event,
      args: sanitizeArgs(event.args)
    };
    set((state) => ({ 
      events: [sanitizedEvent, ...state.events].slice(0, 100) 
    }));
  },

  // New functions for managing loadingCount
  incrementLoading: () => set((state) => ({
    loadingCount: state.loadingCount + 1,
    loading: true, // Always true when something starts loading
  })),
  decrementLoading: () => set((state) => {
    const newCount = Math.max(0, state.loadingCount - 1); // Ensure count doesn't go below zero
    return {
      loadingCount: newCount,
      loading: newCount > 0, // Loading is true only if there's still something loading
    };
  }),

  setError: (error) => set({ error }),
  
  resetState: () => set({
    account: undefined,
    isConnected: false,
    chainName: undefined,
    chainId: undefined,
    nftBalance: "0",
    tokenBalance: "0",
    stakingBalance: "0",
    rewardRate: "0",
    events: [],
    loading: false,       // Reset loading to false
    loadingCount: 0,      // Reset loadingCount to 0
    error: null,
  }),
}));

export const AppStateProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  return <>{children}</>;
};