

import React from 'react';
import { useAppState } from '../context/AppState';
import { ADRSKey, ContractEvent } from '../types';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';
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

const EventLogPage: React.FC = () => {
  const { events } = useAppState(); // Changed from eventLogs
  const [filterContract, setFilterContract] = React.useState<ADRSKey | 'all'>('all');
  const [filterEvent, setFilterEvent] = React.useState<string>('all');
  const [searchTerm, setSearchTerm] = React.useState<string>('');

  const allEventTypes: string[] = Array.from(new Set(events.map((log) => log.event)));

  const filteredEvents = events.filter((log) => { // Changed from eventLogs
    const matchesContract = filterContract === 'all' || log.contract === filterContract;
    const matchesEvent = filterEvent === 'all' || log.event === filterEvent;
    const matchesSearch =
      searchTerm === '' ||
      getSearchableString(log).includes(searchTerm.toLowerCase()); // Use getSearchableString
    return matchesContract && matchesEvent && matchesSearch;
  });

  const exportLogs = () => {
    // Use a replacer function to handle BigInts during serialization
    const data = JSON.stringify(
      filteredEvents,
      (key, value) => (typeof value === 'bigint' ? value.toString() : value),
      2
    );
    const blob = new Blob([data], { type: 'application/json' });
    saveAs(blob, `meebot_events_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`);
  };

  const renderArgs = (args: Record<string, any>) => {
    return Object.entries(args)
      .filter(([, value]) => value !== undefined)
      .map(([key, value], index): React.ReactNode => {
        let displayValue: string;

        // Check if value is a bigint
        if (typeof value === 'bigint') {
          displayValue = value.toString(); // BigInt does not have toLocaleString, convert to string
        } else if (typeof value === 'string' && (key === 'to' || key === 'from' || key === 'owner' || key === 'spender' || key === 'user')) {
          // Assume it's an address if the key suggests it and it's a string
          displayValue = `${value.slice(0, 6)}...${value.slice(-4)}`;
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
          <span key={index} className="text-sm text-slate-300">
            <span className="font-semibold text-slate-400">{key}:</span> {displayValue}
            {index < Object.keys(args).length - 1 && ', '}
          </span>
        );
      });
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-extrabold text-white mb-8 text-center">Event Logs</h1>

      <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label htmlFor="contract-filter" className="block text-slate-200 text-sm font-bold mb-2">
              Filter by Contract:
            </label>
            <select
              id="contract-filter"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterContract}
              onChange={(e) => setFilterContract(e.target.value as ADRSKey | 'all')}
            >
              <option value="all">All Contracts</option>
              <option value="nft">NFT</option>
              <option value="token">Token</option>
              <option value="staking">Staking</option>
              <option value="swap">Swap</option>{/* Fix: Added swap filter option */}
            </select>
          </div>
          <div>
            <label htmlFor="event-filter" className="block text-slate-200 text-sm font-bold mb-2">
              Filter by Event:
            </label>
            <select
              id="event-filter"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
            >
              <option value="all">All Events</option>
              {allEventTypes.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {eventType}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="search-term" className="block text-slate-200 text-sm font-bold mb-2">
              Search:
            </label>
            <input
              type="text"
              id="search-term"
              placeholder="Search event data..."
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={exportLogs}
          className="w-full md:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75"
        >
          Export Logs (JSON)
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl shadow-lg p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {filteredEvents.length === 0 ? (
          <p className="text-slate-400 text-center text-lg py-10">No events match your criteria.</p>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((log, index) => (
              <div
                key={index}
                className="bg-gray-700 p-4 rounded-lg border border-gray-600 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex-grow">
                  <div className="flex flex-wrap items-center mb-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white mr-2 mb-1 md:mb-0 ${contractColors[log.contract]}`}>
                      {contractNames[log.contract]}
                    </span>
                    <span className="text-lg font-bold text-slate-200 mr-2 mb-1 md:mb-0">
                      {eventEmojis[log.event] || '💬'} {log.event}
                    </span>
                    <span className="text-slate-400 text-xs italic">
                      {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                    </span>
                  </div>
                  <div className="text-slate-300 text-sm">
                    {renderArgs(log.args)}
                  </div>
                </div>
                <div className="flex flex-col items-end text-right">
                  <a
                    href={`https://etherscan.io/tx/${log.transactionHash}`} // Placeholder, replace with actual explorer
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm mt-1"
                    title="View Transaction on Explorer"
                  >
                    Tx: {log.transactionHash.slice(0, 6)}...{log.transactionHash.slice(-4)}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventLogPage;