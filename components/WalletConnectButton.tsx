
import React from 'react';
// Fix: use `isConnecting` from useAccount to manage loading states
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { metaMask, walletConnect } from 'wagmi/connectors'; // Fix: Import metaMask and walletConnect factory functions
import { useAppState } from '../context/AppState';
import { chains } from '../constants/chains';
import { Connector } from 'wagmi'; // Import Connector type

const WalletConnectButton: React.FC = () => {
  const { address, isConnected, chain, isConnecting } = useAccount(); // Fix: Added isConnecting
  // Fix: Use isPending for loading state, pendingConnector is not directly from useConnect
  const { connect, connectors, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { setAccount, setIsConnected, setChain, resetState } = useAppState();

  React.useEffect(() => {
    if (isConnected && address && chain) {
      setAccount(address);
      setIsConnected(true);
      setChain(chain.name, chain.id);
    } else {
      // Ensure state is reset when disconnected
      resetState();
    }
  }, [isConnected, address, chain, setAccount, setIsConnected, setChain, resetState]);

  // Fix: handleConnect now takes a generic Connector type
  const handleConnect = (connector: Connector) => {
    connect({ connector, chainId: chains[0].id }); // Connect to the first defined chain
  };

  if (isConnected) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-slate-300">
          Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => handleConnect(connector)} // Fix: Pass connector directly
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
          // Fix: Use isConnecting from useAccount or isPending from useConnect for disabled state
          disabled={!connector.ready || isConnecting || isPending}
        >
          {isConnecting || isPending ? 'Connecting...' : `Connect ${connector.name}`}
        </button>
      ))}
      {error && <div className="text-red-400 text-sm mt-2">Error: {error.message}</div>}
    </div>
  );
};

export default WalletConnectButton;