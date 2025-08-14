
"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

type FilterRange = 'all' | 'today' | 'yesterday' | 'monthly' | 'yearly';

interface RecentTransactionsProps {
  filter?: FilterRange;
}

export function RecentTransactions({ filter = 'all' }: RecentTransactionsProps) {
  const [recentTransactions, setRecentTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"), limit(50)); // Get more transactions for filtering
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const transactions: Transaction[] = [];
        querySnapshot.forEach((doc) => {
            transactions.push({ ...doc.data(), id: doc.id } as Transaction);
        });
        
        // Filter transactions based on the selected time period
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
        
        // Take only the first 5 for display
        setRecentTransactions(filteredTransactions.slice(0, 5));
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching recent transactions:", error);
        setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [filter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>
          {filter === 'all' && "An overview of the latest transactions."}
          {filter === 'today' && "Today's transactions."}
          {filter === 'yesterday' && "Yesterday's transactions."}
          {filter === 'monthly' && "This month's transactions."}
          {filter === 'yearly' && "This year's transactions."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
           <div className="flex items-center justify-center p-8">
             <Loader2 className="h-6 w-6 animate-spin text-primary" />
           </div>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Game Account</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Tag</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentTransactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell>
                  <div className="font-medium">{tx.playerName}</div>
                </TableCell>
                <TableCell>{tx.gameName}</TableCell>
                <TableCell>{tx.staffName}</TableCell>
                <TableCell>{tx.type}</TableCell>
                <TableCell>{tx.paymentMethod || 'N/A'}</TableCell>
                <TableCell className="font-mono">{tx.paymentTag || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  {tx.type === 'Deposit' || tx.type === 'Withdraw' ? '$' : ''}
                  {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            ))}
             {recentTransactions.length === 0 && !isLoading && (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        {filter === 'all' && "No recent transactions found."}
                        {filter === 'today' && "No transactions today."}
                        {filter === 'yesterday' && "No transactions yesterday."}
                        {filter === 'monthly' && "No transactions this month."}
                        {filter === 'yearly' && "No transactions this year."}
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  );
}
