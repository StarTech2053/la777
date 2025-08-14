
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
import { Loader2, ArrowDownLeft, ArrowUpRight, Gift, Award, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function RecentTransactions() {
  const [recentTransactions, setRecentTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const transactions: Transaction[] = [];
        querySnapshot.forEach((doc) => {
            transactions.push({ ...doc.data(), id: doc.id } as Transaction);
        });
        setRecentTransactions(transactions);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching recent transactions:", error);
        setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'Deposit':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'Withdraw':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'Freeplay':
        return <Gift className="h-4 w-4 text-blue-500" />;
      case 'Bonusplay':
        return <Award className="h-4 w-4 text-purple-500" />;
      case 'Referral':
        return <Users className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'Deposit':
        return <Badge variant="default" className="bg-green-100 text-green-800">Deposit</Badge>;
      case 'Withdraw':
        return <Badge variant="destructive">Withdraw</Badge>;
      case 'Freeplay':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Freeplay</Badge>;
      case 'Bonusplay':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Bonusplay</Badge>;
      case 'Referral':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Referral</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
        <CardDescription>Latest player activities including deposits, withdrawals, and bonuses.</CardDescription>
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
              <TableHead>Activity</TableHead>
              <TableHead>Game</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentTransactions.map((tx) => (
              <TableRow key={tx.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="font-medium">{tx.playerName}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTransactionIcon(tx.type)}
                    {getTransactionBadge(tx.type)}
                  </div>
                </TableCell>
                <TableCell>{tx.gameName || 'N/A'}</TableCell>
                <TableCell>{tx.staffName || 'N/A'}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{tx.paymentMethod || 'N/A'}</div>
                    {tx.paymentTag && (
                      <div className="text-xs text-muted-foreground font-mono">{tx.paymentTag}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(tx.date)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className={cn(
                    "font-medium",
                    tx.type === 'Deposit' ? "text-green-600" : 
                    tx.type === 'Withdraw' ? "text-red-600" : 
                    "text-blue-600"
                  )}>
                    {tx.type === 'Deposit' || tx.type === 'Withdraw' ? '$' : ''}
                    {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </TableCell>
              </TableRow>
            ))}
             {recentTransactions.length === 0 && !isLoading && (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        No recent activities found.
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
