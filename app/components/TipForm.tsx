"use client";

import React, { useState } from "react";
import { parseEther, formatEther } from "viem";
import { useAccount, useWriteContract, useSwitchChain, usePublicClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { publicClient as defaultPublicClient } from "../lib/wagmi";
import { PRAISE_BOARD_ABI } from "../contracts/PraiseBoardABI";
import { SupporterEntry } from "../hooks/useSupporterWall";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Send,
  ShieldAlert,
  Wallet,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface TipFormProps {
  contractAddress: `0x${string}`;
  onOptimisticTipAdded: (tip: Omit<SupporterEntry, "id" | "blockNumber" | "isOptimistic">) => void;
  onSuccess: () => void;
}

const PRESET_AMOUNTS = [
  { eth: "0.001", usd: "~$3.20" },
  { eth: "0.005", usd: "~$16.00" },
  { eth: "0.01", usd: "~$32.00" },
  { eth: "0.05", usd: "~$160.00" },
];

const SUGGESTED_NOTES = [
  "Thanks for keeping route 42 on time!",
  "Lifesaver on freezing mornings!",
  "Ifeoma, the city owes you a medal!",
  "Cheaper than missing my connection!",
];

export function TipForm({ contractAddress, onOptimisticTipAdded, onSuccess }: TipFormProps) {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClientHook = usePublicClient();
  const activeClient = publicClientHook || defaultPublicClient;

  const [amount, setAmount] = useState<string>("0.005");
  const [note, setNote] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "submitting" | "mining" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const MAX_NOTE_LENGTH = 280;
  // If chain is not Sepolia (and not local Hardhat in dev)
  const isWrongNetwork = isConnected && chain?.id !== sepolia.id && chain?.id !== 31337;
  const charsRemaining = MAX_NOTE_LENGTH - note.length;

  const handlePresetAmount = (preset: string) => {
    setAmount(preset);
  };

  const handleSuggestedNote = (suggested: string) => {
    setNote(suggested);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isConnected || !address) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }

    if (isWrongNetwork) {
      setErrorMessage("Please switch your wallet network to Ethereum Sepolia.");
      return;
    }

    if (note.length > MAX_NOTE_LENGTH) {
      setErrorMessage(`Note exceeds maximum length of ${MAX_NOTE_LENGTH} characters.`);
      return;
    }

    let parsedValue: bigint;
    try {
      parsedValue = parseEther(amount);
      if (parsedValue <= 0n) {
        setErrorMessage("Please enter a valid tip amount greater than 0 ETH.");
        return;
      }
    } catch {
      setErrorMessage("Invalid ETH amount entered.");
      return;
    }

    try {
      setStatus("submitting");
      setTxHash(null);

      // 1. Send transaction to contract
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: PRAISE_BOARD_ABI,
        functionName: "tip",
        args: [note],
        value: parsedValue,
      });

      setTxHash(hash);
      setStatus("mining");

      // 2. Add optimistic tip to local UI state for instant visual feedback
      onOptimisticTipAdded({
        sender: address,
        amount: formatEther(parsedValue),
        rawAmount: parsedValue,
        note,
        timestamp: Math.floor(Date.now() / 1000),
        txHash: hash,
      });

      // 3. Inspect receipt status strictly
      const receipt = await activeClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "reverted") {
        setStatus("error");
        setErrorMessage("The transaction failed on-chain (reverted by the network or contract).");
      } else {
        setStatus("success");
        setNote("");
        onSuccess();
      }
    } catch (err: any) {
      console.error("Tip transaction error:", err);
      setStatus("error");

      // Distinct handling for user rejection
      const isRejected =
        err?.code === 4001 ||
        err?.code === "ACTION_REJECTED" ||
        err?.name === "UserRejectedRequestError" ||
        (err?.message &&
          (err.message.toLowerCase().includes("rejected") ||
            err.message.toLowerCase().includes("user denied") ||
            err.message.toLowerCase().includes("declined")));

      if (isRejected) {
        setErrorMessage("You declined the request in your wallet.");
      } else {
        setErrorMessage(err?.shortMessage || err?.message || "Failed to complete transaction.");
      }
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Leave a Tip & Note</h2>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Directly funding Ifeoma&apos;s bus timetable server hosting
          </p>
        </div>
        <span className="px-3 py-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Sepolia Testnet
        </span>
      </div>

      {/* Network Switch Warning */}
      {isWrongNetwork && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-300 text-sm animate-fadeIn">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-200">Wrong Network Detected</p>
            <p className="text-xs text-amber-300/80 mt-1">
              You are currently connected to {chain?.name || "an unsupported network"}. Please switch to Ethereum Sepolia to send tips to the Praise Board.
            </p>

            {switchChain && (
              <button
                type="button"
                onClick={() => switchChain({ chainId: sepolia.id })}
                className="mt-3 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <span>Switch to Sepolia Network</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tip Presets & Custom Amount */}
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Select Tip Amount
            </label>
            <span className="text-[11px] text-slate-500 font-medium">100% goes directly to host</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset.eth}
                type="button"
                onClick={() => handlePresetAmount(preset.eth)}
                className={`py-2.5 px-3 rounded-xl border text-left transition-all ${
                  amount === preset.eth
                    ? "bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/30 text-white shadow-lg shadow-indigo-600/10"
                    : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700"
                }`}
              >
                <div className="text-xs font-mono font-bold">{preset.eth} ETH</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{preset.usd}</div>
              </button>
            ))}
          </div>

          {/* Custom Input */}
          <div className="relative">
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.005"
              disabled={status === "submitting" || status === "mining"}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono placeholder:text-slate-700"
            />
            <span className="absolute right-4 top-3 text-xs font-mono font-bold text-slate-400">
              ETH
            </span>
          </div>
        </div>

        {/* Note Input */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Commuter Note
            </label>
            <span
              className={`text-xs font-mono font-medium ${
                charsRemaining < 20
                  ? "text-rose-400 font-bold"
                  : charsRemaining < 50
                  ? "text-amber-400"
                  : "text-slate-500"
              }`}
            >
              {charsRemaining} / {MAX_NOTE_LENGTH}
            </span>
          </div>

          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={MAX_NOTE_LENGTH}
            placeholder="Write a warm note of thanks, shout out your bus route, or encourage Ifeoma..."
            disabled={status === "submitting" || status === "mining"}
            className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600 resize-none leading-relaxed"
          />

          {/* Suggested Note Chips */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {SUGGESTED_NOTES.map((suggested, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSuggestedNote(suggested)}
                className="text-[11px] px-2.5 py-1 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/40 rounded-lg transition-colors text-left"
              >
                &ldquo;{suggested}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-300 text-xs animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block text-rose-200">Transaction Notice</span>
              <p className="mt-0.5 text-rose-300/90 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success Alert Box */}
        {status === "success" && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-3 text-emerald-300 text-xs animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block text-emerald-200 text-sm">
                Tip Successfully Broadcast!
              </span>
              <p className="mt-1 text-emerald-300/90 leading-relaxed">
                Your tip and note are now immutably logged on Ethereum Sepolia. Your name and message are now permanently visible on the Praise Board.
              </p>
              {txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-emerald-400 hover:text-emerald-300 underline font-mono text-[11px]"
                >
                  <span>View on Sepolia Etherscan</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isConnected || isWrongNetwork || status === "submitting" || status === "mining"}
          className={`w-full py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 shadow-xl ${
            !isConnected
              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
              : isWrongNetwork
              ? "bg-amber-600/20 text-amber-300 border border-amber-500/30 cursor-not-allowed"
              : status === "submitting" || status === "mining"
              ? "bg-indigo-600 text-white cursor-wait opacity-90 shadow-indigo-600/30"
              : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 text-white shadow-indigo-500/25 active:scale-[0.99] cursor-pointer"
          }`}
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Confirming in Wallet...</span>
            </>
          ) : status === "mining" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
              <span>Mining on Ethereum Sepolia...</span>
            </>
          ) : !isConnected ? (
            <>
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet to Tip</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Send {amount} ETH Tip & Post Note</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
