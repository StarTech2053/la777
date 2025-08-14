
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, FileText, MoreHorizontal, Edit, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Transaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import { deleteTransaction } from "@/app/(app)/payments/actions";
import { DateRangePickerDialog } from "@/components/ui/date-range-picker-dialog";
import type { DateRange } from "react-day-picker";
import { useAuth } from "@/hooks/use-auth";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ITEMS_PER_PAGE = 10;

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


function AllTransactionsTable({ 
    transactions,
    onEdit,
    onDelete,
    role,
}: { 
    transactions: Transaction[],
    onEdit: (tx: Transaction) => void,
    onDelete: (tx: Transaction) => void,
    role: 'Admin' | 'Agent' | 'Cashier' | null,
}) {
    return (
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {role !== 'Agent' && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell><ClientFormattedDate dateString={tx.date} /></TableCell>
                  <TableCell>
                     <span className={cn(
                        'capitalize font-semibold',
                        tx.type === 'Deposit' && 'text-emerald-500',
                        tx.type === 'Withdraw' && 'text-destructive'
                     )}>
                        {tx.type}
                     </span>
                  </TableCell>
                  <TableCell>{tx.paymentMethod || "N/A"}</TableCell>
                  <TableCell className="font-mono">{tx.paymentTag || 'N/A'}</TableCell>
                  <TableCell>{tx.staffName}</TableCell>
                  <TableCell className={cn(
                      "text-right font-semibold",
                      tx.type === 'Deposit' && 'text-emerald-500',
                      tx.type === 'Withdraw' && 'text-destructive'
                  )}>
                    {tx.type === "Deposit" || tx.type === "Withdraw" ? "$" : ""}
                    {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  {role !== 'Agent' && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => onEdit(tx)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(tx)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                    <TableCell colSpan={role !== 'Agent' ? 7 : 6} className="h-24 text-center">
                        No transactions found.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
    )
}

function FilteredTransactionsTable({ 
    transactions, 
    filter,
    onEdit,
    onDelete,
    role,
}: { 
    transactions: Transaction[], 
    filter: (tx: Transaction) => boolean,
    onEdit: (tx: Transaction) => void,
    onDelete: (tx: Transaction) => void,
    role: 'Admin' | 'Agent' | 'Cashier' | null,
}) {
    const filteredTransactions = transactions.filter(filter);
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tag</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    {role !== 'Agent' && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                        <TableCell><ClientFormattedDate dateString={tx.date} /></TableCell>
                        <TableCell>{tx.playerName}</TableCell>
                        <TableCell>
                             <span className={cn(
                                'capitalize font-semibold',
                                tx.type === 'Deposit' && 'text-emerald-500',
                                tx.type === 'Withdraw' && 'text-destructive'
                             )}>
                                {tx.type}
                             </span>
                        </TableCell>
                        <TableCell className="font-mono">{tx.paymentTag || 'N/A'}</TableCell>
                        <TableCell>{tx.staffName}</TableCell>
                        <TableCell className={cn(
                            "text-right font-semibold",
                             tx.type === 'Deposit' && 'text-emerald-500',
                             tx.type === 'Withdraw' && 'text-destructive'
                        )}>
                            {tx.type === "Deposit" || tx.type === "Withdraw" ? "$" : ""}
                            {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        {role !== 'Agent' && (
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onSelect={() => onEdit(tx)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(tx)}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        )}
                    </TableRow>
                ))}
                {filteredTransactions.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={role !== 'Agent' ? 7 : 6} className="h-24 text-center">
                        No transactions found for this filter.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
        </Table>
    )
}

export function PaymentsTable({ title, description }: { title: string, description: string }) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  const [selectedTx, setSelectedTx] = React.useState<Transaction | undefined>(undefined);
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] = React.useState(false);
  const { toast } = useToast();
  const { role } = useAuth();

  const reloadTransactions = React.useCallback(() => {
    setIsLoading(true);
    const transactionsQuery = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setTransactions(data);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching transactions:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch transactions from the database.' });
        setIsLoading(false);
    });

    return unsubscribe;
  }, [toast]);

  React.useEffect(() => {
    const unsubscribe = reloadTransactions();
    return () => unsubscribe();
  }, [reloadTransactions]);

  const handleEditClick = (tx: Transaction) => {
    setSelectedTx(tx);
    setIsEditOpen(true);
  }

  const handleDeleteClick = (tx: Transaction) => {
    setSelectedTx(tx);
    setIsDeleteAlertOpen(true);
  }

  const handleConfirmDelete = async () => {
    if (!selectedTx) return;
    try {
      const result = await deleteTransaction(selectedTx.id);
      if (result.success) {
        toast({ variant: "success", title: "Success", description: "Transaction deleted successfully." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete transaction." });
    } finally {
      setIsDeleteAlertOpen(false);
      setSelectedTx(undefined);
    }
  }

  const handleEditSuccess = () => {
    setIsEditOpen(false);
    setSelectedTx(undefined);
    toast({ variant: "success", title: "Success", description: "Transaction updated successfully." });
  }

  const filteredTransactions = React.useMemo(() => {
    if (!searchQuery) return transactions;

    const lowercasedQuery = searchQuery.toLowerCase();
    return transactions.filter(tx => 
        tx.playerName.toLowerCase().includes(lowercasedQuery) ||
        tx.type.toLowerCase().includes(lowercasedQuery) ||
        (tx.paymentMethod && tx.paymentMethod.toLowerCase().includes(lowercasedQuery)) ||
        (tx.paymentTag && tx.paymentTag.toLowerCase().includes(lowercasedQuery)) ||
        tx.staffName.toLowerCase().includes(lowercasedQuery)
    );
  }, [searchQuery, transactions]);
  
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
  );

  const handleExport = (dateRange?: DateRange) => {
    let transactionsToExport = filteredTransactions;

    if (dateRange?.from && dateRange?.to) {
        const fromDate = new Date(dateRange.from);
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);

        transactionsToExport = transactionsToExport.filter(tx => {
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


    const csvHeaders = ["Transaction ID", "Date", "Player", "Type", "Method", "Tag", "Amount", "Status", "Staff"];
    const csvRows = [
      csvHeaders.join(','),
      ...transactionsToExport.map(tx => [
        tx.id,
        format(new Date(tx.date), "yyyy-MM-dd HH:mm:ss"),
        `"${tx.playerName}"`,
        tx.type,
        tx.paymentMethod || 'N/A',
        tx.paymentTag || 'N/A',
        tx.amount,
        tx.status,
        `"${tx.staffName}"`
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `transactions-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsDateRangePickerOpen(false);
  };


  return (
    <>
      {isLoading && <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
      {!isLoading && (
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="p-4 border-b flex justify-between items-center gap-4 flex-wrap">
            <div className="flex-grow">
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="search-transactions"
                      name="search-transactions"
                      placeholder="Search transactions..." 
                      className="max-w-sm" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                 <Button variant="outline" onClick={() => setIsDateRangePickerOpen(true)} disabled={filteredTransactions.length === 0}>
                    <FileText className="mr-2 h-4 w-4" /> Report
                </Button>
                <TabsList className="grid w-full max-w-sm grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="chime">Chime</TabsTrigger>
                    <TabsTrigger value="cashapp">CashApp</TabsTrigger>
                </TabsList>
            </div>
        </div>
        <TabsContent value="overview">
          <AllTransactionsTable 
            transactions={paginatedTransactions} 
            onEdit={handleEditClick} 
            onDelete={handleDeleteClick} 
            role={role}
          />
        </TabsContent>
        <TabsContent value="chime">
          <FilteredTransactionsTable
            transactions={paginatedTransactions}
            filter={(tx) => tx.paymentMethod === 'Chime'}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            role={role}
          />
        </TabsContent>
        <TabsContent value="cashapp">
          <FilteredTransactionsTable
            transactions={paginatedTransactions}
            filter={(tx) => tx.paymentMethod === 'CashApp'}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            role={role}
          />
        </TabsContent>
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
      </Tabs>
      )}

      <EditTransactionDialog
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        transaction={selectedTx}
        onSuccess={handleEditSuccess}
      />
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the transaction record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <DateRangePickerDialog
        isOpen={isDateRangePickerOpen}
        onOpenChange={setIsDateRangePickerOpen}
        onApply={handleExport}
      />
    </>
  );
}
