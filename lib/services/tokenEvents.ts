
import { PublicClient, Address, decodeEventLog } from 'viem';
import { ADRS, ABIS } from '../contracts';
import { ContractEvent } from '../../types';

export function watchTokenEvents(publicClient: PublicClient, addEvent: (event: ContractEvent) => void) {
  if (!ADRS.token) {
    console.warn("Token contract address not set, cannot watch events.");
    return () => {}; // Return a no-op unsubscribe function
  }

  const unwatchApproval = publicClient.watchContractEvent({
    address: ADRS.token,
    abi: ABIS.token,
    eventName: 'Approval',
    onLogs: (logs) => {
      logs.forEach(log => {
        try {
          const decoded = decodeEventLog({
            abi: ABIS.token,
            data: log.data,
            topics: log.topics,
          });
          // Fix: Check if decoded is not null/undefined and has 'args' property
          if (decoded && 'args' in decoded) {
            addEvent({
              timestamp: new Date().toISOString(),
              contract: 'token',
              event: 'Approval',
              args: decoded.args as Record<string, any>,
              transactionHash: log.transactionHash as Address,
            });
          }
        } catch (e) {
          console.error("Error decoding Token Approval event:", e);
        }
      });
    },
  });

  const unwatchTransfer = publicClient.watchContractEvent({
    address: ADRS.token,
    abi: ABIS.token,
    eventName: 'Transfer',
    onLogs: (logs) => {
      logs.forEach(log => {
        try {
          const decoded = decodeEventLog({
            abi: ABIS.token,
            data: log.data,
            topics: log.topics,
          });
          // Fix: Check if decoded is not null/undefined and has 'args' property
          if (decoded && 'args' in decoded) {
            addEvent({
              timestamp: new Date().toISOString(),
              contract: 'token',
              event: 'Transfer',
              args: decoded.args as Record<string, any>,
              transactionHash: log.transactionHash as Address,
            });
          }
        } catch (e) {
          console.error("Error decoding Token Transfer event:", e);
        }
      });
    },
  });

  return () => {
    unwatchApproval();
    unwatchTransfer();
  };
}