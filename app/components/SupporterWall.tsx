"use client";

import React, { useState, useMemo } from "react";
import { SupporterEntry } from "../hooks/useSupporterWall";
import {
  MessageSquare,
  RefreshCw,
  Sparkles,
  Clock,
  CheckCircle,
  Copy,
  Check,
  Search,
  SlidersHorizontal,
  Flame,
  Award,
  ExternalLink,
} from "lucide-react";

interface SupporterWallProps {
  entries: SupporterEntry[];
  isLoading: boolean;
  onRefresh: () => void;
}

// Generate deterministic avatar gradient colors from Ethereum address
function getAvatarGradient(address: string) {
  const hash = address.toLowerCase().replace("0x", "");
  const charCode1 = hash.charCodeAt(0) || 65;
  const charCode2 = hash.charCodeAt(hash.length - 1) || 90;

  const gradients = [
    "from-indigo-500 to-purple-600",
    "from-pink-500 to-rose-600",
    "from-amber-400 to-orange-500",
    "from-emerald-400 to-teal-600",
    "from-cyan-400 to-blue-600",
    "from-violet-500 to-fuchsia-600",
  ];

  const index = (charCode1 + charCode2) % gradients.length;
  return gradients[index];
}

export function SupporterWall({ entries, isLoading, onRefresh }: SupporterWallProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"recent" | "top">("recent");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatTime = (ts: number) => {
    if (!ts) return "Recently";
    const date = new Date(ts * 1000);
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSecs < 60) return "Just now";
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // Filter & sort entries
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (e) =>
          e.sender.toLowerCase().includes(q) ||
          e.note.toLowerCase().includes(q) ||
          e.amount.includes(q)
      );
    }

    if (filterMode === "top") {
      result.sort((a, b) => {
        if (b.rawAmount > a.rawAmount) return 1;
        if (b.rawAmount < a.rawAmount) return -1;
        return b.timestamp - a.timestamp;
      });
    } else {
      // Default: Most recent first (optimistic stays on top)
      result.sort((a, b) => {
        if (a.isOptimistic && !b.isOptimistic) return -1;
        if (!a.isOptimistic && b.isOptimistic) return 1;
        return b.timestamp - a.timestamp;
      });
    }

    return result;
  }, [entries, searchTerm, filterMode]);

  // Aggregate stats
  const totalEthRaised = useMemo(() => {
    const totalWei = entries.reduce((acc, curr) => acc + curr.rawAmount, 0n);
    return (Number(totalWei) / 1e18).toFixed(4);
  }, [entries]);

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col h-full relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="pb-5 mb-5 border-b border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Supporter Wall</h2>
              <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                <Sparkles className="w-3 h-3 text-indigo-400" /> Event-Log Verified
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Populated strictly from decoded on-chain <code className="text-pink-400 font-mono">TipReceived</code> events
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2.5 text-slate-400 hover:text-white bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all shadow-sm"
              title="Refresh event logs from Ethereum Sepolia"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-2.5 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Supporters
            </span>
            <span className="text-base font-bold text-white font-mono">{entries.length}</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-2.5 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Total Tips
            </span>
            <span className="text-base font-bold text-emerald-400 font-mono">
              {totalEthRaised} ETH
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-2.5 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Source
            </span>
            <span className="text-xs font-bold text-indigo-300 font-mono flex items-center justify-center gap-1 mt-0.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> EVM Logs
            </span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notes or commuter addresses..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 w-full sm:w-auto">
            <button
              onClick={() => setFilterMode("recent")}
              className={`flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                filterMode === "recent"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              Latest
            </button>
            <button
              onClick={() => setFilterMode("top")}
              className={`flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                filterMode === "top"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Top Tips</span>
            </button>
          </div>
        </div>
      </div>

      {/* Supporter Wall Content List */}
      <div className="flex-1 space-y-3 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
        {isLoading && entries.length === 0 ? (
          <div className="py-20 text-center text-slate-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
            <p className="text-sm font-medium">Scanning Ethereum Sepolia event logs...</p>
            <p className="text-xs text-slate-600">Verifying immutable TipReceived records</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-800/80 rounded-2xl p-8 space-y-3">
            <MessageSquare className="w-10 h-10 mx-auto text-slate-600" />
            <h3 className="text-base font-semibold text-slate-300">
              {searchTerm ? "No Matches Found" : "No Supporters Yet"}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              {searchTerm
                ? "Try searching for a different keyword or address."
                : "Be the very first commuter to leave a tip and record your note permanently on the Praise Board!"}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className={`p-4 rounded-2xl border transition-all duration-300 group ${
                entry.isOptimistic
                  ? "bg-amber-500/5 border-amber-500/30 animate-pulse ring-1 ring-amber-500/20"
                  : "bg-slate-950/60 hover:bg-slate-950/90 border-slate-800/80 hover:border-slate-700 hover:shadow-lg"
              }`}
            >
              {/* Top Row: Sender Avatar, Address, Tip Pill, Timestamp */}
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getAvatarGradient(
                      entry.sender
                    )} flex items-center justify-center text-white text-[11px] font-mono font-bold shadow-md shadow-indigo-500/10 shrink-0`}
                  >
                    {entry.sender.substring(2, 4).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://sepolia.etherscan.io/address/${entry.sender}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs font-bold text-slate-200 hover:text-indigo-400 transition-colors"
                        title="View address on Sepolia Etherscan"
                      >
                        {formatAddress(entry.sender)}
                      </a>
                      <button
                        onClick={() => handleCopy(entry.sender, `addr-${entry.id}`)}
                        className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                        title="Copy sender address"
                      >
                        {copiedId === `addr-${entry.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-xs rounded-xl shadow-sm">
                    +{entry.amount} ETH
                  </span>

                  {entry.isOptimistic ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                      <Clock className="w-3 h-3 animate-spin" /> Pending...
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" /> {formatTime(entry.timestamp)}
                    </span>
                  )}
                </div>
              </div>

              {/* Note Message Content */}
              {entry.note ? (
                <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800/60 mt-2 text-sm text-slate-200 leading-relaxed font-sans break-words">
                  &ldquo;{entry.note}&rdquo;
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic mt-1 px-1">
                  (Commuter tipped without leaving a note)
                </p>
              )}

              {/* Footer Row: Log Decoded Verification & Etherscan Link */}
              <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-800/40 text-[10px] text-slate-500">
                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>On-Chain Verified Event</span>
                </span>

                {entry.txHash && (
                  <div className="flex items-center gap-1">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${entry.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
                    >
                      <span>tx: {entry.txHash.substring(0, 8)}...</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
