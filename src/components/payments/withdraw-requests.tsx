"use client";

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Transaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface WithdrawRequest {
  id: string;
  playerName: string;
  amount: number;
  gameName: string;
  date: string;
  status: 'pending' | 'completed';
  staffName?: string;
  paymentMethod?: string;
  paymentTag?: string;
  playerTag?: string; // Player's tag for receiving payment
  pendingAmount?: number;
  paidAmount?: number;
}

export function WithdrawRequests() {
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'transactions'),
        where('type', '==', 'Withdraw')
        // Temporarily removed orderBy until index is created
      ),
      (querySnapshot) => {
        const requests: WithdrawRequest[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const amount = data.amount || 0;
          const status = data.status || 'pending';
          
                     return {
             id: doc.id,
             playerName: data.playerName || 'Unknown',
             amount: amount,
             gameName: data.gameName || 'Unknown',
             date: data.date,
             status: status,
             staffName: data.staffName,
             paymentMethod: data.paymentMethod || 'N/A',
             paymentTag: data.paymentTag || 'N/A', // Cashier's payment tag
             playerTag: data.playerTag || data.playerName || 'N/A', // Player's tag for receiving
             paidAmount: data.paidAmount || 0,
             pendingAmount: Math.max(0, amount - (data.paidAmount || 0))
           };
        });
        
        // Filter out deleted transactions
        const activeRequests = requests.filter(request => request.status !== 'deleted');
        
        // Sort manually until index is created
        const sortedRequests = activeRequests.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        setWithdrawRequests(sortedRequests);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching withdraw requests:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredRequests = withdrawRequests.filter(request =>
    request.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (request.playerTag || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (request.paymentTag || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
    } else {
      return <Badge className="bg-orange-500 hover:bg-orange-600">Pending</Badge>;
    }
  };

  const handleExport = () => {
    // Export functionality can be implemented here
    console.log('Exporting withdraw requests...');
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const transactionRef = doc(db, 'transactions', transactionId);
      await updateDoc(transactionRef, {
        status: 'deleted'
      });
      
      toast({
        variant: "success",
        title: "Success",
        description: "Transaction deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete transaction. Please try again.",
      });
    }
  };

  const handleProcessTransaction = (request: WithdrawRequest) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (formData: {
    paymentMethod: string;
    paymentTag: string;
    status: 'pending' | 'completed';
    paidAmount: number;
  }) => {
    if (!selectedRequest) return;

    try {
      const transactionRef = doc(db, 'transactions', selectedRequest.id);
      // Add to existing paid amount instead of replacing
      const currentPaidAmount = selectedRequest.paidAmount || 0;
      const additionalPaidAmount = formData.paidAmount;
      const totalPaidAmount = currentPaidAmount + additionalPaidAmount;
      const newPendingAmount = Math.max(0, selectedRequest.amount - totalPaidAmount);
      
      console.log('Current paid amount:', currentPaidAmount);
      console.log('Additional paid amount:', additionalPaidAmount);
      console.log('Total paid amount:', totalPaidAmount);
      console.log('New pending amount:', newPendingAmount);
      
      await updateDoc(transactionRef, {
        paymentMethod: formData.paymentMethod,
        paymentTag: formData.paymentTag,
        status: formData.status,
        paidAmount: totalPaidAmount,
        pendingAmount: newPendingAmount
      });
      
      toast({
        variant: "success",
        title: "Success",
        description: "Transaction processed successfully.",
      });
      
      setIsDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error processing transaction:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process transaction. Please try again.",
      });
    }
  };

  const handleDeleteFromForm = async () => {
    if (!selectedRequest) return;

    try {
      const transactionRef = doc(db, 'transactions', selectedRequest.id);
      await updateDoc(transactionRef, {
        status: 'deleted'
      });
      
      toast({
        variant: "success",
        title: "Success",
        description: "Transaction deleted successfully.",
      });
      
      setIsDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete transaction. Please try again.",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Withdraw Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

interface TransactionFormProps {
  request: WithdrawRequest;
  onSubmit: (formData: {
    paymentMethod: string;
    paymentTag: string;
    status: 'pending' | 'completed';
    paidAmount: number;
  }) => void;
  onCancel: () => void;
  onDelete: () => void;
}

function TransactionForm({ request, onSubmit, onCancel, onDelete }: TransactionFormProps) {
  const [paymentMethod, setPaymentMethod] = useState(request.paymentMethod || '');
  const [paymentTag, setPaymentTag] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  
  // Calculate pending amount automatically (considering already paid amount)
  const currentPaidAmount = request.paidAmount || 0;
  const additionalPaidAmount = parseFloat(paidAmount) || 0;
  const totalPaidAmount = currentPaidAmount + additionalPaidAmount;
  const pendingAmount = Math.max(0, request.amount - totalPaidAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const additionalPaidAmount = parseFloat(paidAmount) || 0;
    const currentPaidAmount = request.paidAmount || 0;
    const totalPaidAmount = currentPaidAmount + additionalPaidAmount;
    
    // Validation: Total paid amount cannot exceed total amount
    if (totalPaidAmount > request.amount) {
      alert('Total paid amount cannot exceed total amount!');
      return;
    }
    
    // Auto-determine status based on pending amount
    const autoStatus = pendingAmount === 0 ? 'completed' : 'pending';
    
    onSubmit({
      paymentMethod,
      paymentTag,
      status: autoStatus,
      paidAmount: additionalPaidAmount
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="playerName">Player Name</Label>
        <Input
          id="playerName"
          value={request.playerName}
          disabled
          className="bg-muted"
        />
      </div>

             <div className="space-y-2">
         <Label htmlFor="playerTag">Player Tag</Label>
         <div className="flex items-center space-x-2">
           <Input
             id="playerTag"
             value={request.playerTag || ''}
             disabled
             className="bg-muted flex-1"
           />
           <Button
             type="button"
             variant="outline"
             size="sm"
             onClick={() => {
               navigator.clipboard.writeText(request.playerTag || '');
               // You can add a toast notification here if needed
             }}
             className="shrink-0"
           >
             Copy
           </Button>
         </div>
       </div>

             <div className="space-y-2">
         <Label htmlFor="amount">Amount</Label>
         <Input
           id="amount"
           value={`$${request.amount.toLocaleString()}`}
           disabled
           className="bg-muted"
         />
       </div>

                               <div className="space-y-2">
           <Label htmlFor="paidAmount">Additional Amount to Pay</Label>
                       <Input
              id="paidAmount"
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="Enter additional amount to pay"
              className={`font-semibold ${totalPaidAmount > request.amount ? 'border-red-500' : ''}`}
            />
            <p className="text-sm text-muted-foreground">
              Already paid: ${request.paidAmount?.toLocaleString() || '0'}
            </p>
            {totalPaidAmount > request.amount && (
              <p className="text-sm text-red-500">Total amount cannot exceed ${request.amount.toLocaleString()}</p>
            )}
         </div>

                          <div className="space-y-2">
           <Label htmlFor="pendingAmount">Pending Amount</Label>
           <Input
             id="pendingAmount"
             value={`$${pendingAmount.toLocaleString()}`}
             disabled
             className={`bg-muted font-semibold ${pendingAmount === 0 ? 'text-green-600' : 'text-orange-600'}`}
           />
         </div>

       <div className="space-y-2">
        <Label htmlFor="paymentMethod">Payment Method</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger id="paymentMethod">
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CashApp">CashApp</SelectItem>
            <SelectItem value="Chime">Chime</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentTag">Payment Tag</Label>
        <Input
          id="paymentTag"
          value={paymentTag}
          onChange={(e) => setPaymentTag(e.target.value)}
          placeholder="Enter payment tag"
        />
      </div>

             <div className="space-y-2">
         <Label htmlFor="status">Status</Label>
         <Input
           id="status"
           value={pendingAmount === 0 ? 'Completed' : 'Pending'}
           disabled
           className="bg-muted font-semibold"
         />
       </div>

             <div className="flex justify-between pt-4">
         <Button type="button" variant="destructive" onClick={onDelete}>
           Delete Transaction
         </Button>
         <div className="flex space-x-2">
           <Button type="button" variant="outline" onClick={onCancel}>
             Cancel
           </Button>
           <Button type="submit">
             Process Transaction
           </Button>
         </div>
       </div>
    </form>
  );
}

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Withdraw Requests</CardTitle>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by player name, player tag, or payment tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Player Tag</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>Pending Amount</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {format(new Date(request.date), "MM/dd/yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.date), "h:mm a")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {request.staffName || 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium text-blue-600">
                        {request.playerTag}
                      </TableCell>
                      <TableCell>{request.paymentMethod}</TableCell>
                      <TableCell className="text-destructive font-semibold">
                        -${request.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {request.paymentTag}
                      </TableCell>
                      <TableCell className="text-orange-600 font-semibold">
                        ${request.pendingAmount?.toLocaleString() || '0'}
                      </TableCell>
                                             <TableCell className="text-green-600 font-semibold">
                         ${request.paidAmount?.toLocaleString() || '0'}
                       </TableCell>
                       <TableCell>{request.paymentMethod}</TableCell>
                       <TableCell>
                         {getStatusBadge(request.status)}
                       </TableCell>
                                             <TableCell>
                         <Button 
                           variant="ghost" 
                           className="h-8 w-8 p-0"
                           onClick={() => handleProcessTransaction(request)}
                         >
                           <span className="sr-only">Open transaction form</span>
                           <MoreHorizontal className="h-4 w-4" />
                         </Button>
                       </TableCell>
                    </TableRow>
                  ))
                ) : (
                                     <TableRow>
                     <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                       {searchTerm ? 'No withdraw requests found matching your search.' : 'No withdraw requests yet.'}
                     </TableCell>
                   </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

             {/* Transaction Processing Dialog */}
       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         <DialogContent className="sm:max-w-[500px]">
           <DialogHeader>
             <DialogTitle>Process Withdrawal Transaction</DialogTitle>
             <DialogDescription>
               Update payment details and process the withdrawal transaction.
             </DialogDescription>
           </DialogHeader>
           {selectedRequest && (
                          <TransactionForm
                request={selectedRequest}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setIsDialogOpen(false);
                  setSelectedRequest(null);
                }}
                onDelete={handleDeleteFromForm}
              />
           )}
         </DialogContent>
       </Dialog>
    </Card>
  );
}
