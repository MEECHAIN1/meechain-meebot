
import React from 'react';
import { useAppState } from '../context/AppState';
import { ADRSKey, ContractEvent } from '../types';
import { formatDistanceToNowStrict } from 'date-fns';
import { Address } from 'viem';

const eventEmojis: Record<string, string> = {
  Transfer: '➡️',
  Approval: '✅',
  OwnershipTransferred: '👑',
  NFTStaked: '🔗',
  NFTUnstaked: '🔓',
  Claimed: '💰',
};

// Fix: Added 'swap' to contractColors
const contractColors: Record<ADRSKey, string> = {
  nft: 'bg-emerald-600',
  token: 'bg-indigo-600',
  staking: 'bg-purple-600',
  swap: 'bg-pink-600', // Added color for swap
};

// Fix: Added 'swap' to contractNames
const contractNames: Record<ADRSKey, string> = {
  nft: 'NFT',
  token: 'Token',
  staking: 'Staking',
  swap: 'Swap', // Added name for swap
};

// Helper function to create a searchable string representation of an event log
const getSearchableString = (log: ContractEvent): string => {
  let searchable = `${log.event} ${log.contract} ${log.transactionHash}`;
  for (const key in log.args) {
    if (Object.prototype.hasOwnProperty.call(log.args, key)) {
      const value = log.args[key];
      if (typeof value === 'bigint') {
        searchable += ` ${value.toString()}`;
      } else if (typeof value === 'string' || typeof value === 'number') {
        searchable += ` ${String(value)}`;
      }
      // Add other types if needed for search, or ignore them
    }
  }
  return searchable.toLowerCase();
};

const EventStream: React.FC = () => {
  const { events } = useAppState(); // Changed from eventLogs
  const eventLogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [events]); // Changed from eventLogs

  const renderArgs = (args: Record<string, any>) => {
    return Object.entries(args)
      .filter(([, value]) => value !== undefined) // Filter out undefined args
      .map(([key, value], index): React.ReactNode => {
        let displayValue: string;

        // Check if value is a bigint
        if (typeof value === 'bigint') {
          displayValue = value.toString(); // BigInt does not have toLocaleString, convert to string
        } else if (typeof value === 'string' && (key === 'to' || key === 'from' || key === 'owner' || key === 'spender' || key === 'user')) {
          // Assume it's an address if the key suggests it and it's a string
          displayValue = `${value.slice(0, 6)}...${value.slice(-4)}`; // Shorten addresses
        } else if (typeof value === 'number') {
          // For standard numbers, use toLocaleString
          displayValue = value.toLocaleString();
        } else if (typeof value === 'object' && value !== null && 'toString' in value) {
          // Fallback for other objects with toString method (like viem's Address type, if not strictly string)
          displayValue = value.toString();
        } else {
          // Default to String() for anything else
          displayValue = String(value);
        }

        return (
          <span key={index} className="text-sm">
            <span className="font-semibold text-slate-400">{key}:</span>{' '}
            <span className="text-indigo-300">{displayValue}</span>
            {index < Object.keys(args).length - 1 && ', '}
          </span>
        );
      });
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6 max-h-96 overflow-y-auto custom-scrollbar">
      <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center">
        <span className="mr-2">⚡️</span> Live Event Stream
      </h2>
      <div ref={eventLogRef} className="space-y-4">
        {events.length === 0 ? ( // Changed from eventLogs.length
          <p className="text-slate-400 text-center">No events yet. Interact with the DApp to see events!</p>
        ) : (
          events.map((log, index) => ( // Changed from eventLogs.map
            <div
              key={index}
              className="bg-gray-700 p-4 rounded-lg border border-gray-600 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="flex-grow">
                <div className="flex items-center mb-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white mr-2 ${contractColors[log.contract]}`}>
                    {contractNames[log.contract]}
                  </span>
                  <span className="text-lg font-bold text-slate-200">
                    {eventEmojis[log.event] || '💬'} {log.event}
                  </span>
                </div>
                <div className="text-slate-300 text-sm italic">
                  {renderArgs(log.args)}
                </div>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-slate-400 text-xs">
                  {formatDistanceToNowStrict(new Date(log.timestamp), { addSuffix: true })}
                </span>
                <a
                  href={`https://etherscan.io/tx/${log.transactionHash}`} // Placeholder, replace with actual explorer
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-xs mt-1"
                  title="View Transaction on Explorer"
                >
                  Tx: {log.transactionHash.slice(0, 6)}...{log.transactionHash.slice(-4)}
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventStream;