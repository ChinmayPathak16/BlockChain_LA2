import { useState, useEffect, useCallback, useRef } from "react";
import { formatEther, parseAbiItem, Log } from "viem";
import { publicClient } from "../lib/wagmi";
import { PRAISE_BOARD_ABI } from "../contracts/PraiseBoardABI";

export interface SupporterEntry {
  id: string;
  sender: string;
  amount: string;
  rawAmount: bigint;
  note: string;
  timestamp: number;
  txHash: string;
  blockNumber: bigint;
  isOptimistic?: boolean;
}

const tipReceivedEventAbiItem = parseAbiItem(
  "event TipReceived(address indexed sender, uint256 amount, string note, uint256 timestamp)"
);

// Fallback deployment block if not supplied via env
const envDeploymentBlock = process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK;
const DEFAULT_DEPLOYMENT_BLOCK = envDeploymentBlock ? BigInt(envDeploymentBlock) : 11800000n;

// Default chunk size per eth_getLogs call
const INITIAL_BLOCK_CHUNK = 2000n;

function decodeLogs(logs: Log<bigint, number, false, typeof tipReceivedEventAbiItem, undefined>[]): SupporterEntry[] {
  return logs.map((log) => {
    const args = log.args as { sender?: string; amount?: bigint; note?: string; timestamp?: bigint } | undefined;
    const sender = args?.sender || "0x0000000000000000000000000000000000000000";
    const amount = args?.amount ?? 0n;
    const note = args?.note || "";
    const timestamp = Number(args?.timestamp || 0n);

    return {
      id: `${log.transactionHash || "0x0"}-${log.logIndex ?? 0}`,
      sender,
      amount: formatEther(amount),
      rawAmount: amount,
      note,
      timestamp: timestamp > 0 ? timestamp : Math.floor(Date.now() / 1000),
      txHash: (log.transactionHash as string) || "",
      blockNumber: log.blockNumber || 0n,
      isOptimistic: false,
    };
  });
}

