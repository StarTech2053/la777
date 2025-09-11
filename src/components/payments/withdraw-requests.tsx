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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MoreHorizontal, Copy, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePickerDialog } from '@/components/ui/date-range-picker-dialog';
import type { DateRange } from 'react-day-picker';
import { useWithdrawNotifications } from '@/hooks/use-withdraw-notifications';
import type { WithdrawRequest, PaymentRecord, AuditRecord } from '@/lib/types';

export function WithdrawRequests() {
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [selectedPaymentHistory, setSelectedPaymentHistory] = useState<WithdrawRequest | null>(null);
  const { toast } = useToast();
  const { clearNotification } = useWithdrawNotifications();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'transactions'),
        where('type', '==', 'Withdraw')
      ),
      async (querySnapshot) => {
        const requests: WithdrawRequest[] = [];
        
        for (const doc of querySnapshot.docs) {
          const data = doc.data();
          const amount = data.amount || 0;
          const status = data.status || 'pending';
          
          // Fetch payment history from subcollection
          let paymentHistory: PaymentRecord[] = [];
          try {
            const paymentsSnapshot = await getDocs(collection(db, 'transactions', doc.id, 'payments'));
            paymentHistory = paymentsSnapshot.docs.map(paymentDoc => {
              const paymentData = paymentDoc.data();
              return {
                id: paymentDoc.id,
                date: paymentData.date,
                amount: paymentData.amount || 0,
                method: paymentData.method || 'N/A',
                tag: paymentData.tag || 'N/A',
                paidBy: paymentData.paidBy || 'N/A',
                staffName: paymentData.staffName || 'N/A'
              };
            });
          } catch (error) {
            // No payment history found for this transaction
          }
          
          // Extract unique payment methods and tags
          const paymentMethods = [...new Set(paymentHistory.map(p => p.method))];
          const paymentTags = [...new Set(paymentHistory.map(p => p.tag))];
          
          requests.push({
            id: doc.id,
            playerName: data.playerName || 'Unknown',
            amount: amount,
            gameName: data.gameName || 'Unknown',
            date: data.date,
            status: status,
            staffName: data.staffName,
            paymentMethod: data.paymentMethod || 'N/A',
            paymentTag: data.paymentTag || 'N/A',
            playerTag: data.playerTag || data.playerName || 'N/A',
            paidAmount: data.paidAmount || 0,
            pendingAmount: Math.max(0, amount - (data.paidAmount || 0) - (data.depositAmount || 0)),
            depositAmount: data.depositAmount || 0, // Add deposit amount from transaction
            paymentMethods: paymentMethods.length > 0 ? paymentMethods : [data.paymentMethod || 'N/A'],
            paymentTags: paymentTags.length > 0 ? paymentTags : [data.paymentTag || 'N/A'],
            paymentHistory: paymentHistory
          });
        }
        
        const activeRequests = requests.filter(request => request.status !== 'deleted');
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

  const filteredRequests = withdrawRequests.filter(request => {
    const matchesSearch = request.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.playerTag || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.paymentTag || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by active tab
    if (activeTab === 'chime') {
      return matchesSearch && request.paymentMethod === 'Chime';
    } else if (activeTab === 'cashapp') {
      return matchesSearch && request.paymentMethod === 'CashApp';
    } else if (activeTab === 'pending') {
      return matchesSearch && request.status === 'pending';
    } else if (activeTab === 'complete') {
      return matchesSearch && request.status === 'completed';
    }
    
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
    } else {
      return <Badge className="bg-orange-500 hover:bg-orange-600">Pending</Badge>;
    }
  };

  const handleExport = (dateRange?: DateRange) => {
    let requestsToExport = filteredRequests;

    if (dateRange?.from && dateRange?.to) {
      requestsToExport = filteredRequests.filter(request => {
        const requestDate = new Date(request.date);
        return requestDate >= dateRange.from! && requestDate <= dateRange.to!;
      });
    }

    const headers = ['Date', 'Time', 'Staff', 'Player Tag', 'Method', 'Amount', 'Tag', 'Pending Amount', 'Paid Amount', 'Status'];
    const csvContent = [
      headers.join(','),
      ...requestsToExport.map(request => [
        format(new Date(request.date), "MM/dd/yyyy"),
        format(new Date(request.date), "h:mm a"),
        request.staffName || 'N/A',
        request.playerTag || 'N/A',
        request.paymentMethod || 'N/A',
        request.amount.toLocaleString(),
        request.paymentTag || 'N/A',
        request.pendingAmount?.toLocaleString() || '0',
        request.paidAmount?.toLocaleString() || '0',
        request.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `withdraw-requests-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      variant: "success",
      title: "Export Successful",
      description: `Exported ${requestsToExport.length} withdraw requests to CSV.`,
    });
    
    setIsDateRangePickerOpen(false);
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
    // Clear notification when action button is clicked
    clearNotification();
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
      const currentPaidAmount = selectedRequest.paidAmount || 0;
      const additionalPaidAmount = formData.paidAmount;
      const totalPaidAmount = currentPaidAmount + additionalPaidAmount;
      const newPendingAmount = Math.max(0, selectedRequest.amount - totalPaidAmount);
      
      // Update main transaction
      await updateDoc(transactionRef, {
        paymentMethod: formData.paymentMethod,
        paymentTag: formData.paymentTag,
        status: formData.status,
        paidAmount: totalPaidAmount,
        pendingAmount: newPendingAmount
      });

      // Add payment record to subcollection
      if (additionalPaidAmount > 0) {
        const paymentRecord = {
          date: new Date().toISOString(),
          amount: additionalPaidAmount,
          method: formData.paymentMethod,
          tag: formData.paymentTag,
          paidBy: 'current-user', // You can get this from auth context
          staffName: 'Current Staff' // You can get this from auth context
        };

        await addDoc(collection(db, 'transactions', selectedRequest.id, 'payments'), paymentRecord);
      }
      
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

  const handleCopyPlayerTag = async (playerTag: string) => {
    try {
      await navigator.clipboard.writeText(playerTag);
      toast({
        variant: "success",
        title: "Copied!",
        description: "Player tag copied to clipboard.",
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy player tag. Please try again.",
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

  return (
    <>
      {isLoading && <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
      {!isLoading && (
        <Card className="flex flex-col h-full">
                     <CardHeader className="flex flex-col gap-4">
             <CardTitle className="text-base font-semibold">Withdraw Requests</CardTitle>
           </CardHeader>
          <CardContent className="p-0 flex-grow flex flex-col">
                         <div className="border-t flex-grow">
               <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                 <div className="flex items-center justify-between border-b px-4 py-2">
                   <div className="flex items-center gap-2">
                     <div className="relative flex-grow min-w-[300px]">
                       <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                       <Input 
                         id="search-transactions"
                         name="search-transactions"
                         placeholder="Search transactions..." 
                         className="pl-8"
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                       />
                     </div>
                     <Button variant="outline" onClick={() => setIsDateRangePickerOpen(true)} disabled={filteredRequests.length === 0}>
                       <FileText className="mr-2 h-4 w-4" /> Report
                     </Button>
                   </div>
                                       <TabsList className="grid w-full max-w-sm grid-cols-5">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="chime">Chime</TabsTrigger>
                      <TabsTrigger value="cashapp">CashApp</TabsTrigger>
                      <TabsTrigger value="pending">Pending</TabsTrigger>
                      <TabsTrigger value="complete">Complete</TabsTrigger>
                    </TabsList>
                 </div>
                                                                   <TabsContent value="overview" className="m-0">
                    <div className="relative w-full overflow-auto">
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
                              <div className="flex items-center gap-2">
                                <span>{request.playerTag}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-blue-100"
                                  onClick={() => handleCopyPlayerTag(request.playerTag || '')}
                                >
                                  <Copy className="h-3 w-3 text-blue-600" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              {request.paymentMethods && request.paymentMethods.length > 1 
                                ? request.paymentMethods.join(' + ')
                                : request.paymentMethod
                              }
                            </TableCell>
                            <TableCell className="text-destructive font-semibold">
                              -${request.amount.toLocaleString()}
                            </TableCell>
                                                        <TableCell className="text-green-600 font-medium">
                               {request.paymentTags && request.paymentTags.length > 1 ? (
                                 <Button
                                   variant="ghost"
                                   className="h-8 w-8 p-0"
                                   onClick={() => {
                                     setSelectedPaymentHistory(request);
                                     setIsPaymentHistoryOpen(true);
                                   }}
                                 >
                                   <span className="sr-only">View payment history</span>
                                   <FileText className="h-4 w-4" />
                                 </Button>
                               ) : (
                                 request.paymentTag
                               )}
                             </TableCell>
                           <TableCell className="text-orange-600 font-semibold">
                             ${request.pendingAmount?.toLocaleString() || '0'}
                           </TableCell>
                           <TableCell className="text-green-600 font-semibold">
                             ${request.paidAmount?.toLocaleString() || '0'}
                           </TableCell>
                           <TableCell>
                             {getStatusBadge(request.status)}
                           </TableCell>
                           <TableCell>
                             <div className="flex items-center gap-1">
                               <Button 
                                 variant="ghost" 
                                 className="h-8 w-8 p-0"
                                 onClick={() => handleProcessTransaction(request)}
                               >
                                 <span className="sr-only">Open transaction form</span>
                                 <MoreHorizontal className="h-4 w-4" />
                               </Button>
                               {request.paymentHistory && request.paymentHistory.length > 0 && (
                                 <Button 
                                   variant="ghost" 
                                   className="h-8 w-8 p-0"
                                   onClick={() => {
                                     setSelectedPaymentHistory(request);
                                     setIsPaymentHistoryOpen(true);
                                   }}
                                 >
                                   <span className="sr-only">View payment history</span>
                                   <FileText className="h-4 w-4" />
                                 </Button>
                               )}
                             </div>
                           </TableCell>
                         </TableRow>
                       ))
                     ) : (
                       <TableRow>
                         <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                           {searchTerm ? 'No withdraw requests found matching your search.' : 'No withdraw requests yet.'}
                         </TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </div>
                           </TabsContent>
                                                     <TabsContent value="chime" className="m-0">
                 <div className="relative w-full overflow-auto">
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
                               <div className="flex items-center gap-2">
                                 <span>{request.playerTag}</span>
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   className="h-6 w-6 p-0 hover:bg-blue-100"
                                   onClick={() => handleCopyPlayerTag(request.playerTag || '')}
                                 >
                                   <Copy className="h-3 w-3 text-blue-600" />
                                 </Button>
                               </div>
                             </TableCell>
                             <TableCell>{request.paymentMethod}</TableCell>
                             <TableCell className="text-destructive font-semibold">
                               -${request.amount.toLocaleString()}
                             </TableCell>
                             <TableCell className="text-green-600 font-medium">
                               {request.paymentTags && request.paymentTags.length > 1 ? (
                                 <Button
                                   variant="ghost"
                                   className="h-8 w-8 p-0"
                                   onClick={() => {
                                     setSelectedPaymentHistory(request);
                                     setIsPaymentHistoryOpen(true);
                                   }}
                                 >
                                   <span className="sr-only">View payment history</span>
                                   <FileText className="h-4 w-4" />
                                 </Button>
                               ) : (
                                 request.paymentTag
                               )}
                             </TableCell>
                           <TableCell className="text-orange-600 font-semibold">
                             ${request.pendingAmount?.toLocaleString() || '0'}
                           </TableCell>
                           <TableCell className="text-green-600 font-semibold">
                             ${request.paidAmount?.toLocaleString() || '0'}
                           </TableCell>
                           <TableCell>
                             {getStatusBadge(request.status)}
                           </TableCell>
                           <TableCell>
                             <div className="flex items-center gap-1">
                               <Button 
                                 variant="ghost" 
                                 className="h-8 w-8 p-0"
                                 onClick={() => handleProcessTransaction(request)}
                               >
                                 <span className="sr-only">Open transaction form</span>
                                 <MoreHorizontal className="h-4 w-4" />
                               </Button>
                               {request.paymentHistory && request.paymentHistory.length > 0 && (
                                 <Button 
                                   variant="ghost" 
                                   className="h-8 w-8 p-0"
                                   onClick={() => {
                                     setSelectedPaymentHistory(request);
                                     setIsPaymentHistoryOpen(true);
                                   }}
                                 >
                                   <span className="sr-only">View payment history</span>
                                   <FileText className="h-4 w-4" />
                                 </Button>
                               )}
                             </div>
                           </TableCell>
                         </TableRow>
                       ))
                     ) : (
                       <TableRow>
                         <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                           {searchTerm ? 'No withdraw requests found matching your search.' : 'No withdraw requests yet.'}
                         </TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </div>
                           </TabsContent>
                                                     <TabsContent value="cashapp" className="m-0">
                 <div className="relative w-full overflow-auto">
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
                               <div className="flex items-center gap-2">
                                 <span>{request.playerTag}</span>
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   className="h-6 w-6 p-0 hover:bg-blue-100"
                                   onClick={() => handleCopyPlayerTag(request.playerTag || '')}
                                 >
                                   <Copy className="h-3 w-3 text-blue-600" />
                                 </Button>
                               </div>
                             </TableCell>
                             <TableCell>{request.paymentMethod}</TableCell>
                             <TableCell className="text-destructive font-semibold">
                               -${request.amount.toLocaleString()}
                             </TableCell>
                             <TableCell className="text-green-600 font-medium">
                               {request.paymentTags && request.paymentTags.length > 1 ? (
                                 <Button
                                   variant="ghost"
                                   className="h-8 w-8 p-0"
                                   onClick={() => {
                                     setSelectedPaymentHistory(request);
                                     setIsPaymentHistoryOpen(true);
                                   }}
                                 >
                                   <span className="sr-only">View payment history</span>
                                   <FileText className="h-4 w-4" />
                                 </Button>
                               ) : (
                                 request.paymentTag
                               )}
                             </TableCell>
                           <TableCell className="text-orange-600 font-semibold">
                             ${request.pendingAmount?.toLocaleString() || '0'}
                           </TableCell>
                           <TableCell className="text-green-600 font-semibold">
                             ${request.paidAmount?.toLocaleString() || '0'}
                           </TableCell>
                           <TableCell>
                             {getStatusBadge(request.status)}
                           </TableCell>
                           <TableCell>
                             <div className="flex items-center gap-1">
                               <Button 
                                 variant="ghost" 
                                 className="h-8 w-8 p-0"
                                 onClick={() => handleProcessTransaction(request)}
                               >
                                 <span className="sr-only">Open transaction form</span>
                                 <MoreHorizontal className="h-4 w-4" />
                               </Button>
                               {request.paymentHistory && request.paymentHistory.length > 0 && (
                                 <Button 
                                   variant="ghost" 
                                   className="h-8 w-8 p-0"
                                   onClick={() => {
                                     setSelectedPaymentHistory(request);
                                     setIsPaymentHistoryOpen(true);
                                   }}
                                 >
                                   <span className="sr-only">View payment history</span>
                                   <FileText className="h-4 w-4" />
                                 </Button>
                               )}
                             </div>
                           </TableCell>
                         </TableRow>
                       ))
                     ) : (
                       <TableRow>
                         <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                           {searchTerm ? 'No withdraw requests found matching your search.' : 'No withdraw requests yet.'}
                         </TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </div>
                                        </TabsContent>
                                                         <TabsContent value="pending" className="m-0">
                  <div className="relative w-full overflow-auto">
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
                                <div className="flex items-center gap-2">
                                  <span>{request.playerTag}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-blue-100"
                                    onClick={() => handleCopyPlayerTag(request.playerTag || '')}
                                  >
                                    <Copy className="h-3 w-3 text-blue-600" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>{request.paymentMethod}</TableCell>
                              <TableCell className="text-destructive font-semibold">
                                -${request.amount.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-green-600 font-medium">
                                {request.paymentTags && request.paymentTags.length > 1 ? (
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setSelectedPaymentHistory(request);
                                      setIsPaymentHistoryOpen(true);
                                    }}
                                  >
                                    <span className="sr-only">View payment history</span>
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  request.paymentTag
                                )}
                              </TableCell>
                            <TableCell className="text-orange-600 font-semibold">
                              ${request.pendingAmount?.toLocaleString() || '0'}
                            </TableCell>
                            <TableCell className="text-green-600 font-semibold">
                              ${request.paidAmount?.toLocaleString() || '0'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(request.status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleProcessTransaction(request)}
                                >
                                  <span className="sr-only">Open transaction form</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                {request.paymentHistory && request.paymentHistory.length > 0 && (
                                  <Button 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setSelectedPaymentHistory(request);
                                      setIsPaymentHistoryOpen(true);
                                    }}
                                  >
                                    <span className="sr-only">View payment history</span>
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                            {searchTerm ? 'No withdraw requests found matching your search.' : 'No withdraw requests yet.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                            </TabsContent>
                                                         <TabsContent value="complete" className="m-0">
                  <div className="relative w-full overflow-auto">
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
                                <div className="flex items-center gap-2">
                                  <span>{request.playerTag}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-blue-100"
                                    onClick={() => handleCopyPlayerTag(request.playerTag || '')}
                                  >
                                    <Copy className="h-3 w-3 text-blue-600" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>{request.paymentMethod}</TableCell>
                              <TableCell className="text-destructive font-semibold">
                                -${request.amount.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-green-600 font-medium">
                                {request.paymentTags && request.paymentTags.length > 1 ? (
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setSelectedPaymentHistory(request);
                                      setIsPaymentHistoryOpen(true);
                                    }}
                                  >
                                    <span className="sr-only">View payment history</span>
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  request.paymentTag
                                )}
                              </TableCell>
                            <TableCell className="text-orange-600 font-semibold">
                              ${request.pendingAmount?.toLocaleString() || '0'}
                            </TableCell>
                            <TableCell className="text-green-600 font-semibold">
                              ${request.paidAmount?.toLocaleString() || '0'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(request.status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleProcessTransaction(request)}
                                >
                                  <span className="sr-only">Open transaction form</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                {request.paymentHistory && request.paymentHistory.length > 0 && (
                                  <Button 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setSelectedPaymentHistory(request);
                                      setIsPaymentHistoryOpen(true);
                                    }}
                                  >
                                    <span className="sr-only">View payment history</span>
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                            {searchTerm ? 'No withdraw requests found matching your search.' : 'No withdraw requests yet.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
           </Tabs>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Date Range Picker Dialog */}
      <DateRangePickerDialog
        isOpen={isDateRangePickerOpen}
        onOpenChange={setIsDateRangePickerOpen}
        onApply={handleExport}
      />

      {/* Payment History Dialog */}
      <Dialog open={isPaymentHistoryOpen} onOpenChange={setIsPaymentHistoryOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>
              Complete payment history for this withdrawal request.
            </DialogDescription>
          </DialogHeader>
          {selectedPaymentHistory && (
            <div className="space-y-4">
                             <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                 <div>
                   <p className="text-sm font-medium text-muted-foreground">Player</p>
                   <p className="font-semibold">{selectedPaymentHistory.playerName}</p>
                 </div>
                 <div>
                   <p className="text-sm font-medium text-muted-foreground">Total Request</p>
                   <p className="font-semibold">${selectedPaymentHistory.amount.toLocaleString()}</p>
                 </div>
                 <div>
                   <p className="text-sm font-medium text-muted-foreground">Status</p>
                   <div className="mt-1">{getStatusBadge(selectedPaymentHistory.status)}</div>
                 </div>
                 <div>
                   <p className="text-sm font-medium text-muted-foreground">Paid</p>
                   <p className="font-semibold text-green-600">${selectedPaymentHistory.paidAmount?.toLocaleString() || '0'}</p>
                 </div>
                 <div>
                   <p className="text-sm font-medium text-muted-foreground">Pending</p>
                   <p className="font-semibold text-orange-600">${selectedPaymentHistory.pendingAmount?.toLocaleString() || '0'}</p>
                 </div>
                 <div>
                   <p className="text-sm font-medium text-muted-foreground">Deposit</p>
                   <p className="font-semibold text-blue-600">${selectedPaymentHistory.depositAmount?.toLocaleString() || '0'}</p>
                 </div>
               </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Payment Timeline</h4>
                <div className="space-y-3">
                  {selectedPaymentHistory.paymentHistory && selectedPaymentHistory.paymentHistory.length > 0 ? (
                                         selectedPaymentHistory.paymentHistory
                       .sort((a: PaymentRecord, b: PaymentRecord) => new Date(a.date).getTime() - new Date(b.date).getTime())
                       .map((payment: PaymentRecord, index: number) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">${payment.amount.toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground">
                                {payment.method} - {payment.tag}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(payment.date), "MMM dd, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{payment.staffName}</p>
                            <p className="text-xs text-muted-foreground">Paid by</p>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No payment history available.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
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
  const { toast } = useToast();
  
  const currentPaidAmount = request.paidAmount || 0;
  const currentDepositAmount = request.depositAmount || 0;
  const additionalPaidAmount = parseFloat(paidAmount) || 0;
  const totalPaidAmount = currentPaidAmount + additionalPaidAmount;
  const pendingAmount = Math.max(0, request.amount - totalPaidAmount - currentDepositAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const additionalPaidAmount = parseFloat(paidAmount) || 0;
    const currentPaidAmount = request.paidAmount || 0;
    const totalPaidAmount = currentPaidAmount + additionalPaidAmount;
    
    // Validation checks
    if (additionalPaidAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Additional amount must be greater than 0!",
      });
      return;
    }
    
    const currentDepositAmount = request.depositAmount || 0;
    const maxAllowedTotal = request.amount - currentDepositAmount;
    
    if (totalPaidAmount > maxAllowedTotal) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: `Total paid amount cannot exceed $${maxAllowedTotal.toLocaleString()} (original amount minus deposits)!`,
      });
      return;
    }
    
    const autoStatus = pendingAmount === 0 ? 'completed' : 'pending';
    
    onSubmit({
      paymentMethod,
      paymentTag,
      status: autoStatus,
      paidAmount: additionalPaidAmount
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Only allow numeric input (no decimals, no negative)
    const numericValue = value.replace(/[^0-9]/g, '');
    
    // Convert to number for validation
    const numValue = parseInt(numericValue) || 0;
    const currentPaidAmount = request.paidAmount || 0;
    const currentDepositAmount = request.depositAmount || 0;
    const maxAllowed = request.amount - currentPaidAmount - currentDepositAmount;
    
    // If input exceeds max allowed, cap it
    if (numValue > maxAllowed) {
      setPaidAmount(maxAllowed.toString());
    } else {
      setPaidAmount(numericValue);
    }
  };

     return (
     <form onSubmit={handleSubmit} className="space-y-4">
               {/* Payment History Section - Full Width */}
        {request.paymentHistory && request.paymentHistory.length > 0 && (
          <div className="space-y-2">
            <Label>Payment History</Label>
           <div className="space-y-2 max-h-24 overflow-y-auto">
             {request.paymentHistory
               .sort((a: PaymentRecord, b: PaymentRecord) => new Date(a.date).getTime() - new Date(b.date).getTime())
               .map((payment: PaymentRecord, index: number) => (
                 <div key={payment.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                   <div>
                     <span className="font-medium">${payment.amount.toLocaleString()}</span>
                     <span className="text-muted-foreground ml-2">
                       {payment.method} - {payment.tag}
                     </span>
                   </div>
                   <span className="text-muted-foreground text-xs">
                     {format(new Date(payment.date), "MMM dd, h:mm a")}
                   </span>
                 </div>
               ))}
           </div>
         </div>
       )}

                               {/* First Row - Player Info */}
         <div className="grid grid-cols-3 gap-4">
           <div className="space-y-2">
             <Label htmlFor="playerName">Game Account</Label>
             <Input
               id="playerName"
               name="playerName"
               value={request.gameName}
               disabled
               className="bg-muted"
             />
           </div>
           <div className="space-y-2">
             <Label htmlFor="playerTag">Player Tag</Label>
             <Input
               id="playerTag"
               name="playerTag"
               value={request.playerTag || ''}
               disabled
               className="bg-muted"
             />
           </div>
           <div className="space-y-2">
             <Label htmlFor="playerPaymentMethod">Payment Method</Label>
             <Input
               id="playerPaymentMethod"
               name="playerPaymentMethod"
               value={request.paymentMethod || 'N/A'}
               disabled
               className="bg-muted"
             />
           </div>
        </div>

               {/* Second Row - Amount Info */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Withdrawal</Label>
            <Input
              id="amount"
              name="amount"
              value={`$${request.amount.toLocaleString()}`}
              disabled
              className="bg-muted"
            />
          </div>
                                                                               <div className="space-y-2">
              <Label htmlFor="paidAmount">Amount</Label>
                           <Input
                 id="paidAmount"
                 name="paidAmount"
                 type="text"
                 value={paidAmount}
                 onChange={handleAmountChange}
                 placeholder="Enter amount"
                 className="font-semibold"
                 autoComplete="off"
               />
            </div>
                   <div className="space-y-2">
            <Label htmlFor="pendingAmount">Pending</Label>
            <Input
              id="pendingAmount"
              name="pendingAmount"
              value={`$${pendingAmount.toLocaleString()}`}
              disabled
              className={`bg-muted font-semibold ${pendingAmount === 0 ? 'text-green-600' : 'text-orange-600'}`}
            />
          </div>
       </div>

               {/* Third Row - Payment Details */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="paymentMethod" name="paymentMethod">
                <SelectValue placeholder="Select method" />
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
              name="paymentTag"
              value={paymentTag}
              onChange={(e) => setPaymentTag(e.target.value)}
              placeholder="Enter payment tag"
              autoComplete="off"
            />
          </div>
                    <div className="space-y-2">
             <Label htmlFor="status">Status</Label>
             <Input
               id="status"
               name="status"
               value="Pending"
               disabled
               className="bg-muted font-semibold text-orange-600"
             />
           </div>
        </div>

       {/* Error Message */}
       {totalPaidAmount > request.amount && (
         <p className="text-sm text-red-500 text-center">
           Total amount cannot exceed ${request.amount.toLocaleString()}
         </p>
       )}

       {/* Action Buttons */}
       <div className="flex justify-between pt-4">
         <Button type="button" variant="destructive" onClick={onDelete} id="delete-transaction" name="delete-transaction">
           Delete Transaction
         </Button>
         <div className="flex space-x-2">
           <Button type="button" variant="outline" onClick={onCancel} id="cancel-transaction" name="cancel-transaction">
             Cancel
           </Button>
           <Button type="submit" id="submit-transaction" name="submit-transaction">
             Process Transaction
           </Button>
         </div>
       </div>
     </form>
   );
}
