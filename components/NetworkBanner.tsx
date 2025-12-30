import React from 'react';
import { useAccount, useSwitchChain } from 'wagmi'; 
import { useAppState } from '../context/AppState';
import { chains } from '../constants/chains';

const NetworkBanner: React.FC = () => {
  const { isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { setChain, setError } = useAppState();

  const requiredChainId = chains[0].id;

  React.useEffect(() => {
    if (chain) {
      setChain(chain.name, chain.id);
    } else {
      setChain(undefined, undefined);
    }
  }, [chain, setChain]);

  if (!isConnected) {
    return (
      <div className="w-full bg-blue-800 text-white text-center py-2 text-sm">
        Connect your wallet to get started!
      </div>
    );
  }

  if (chain?.id !== requiredChainId) {
    return (
      <div className="w-full bg-yellow-600 text-white text-center py-2 text-sm flex items-center justify-center space-x-2">
        <span>
          Incorrect Network: Connected to {chain?.name || 'Unknown'}. Please switch to {chains[0].name}.
        </span>
        {switchChain && (
          <button
            onClick={() => {
              try {
                switchChain({ chainId: requiredChainId });
              } catch (e: any) {
                setError(`Failed to switch network: ${e.message}`);
              }
            }}
            className="ml-4 px-3 py-1 bg-yellow-800 hover:bg-yellow-900 text-white rounded-md text-xs font-semibold transition duration-200"
          >
            Switch to {chains[0].name}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-green-700 text-white text-center py-2 text-sm">
      Connected to {chain?.name}
    </div>
  );
};

export default NetworkBanner;