"use client";

import React, { useState } from "react";
import { Navbar } from "./components/Navbar";
import { TipForm } from "./components/TipForm";
import { SupporterWall } from "./components/SupporterWall";
import { useSupporterWall } from "./hooks/useSupporterWall";
import { DEFAULT_PRAISE_BOARD_ADDRESS } from "./contracts/PraiseBoardABI";
import { Bus, ShieldCheck, Zap, Database, HeartHandshake } from "lucide-react";

export default function Home() {
  const [contractAddress] = useState<`0x${string}`>(
    (process.env.NEXT_PUBLIC_PRAISE_BOARD_ADDRESS as `0x${string}`) || DEFAULT_PRAISE_BOARD_ADDRESS
  );

  const { wallEntries, isLoading, refetchLogs, addOptimisticTip } = useSupporterWall(contractAddress);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar contractAddress={contractAddress} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-slate-800 p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Bus className="w-3.5 h-3.5" /> Ifeoma&apos;s Bus Timetable Praise Board
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Support the Commuter Timetable Service with On-Chain Tips
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Every day, thousands rely on live bus timetable updates. Send a small ETH tip with an encouraging note to keep the service running. Your support is recorded immutably on Ethereum Sepolia and displayed on our live wall.
            </p>

            {/* Architecture Highlights */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <Database className="w-4 h-4 text-indigo-400 shrink-0" />
                <span><strong>100% Log-Driven:</strong> Wall entries query decoded smart contract logs.</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Contract Protected:</strong> CEI & 280-byte note limit enforced on-chain.</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>Reconciled UI:</strong> Optimistic Broadcast reconciled against receipt logs.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Core DApp Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Tip Form Panel */}
          <div className="lg:col-span-5">
            <TipForm
              contractAddress={contractAddress}
              onOptimisticTipAdded={addOptimisticTip}
              onSuccess={refetchLogs}
            />
          </div>

          {/* Supporter Wall Panel */}
          <div className="lg:col-span-7">
            <SupporterWall
              entries={wallEntries}
              isLoading={isLoading}
              onRefresh={refetchLogs}
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-indigo-400" />
            <span>The Praise Board — Zero-to-One Tech Builder Series</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Sepolia Contract:</span>
            <a
              href={`https://sepolia.etherscan.io/address/${contractAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:underline"
            >
              {contractAddress.substring(0, 8)}...{contractAddress.substring(contractAddress.length - 6)}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
