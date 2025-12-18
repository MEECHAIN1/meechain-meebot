import { Address } from 'viem';
import { MeeBotNFTAbi } from "../abi/MeeBotNFT";
import { ERC20Abi } from "../abi/ERC20";
import { MeeBotStakingAbi } from "../abi/MeeBotStaking";
import { MeeBotSwapAbi } from '../abi/MeeBotSwap'; // Import the new swap ABI
import { ContractAddresses } from '../types';

// Helper to safely get an address from a global window variable
const getAddressFromWindow = (windowVar: string | undefined, varName: string): Address | undefined => {
  if (typeof windowVar === 'string' && windowVar.startsWith('0x')) {
    return windowVar as Address;
  }
  console.error(`Error: Global variable for ${varName} is not set or is invalid.
    Please ensure 'window.${varName}' is a '0x'-prefixed string in your index.html.`);
  return undefined;
};

// Use checksum addresses for reliability. Reading from global window variables.
export const ADRS: ContractAddresses = {
  nft: getAddressFromWindow(window.VITE_NFT_ADDRESS, 'VITE_NFT_ADDRESS'),
  token: getAddressFromWindow(window.VITE_TOKEN_ADDRESS, 'VITE_TOKEN_ADDRESS'),
  staking: getAddressFromWindow(window.VITE_STAKING_ADDRESS, 'VITE_STAKING_ADDRESS'),
  // Placeholder for a swap contract. Replace with actual address when available.
  swap: getAddressFromWindow(window.VITE_SWAP_ADDRESS, 'VITE_SWAP_ADDRESS') || '0x70997970C51812dc3A0108C7f020ea650455785c' as Address, // Using a dummy Hardhat address for now
};

export const ABIS = {
  nft: MeeBotNFTAbi,
  token: ERC20Abi,
  staking: MeeBotStakingAbi,
  // Use the new MeeBotSwapAbi for the swap contract
  swap: MeeBotSwapAbi, 
};

// Defensive check for addresses (already handled by getAddressFromWindow, but kept for explicit overview)
for (const [key, value] of Object.entries(ADRS)) {
  if (!value) {
    console.warn(`Contract address for ${key} is undefined. DApp functionality related to this contract might be limited.`);
  }
}