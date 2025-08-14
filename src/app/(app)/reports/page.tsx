
"use client";

import * as React from "react";
import { ReportsTable } from "@/components/reports/reports-table";
import { Button } from "@/components/ui/button";
import { Calendar, Download } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Gift, Award, Users, Gamepad2, Loader2 } from "lucide-react";
import { usePlayersStore } from "@/hooks/use-players-store";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Transaction, Staff } from "@/lib/types";


export default function ReportsPage() {
    const { players, isLoading: playersLoading, statusCounts } = usePlayersStore();
    const [staff, setStaff] = React.useState<Staff[]>([]);
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const staffQuery = query(collection(db, "staff"));
        const transactionsQuery = query(collection(db, "transactions"));

        const unsubStaff = onSnapshot(staffQuery, snapshot => {
            setStaff(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Staff)));
            setLoading(false);
        });
        const unsubTransactions = onSnapshot(transactionsQuery, snapshot => {
            setTransactions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction)));
            setLoading(false);
        });

        return () => {
            unsubStaff();
            unsubTransactions();
        }
    }, []);

    const stats = React.useMemo(() => {
        const totalDeposit = transactions.filter(t => t.type === 'Deposit').reduce((acc, t) => acc + t.amount, 0);
        const totalWithdraw = transactions.filter(t => t.type === 'Withdraw').reduce((acc, t) => acc + t.amount, 0);
        const netPnL = totalDeposit - totalWithdraw;
        const totalFreeplay = transactions.filter(t => t.type === 'Freeplay').reduce((acc, t) => acc + t.amount, 0);
        const totalBonusplay = transactions.filter(t => t.type === 'Bonusplay').reduce((acc, t) => acc + t.amount, 0);
        
        return { totalDeposit, totalWithdraw, netPnL, totalFreeplay, totalBonusplay };
    }, [transactions]);

  if (playersLoading || loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
        <h1 className="text-lg font-semibold md:text-2xl">Reports</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <SummaryCard title="Total Deposit" value={`$${stats.totalDeposit.toLocaleString()}`} icon={ArrowDownLeft} />
            <SummaryCard title="Total Withdraw" value={`$${stats.totalWithdraw.toLocaleString()}`} icon={ArrowUpRight} />
            <SummaryCard title="Net P&L" value={`$${stats.netPnL.toLocaleString()}`} icon={CircleDollarSign} />
            <SummaryCard title="Total Freeplay" value={stats.totalFreeplay.toLocaleString()} icon={Gift} />
            <SummaryCard title="Total Bonusplay" value={stats.totalBonusplay.toLocaleString()} icon={Award} />
            <SummaryCard title="Active Players" value={statusCounts.Active.toString()} icon={Users} />
        </div>
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                Date range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              {/* Calendar component would go here */}
              <div className="p-4">Select a date range</div>
            </PopoverContent>
          </Popover>
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Player" />
            </SelectTrigger>
            <SelectContent>
              {players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Staff" />
            </SelectTrigger>
            <SelectContent>
              {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>
      <ReportsTable />
    </div>
  );
}