export function useSupporterWall(contractAddress: `0x${string}`) {
  const [logsEntries, setLogsEntries] = useState<SupporterEntry[]>([]);
  const [optimisticEntries, setOptimisticEntries] = useState<SupporterEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Tracks the highest block we've already scanned, so polling never re-walks the whole chain
  const lastScannedBlockRef = useRef<bigint | null>(null);
  // Accumulates decoded entries across both the initial scan and subsequent incremental polls
  const allEntriesRef = useRef<Map<string, SupporterEntry>>(new Map());

  const reconcileOptimistic = useCallback((confirmed: SupporterEntry[]) => {
    const confirmedHashes = new Set(confirmed.map((e) => e.txHash.toLowerCase()));
    setOptimisticEntries((prev) =>
      prev.filter((opt) => !confirmedHashes.has(opt.txHash.toLowerCase()))
    );
  }, []);

  const publishEntries = useCallback(() => {
    const merged = Array.from(allEntriesRef.current.values());
    merged.sort((a, b) => b.timestamp - a.timestamp);
    if (isMountedRef.current) {
      setLogsEntries(merged);
      reconcileOptimistic(merged);
    }
  }, [reconcileOptimistic]);

  // Robust log scanner with adaptive block chunking to respect RPC limits
  const scanLogsInRange = useCallback(
    async (fromBlock: bigint, toBlock: bigint) => {
      let currentFrom = fromBlock;
      let chunkSize = INITIAL_BLOCK_CHUNK;

      while (currentFrom <= toBlock) {
        const currentTo =
          currentFrom + chunkSize - 1n > toBlock ? toBlock : currentFrom + chunkSize - 1n;

        try {
          const logs = await publicClient.getLogs({
            address: contractAddress,
            event: tipReceivedEventAbiItem,
            fromBlock: currentFrom,
            toBlock: currentTo,
          });

          for (const entry of decodeLogs(logs)) {
            allEntriesRef.current.set(entry.id, entry);
          }

          currentFrom = currentTo + 1n;
        } catch (err: unknown) {
          // If RPC rejects large block range (e.g., query returned more than limit), dynamically halve chunk size
          const errStr = String(err).toLowerCase();
          if (
            (errStr.includes("limit") ||
              errStr.includes("range") ||
              errStr.includes("block") ||
              errStr.includes("more than") ||
              errStr.includes("-32005") ||
              errStr.includes("-32602")) &&
            chunkSize > 10n
          ) {
            chunkSize = chunkSize / 4n;
            console.warn(`Adjusting getLogs chunk size down to ${chunkSize} blocks due to RPC limit.`);
          } else {
            console.error("Error fetching logs for range:", currentFrom, currentTo, err);
            // Advance past failed chunk to avoid infinite stall
            currentFrom = currentTo + 1n;
          }
        }
      }
    },
    [contractAddress]
  );

  // One-time walk from deployment block to the current chain tip
  const fetchHistoricalLogs = useCallback(async () => {
    if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const currentBlock = await publicClient.getBlockNumber();

      let from = DEFAULT_DEPLOYMENT_BLOCK;
      // If deployed recently or on local testnet where currentBlock is lower than default
      if (from > currentBlock) {
        from = 0n;
      }

      await scanLogsInRange(from, currentBlock);

      lastScannedBlockRef.current = currentBlock;
      publishEntries();
      if (isMountedRef.current) setIsLoading(false);
    } catch (err: unknown) {
      console.error("Error fetching supporter wall event logs:", err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load supporter event logs");
        setIsLoading(false);
      }
    }
  }, [contractAddress, publishEntries, scanLogsInRange]);

  // Ongoing polling: only fetch blocks mined since the last scan
  const fetchIncrementalLogs = useCallback(async () => {
    if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
      return;
    }
    if (lastScannedBlockRef.current === null) {
      return;
    }

    try {
      const currentBlock = await publicClient.getBlockNumber();
      const from = lastScannedBlockRef.current + 1n;

      if (from > currentBlock) {
        return;
      }

      await scanLogsInRange(from, currentBlock);

      lastScannedBlockRef.current = currentBlock;
      publishEntries();
    } catch (err: unknown) {
      console.error("Error fetching incremental supporter wall logs:", err);
    }
  }, [contractAddress, publishEntries, scanLogsInRange]);

  // Add an optimistic pending tip during broadcast
  const addOptimisticTip = useCallback(
    (entry: Omit<SupporterEntry, "id" | "blockNumber" | "isOptimistic">) => {
      const optimisticItem: SupporterEntry = {
        ...entry,
        id: `opt-${entry.txHash}`,
        blockNumber: 0n,
        isOptimistic: true,
      };

      setOptimisticEntries((prev) => [optimisticItem, ...prev]);
    },
    []
  );

  // Set up initial scan, polling & live event watching
  useEffect(() => {
    isMountedRef.current = true;
    allEntriesRef.current = new Map();
    lastScannedBlockRef.current = null;

    fetchHistoricalLogs();

    // Poll every 5 seconds for new blocks
    const interval = setInterval(() => {
      fetchIncrementalLogs();
    }, 5000);

    // Subscribe to real-time events for instant updates between polls
    let unwatch: (() => void) | undefined;
    if (contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000") {
      try {
        unwatch = publicClient.watchContractEvent({
          address: contractAddress,
          abi: PRAISE_BOARD_ABI,
          eventName: "TipReceived",
          onLogs: () => {
            fetchIncrementalLogs();
          },
        });
      } catch (e) {
        console.warn("Event subscription setup failed, falling back to polling:", e);
      }
    }

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (unwatch) unwatch();
    };
  }, [contractAddress, fetchHistoricalLogs, fetchIncrementalLogs]);

  // Combine confirmed logs with non-reconciled optimistic pending tips
  const confirmedHashes = new Set(logsEntries.map((e) => e.txHash.toLowerCase()));
  const activeOptimistic = optimisticEntries.filter(
    (opt) => !confirmedHashes.has(opt.txHash.toLowerCase())
  );

  const combinedWall = [...activeOptimistic, ...logsEntries];

  return {
    wallEntries: combinedWall,
    isLoading,
    error,
    refetchLogs: fetchHistoricalLogs,
    addOptimisticTip,
  };
}