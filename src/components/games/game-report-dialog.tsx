
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Game, Transaction, Recharge } from "@/lib/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Loader2 } from "lucide-react";
import { DateRangePickerDialog } from "../ui/date-range-picker-dialog";
import type { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

type MergedTransaction = (Transaction | Recharge) & { originalType: 'Transaction' | 'Recharge' };

interface ReportRow {
    id: string;
    date: string;
    player: string;
    staff: string;
    type: string;
    points: number;
    balanceBefore: number;
    balanceAfter: number;
}


interface GameReportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  game: Game | undefined;
}

const ITEMS_PER_PAGE = 5;

function ClientFormattedDate({ dateString }: { dateString: string }) {
  const [formattedDate, setFormattedDate] = React.useState<string>('');

  React.useEffect(() => {
    setFormattedDate(format(new Date(dateString), "Pp"));
  }, [dateString]);

  if (!formattedDate) {
    return null;
  }

  return <>{formattedDate}</>;
}


export function GameReportDialog({ isOpen, onOpenChange, game }: GameReportDialogProps) {
  const [reportRows, setReportRows] = React.useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (isOpen && game) {
      setIsLoading(true);
      let unsubscribe: (() => void) | null = null;
      
      // Use basic query without orderBy to avoid index issues
      const fetchTransactions = () => {
        try {
          const transactionsQuery = query(
            collection(db, "transactions"), 
            where("gameName", "==", game.name)
          );
          
          unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
            const transactions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
            // Sort manually since we can't use orderBy
            const sortedTransactions = transactions.sort((a, b) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            processTransactions(sortedTransactions);
          }, (error) => {
            console.error("Error fetching game transactions: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch game report.' });
            setIsLoading(false);
          });
        } catch (error) {
          console.error("Error setting up query:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch game report.' });
          setIsLoading(false);
        }
      };

      const processTransactions = (transactions: Transaction[]) => {
        // Combine transactions and recharges, then sort
        const gameRecharges = (game.rechargeHistory || []).map(r => ({ ...r, id: `recharge-${r.date}` }));
        const combined = [...transactions, ...gameRecharges].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        let finalBalance = game.balance;
        let runningBalance = finalBalance;
        
        const calculatedRows: ReportRow[] = combined.map(tx => {
            let balanceBefore, balanceAfter;
            
            // Use points field if available (for new transactions), otherwise use amount
            const transactionAmount = 'points' in tx ? tx.points : ('amount' in tx ? tx.amount : 0);
            const isCreditToGame = tx.type === 'Withdraw' || tx.type === 'Recharge'
            
            console.log("🔍 Processing transaction:", {
                id: tx.id,
                type: tx.type,
                amount: 'amount' in tx ? tx.amount : 'N/A',
                points: 'points' in tx ? tx.points : 'N/A',
                transactionAmount: transactionAmount
            });
            
            balanceAfter = runningBalance;
            
            if (isCreditToGame) {
                balanceBefore = runningBalance - transactionAmount;
            } else { // Deposit, Freeplay, etc.
                balanceBefore = runningBalance + transactionAmount;
            }
            
            runningBalance = balanceBefore;
            
            return {
                id: tx.id,
                date: tx.date,
                player: 'playerName' in tx ? tx.playerName : 'SYSTEM',
                staff: 'staffName' in tx ? (tx.staffName || 'SYSTEM') : 'SYSTEM',
                type: tx.type,
                points: transactionAmount,
                balanceBefore: balanceBefore,
                balanceAfter: balanceAfter
            };
        });

        setReportRows(calculatedRows);
        setIsLoading(false);
      };

      // Start fetching transactions
      fetchTransactions();
      
      return () => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    } else {
      setSearchQuery("");
      setReportRows([]);
      setCurrentPage(1);
    }
  }, [isOpen, game, toast]);
  
  const filteredTransactions = React.useMemo(() => {
    if (!searchQuery) return reportRows;
    const lowercasedQuery = searchQuery.toLowerCase();
    return reportRows.filter(tx => 
        tx.player.toLowerCase().includes(lowercasedQuery) ||
        tx.staff.toLowerCase().includes(lowercasedQuery) ||
        tx.type.toLowerCase().includes(lowercasedQuery) ||
        tx.points.toString().includes(lowercasedQuery) ||
        format(new Date(tx.date), "Pp").toLowerCase().includes(lowercasedQuery)
    );
  }, [reportRows, searchQuery]);
  
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
  );


  const handleExport = (dateRange?: DateRange) => {
    if (!game) return;

    let transactionsToExport = filteredTransactions;

     if (dateRange?.from && dateRange?.to) {
        const fromDate = new Date(dateRange.from);
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        
        transactionsToExport = filteredTransactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= fromDate && txDate <= toDate;
        });
    }

    if (transactionsToExport.length === 0) {
        toast({
            variant: "destructive",
            title: "No Data",
            description: "There are no transactions within the selected date range to export.",
        });
        return;
    }

    // Create CSV with separate Date and Time columns
    const csvHeaders = ['Date', 'Time', 'Player', 'Staff', 'Type', 'Points Before', 'Points', 'Balance After'];
    const csvRows = [
        csvHeaders.join(','),
        ...transactionsToExport.map(tx => {
            const txDate = new Date(tx.date);
            const dateStr = format(txDate, "yyyy-MM-dd");
            const timeStr = format(txDate, "h:mm a");
            
            return [
                dateStr,
                timeStr,
                `"${tx.player}"`,
                `"${tx.staff}"`,
                tx.type,
                tx.balanceBefore.toFixed(2),
                tx.points.toFixed(2),
                tx.balanceAfter.toFixed(2)
            ].join(',');
        })
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game.name}_transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
        title: "Export Successful",
        description: `Exported ${transactionsToExport.length} transactions to CSV.`,
    });
    
    setIsDateRangePickerOpen(false);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Transaction Report: {game?.name}</DialogTitle>
          <DialogDescription>
            Showing all transactions associated with this game from the game's point of view.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-transactions"
              name="search-transactions"
              placeholder="Search Player, Date, staff, type, points..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button onClick={() => setIsDateRangePickerOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Points Before</TableHead>
                <TableHead>Points</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : paginatedTransactions.length > 0 ? (
                paginatedTransactions.map(tx => {
                  const isCreditToGame = tx.type === 'Withdraw' || tx.type === 'Recharge';
                  return (
                  <TableRow key={tx.id}>
                    <TableCell><ClientFormattedDate dateString={tx.date} /></TableCell>
                    <TableCell>{tx.player}</TableCell>
                    <TableCell>{tx.staff}</TableCell>
                    <TableCell>
                       <span className={cn(
                          'capitalize font-semibold',
                          isCreditToGame ? 'text-emerald-500' : 'text-destructive'
                       )}>
                          {tx.type}
                       </span>
                    </TableCell>
                    <TableCell>
                       {tx.balanceBefore.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={cn(
                        'font-semibold',
                        isCreditToGame ? 'text-emerald-500' : 'text-destructive'
                    )}>
                       {isCreditToGame ? '+' : '-'}
                       {tx.points.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                     <TableCell className="text-right font-semibold">
                       {tx.balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No transactions found{searchQuery && ' for your search'}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
         {totalPages > 1 && (
            <div className="flex items-center justify-center p-4 border-t">
                <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        className="h-8 w-8 p-0 hidden sm:flex"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                    >
                        <span className="sr-only">Go to first page</span>
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                      <span className="text-sm font-medium">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        <span className="sr-only">Go to next page</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0 hidden sm:flex"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                    >
                        <span className="sr-only">Go to last page</span>
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        )}
        <DialogFooter>
             <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <DateRangePickerDialog
        isOpen={isDateRangePickerOpen}
        onOpenChange={setIsDateRangePickerOpen}
        onApply={handleExport}
      />
    </>
  );
}
