
"use client";

import * as React from "react";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { LowBalanceAlerts } from "@/components/dashboard/low-balance-alerts";
import type { Player, Transaction, Game } from "@/lib/types";
import {
  Users,
  UserPlus,
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Gift,
  Award,
  Activity,
  Loader2,
  Gamepad2,
  Target,
  BarChart,
  Repeat,
  UserX
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { usePlayersStore } from "@/hooks/use-players-store";
import { useFirebaseCollection } from "@/hooks/use-firebase-cache";

type FilterRange = 'all' | 'today' | 'yesterday' | 'monthly' | 'yearly';

export default function DashboardPage() {
  const { newPlayers, players, isLoading: playersLoading } = usePlayersStore();
  const { data: transactions, isLoading: loadingTransactions } = useFirebaseCollection<Transaction>('transactions');
  const { data: games, isLoading: loadingGames } = useFirebaseCollection<Game>('games');
  const [filter, setFilter] = React.useState<FilterRange>('all');

  const stats = React.useMemo(() => {
    let filteredTransactions = transactions;
    const now = new Date();

    switch (filter) {
        case 'today':
            filteredTransactions = transactions.filter(t => new Date(t.date) >= startOfDay(now));
            break;
        case 'yesterday':
            const yesterday = subDays(now, 1);
            filteredTransactions = transactions.filter(t => {
                const txDate = new Date(t.date);
                return txDate >= startOfDay(yesterday) && txDate <= endOfDay(yesterday);
            });
            break;
        case 'monthly':
            filteredTransactions = transactions.filter(t => {
                const txDate = new Date(t.date);
                return txDate >= startOfMonth(now) && txDate <= endOfMonth(now);
            });
            break;
        case 'yearly':
            filteredTransactions = transactions.filter(t => {
                const txDate = new Date(t.date);
                return txDate >= startOfYear(now) && txDate <= endOfYear(now);
            });
            break;
        default: // 'all'
            break;
    }
    
    const oneDayAgo = subDays(now, 1).getTime();

    const totalDeposits = filteredTransactions.filter(t => t.type === 'Deposit').reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = filteredTransactions.filter(t => t.type === 'Withdraw').reduce((sum, t) => sum + t.amount, 0);
    const pnl24h = transactions.filter(t => new Date(t.date).getTime() >= oneDayAgo)
        .reduce((sum, t) => t.type === 'Deposit' ? sum + t.amount : t.type === 'Withdraw' ? sum - t.amount : sum, 0);

    return {
        totalPlayers: players.length,
        newPlayers: newPlayers.length,
        activePlayers: players.filter(p => p.status === 'Active').length,
        inactivePlayers: players.filter(p => p.status === 'Inactive').length,
        totalGames: games.length,
        totalDeposits: totalDeposits,
        totalWithdrawals: totalWithdrawals,
        netPnL: totalDeposits - totalWithdrawals,
        pnl24h: pnl24h,
        cashAppIn: filteredTransactions.filter(t => t.type === 'Deposit' && t.paymentMethod === 'CashApp').reduce((sum, t) => sum + t.amount, 0),
        cashAppOut: filteredTransactions.filter(t => t.type === 'Withdraw' && t.paymentMethod === 'CashApp').reduce((sum, t) => sum + t.amount, 0),
        chimeIn: filteredTransactions.filter(t => t.type === 'Deposit' && t.paymentMethod === 'Chime').reduce((sum, t) => sum + t.amount, 0),
        chimeOut: filteredTransactions.filter(t => t.type === 'Withdraw' && t.paymentMethod === 'Chime').reduce((sum, t) => sum + t.amount, 0),
    };
  }, [transactions, players, newPlayers, games, filter]);

  if (loadingTransactions || loadingGames || playersLoading) {
      return (
          <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterRange)}>
          <TabsList>
            <TabsTrigger value="all">All Time</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        <SummaryCard title="Total Players" value={stats.totalPlayers.toString()} icon={Users} />
        <SummaryCard title="Active Players" value={stats.activePlayers.toString()} icon={Activity} />
        <SummaryCard title="New Players" value={stats.newPlayers.toString()} icon={UserPlus} />
        <SummaryCard title="Inactive Players" value={stats.inactivePlayers.toString()} icon={UserX} />
        <SummaryCard title="Total Deposits" value={`$${stats.totalDeposits.toLocaleString()}`} icon={ArrowDownLeft} />
        <SummaryCard title="Total Withdrawals" value={`$${stats.totalWithdrawals.toLocaleString()}`} icon={ArrowUpRight} />
        <SummaryCard title="Net P&L" value={`$${stats.netPnL.toLocaleString()}`} icon={CircleDollarSign} />
        <SummaryCard title="24H P&L" value={`$${stats.pnl24h.toLocaleString()}`} icon={CircleDollarSign} />
        <SummaryCard title="Total Games" value={stats.totalGames.toString()} icon={Gamepad2} />
        <SummaryCard title="Cashapp In & Out" value={`$${stats.cashAppIn.toLocaleString()} / $${stats.cashAppOut.toLocaleString()}`} icon={Repeat} />
        <SummaryCard title="Chime In & Out" value={`$${stats.chimeIn.toLocaleString()} / $${stats.chimeOut.toLocaleString()}`} icon={Repeat} />
        <SummaryCard title="Monthly Target" value="$0" icon={Target} />
      </div>
      <div className="space-y-6">
        <LowBalanceAlerts />
        <RecentTransactions />
      </div>
    </div>
  );
}
