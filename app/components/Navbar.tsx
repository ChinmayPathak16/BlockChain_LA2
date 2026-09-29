"use client";

import React, { useState } from "react";
import { formatEther } from "viem";
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { PRAISE_BOARD_ABI } from "../contracts/PraiseBoardABI";
import {
  Wallet,
  LogOut,
  Download,
  Sparkles,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";

interface NavbarProps {
  contractAddress: `0x${string}`;
}

export function Navbar({ contractAddress }: NavbarProps) {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();

  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);
  const [copiedContract, setCopiedContract] = useState(false);

  // Read contract owner & balance from PraiseBoard smart contract
  const { data: ownerAddress } = useReadContract({
    address: contractAddress,
    abi: PRAISE_BOARD_ABI,
    functionName: "owner",
  });

  const { data: rawContractBalance, refetch: refetchBalance } = useReadContract({
    address: contractAddress,
    abi: PRAISE_BOARD_ABI,
    functionName: "contractBalance",
  });

  const isOwner =
    isConnected &&
    address &&
    ownerAddress &&
    address.toLowerCase() === (ownerAddress as string).toLowerCase();

  const contractBalanceEth = rawContractBalance ? formatEther(rawContractBalance as bigint) : "0.0";

  const handleCopyContract = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  const handleWithdraw = async () => {
    if (!isOwner) return;
    setWithdrawMsg(null);
    setIsWithdrawing(true);

    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: PRAISE_BOARD_ABI,
        functionName: "withdraw",
      });

      setWithdrawMsg(`Withdraw transaction sent: ${hash.substring(0, 10)}...`);
      refetchBalance();
    } catch (err: any) {
      console.error("Withdraw error:", err);
      setWithdrawMsg(err?.shortMessage || err?.message || "Withdrawal failed.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatAddress = (addr: string) => `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-2xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand logo & tagline */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white tracking-tight">The Praise Board</h1>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                Eth Sepolia
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              City Bus Timetable Commuter Tip Jar & Live Wall
            </p>
          </div>
        </div>

        {/* Contract stats & Wallet Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Contract Address Pill */}
          <button
            onClick={handleCopyContract}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
            title="Click to copy contract address"
          >
            <span>Contract: {formatAddress(contractAddress)}</span>
            {copiedContract ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Contract Balance Pill */}
          <div className="hidden sm:flex flex-col items-end px-3.5 py-1.5 bg-slate-900/80 border border-slate-800 rounded-xl">
            <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">
              Contract Balance
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {contractBalanceEth} ETH
            </span>
          </div>

          {/* Owner Withdraw Button (Visible ONLY to contract owner / Ifeoma) */}
          {isOwner && (
            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing || !rawContractBalance || (rawContractBalance as bigint) === 0n}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/10 disabled:opacity-50 cursor-pointer"
            >
              {isWithdrawing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Owner Withdraw</span>
            </button>
          )}

          {/* Wallet Connection */}
          {isConnected && address ? (
            <div className="flex items-center gap-2">
              <div className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    chain?.id === sepolia.id || chain?.id === 31337
                      ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                      : "bg-amber-400 animate-ping"
                  }`}
                />
                <span className="font-mono text-xs font-bold text-slate-200">
                  {formatAddress(address)}
                </span>
              </div>

              <button
                onClick={() => disconnect()}
                className="p-2 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 hover:border-rose-500/30 rounded-xl transition-colors cursor-pointer"
                title="Disconnect Wallet"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              {connectors.length > 0 ? (
                <button
                  onClick={() => connect({ connector: connectors[0] })}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Connect Wallet</span>
                </button>
              ) : (
                <button
                  onClick={() => alert("Please install MetaMask or another Web3 browser extension.")}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Install Wallet
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {withdrawMsg && (
        <div className="bg-amber-500/10 border-t border-amber-500/20 py-2 px-4 text-center text-xs text-amber-300 font-mono">
          {withdrawMsg}
        </div>
      )}
    </header>
  );
}
