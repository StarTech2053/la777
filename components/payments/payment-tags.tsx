
"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, PlusCircle, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Copy, Search, Download, Trash2, MoreHorizontal, Loader2 } from "lucide-react";
import type { PaymentMethod, PaymentTag } from "@/lib/types";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { EditPaymentTagDialog } from "./edit-payment-tag-dialog";
import { AddPaymentTagDialog } from "./add-payment-tag-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "../ui/input";
import { deletePaymentTag } from "@/app/(app)/payments/actions";
import { DateRangePickerDialog } from "../ui/date-range-picker-dialog";
import type { DateRange } from "react-day-picker";
import { useAuth } from "@/hooks/use-auth";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ITEMS_PER_PAGE = 6;

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


export function PaymentTagsCard({ method }: { method: PaymentMethod }) {
  const [tags, setTags] = React.useState<PaymentTag[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  const [selectedTag, setSelectedTag] = React.useState<PaymentTag | undefined>(undefined);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] = React.useState(false);
  const { toast } = useToast();
  const { role } = useAuth();

  const reloadTags = React.useCallback(() => {
    setIsLoading(true);
    
    const tagsQuery = query(
      collection(db, "paymentTags"),
      where("method", "==", method),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(tagsQuery, (snapshot) => {
        const tagsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as PaymentTag);
        setTags(tagsData);
        setIsLoading(false);
    }, (error) => {
        console.error(`Error fetching ${method} tags:`, error);
        toast({ variant: 'destructive', title: 'Error', description: `Could not fetch ${method} tags.` });
        setIsLoading(false);
    });

    return unsubscribe;
  }, [method, toast]);

  React.useEffect(() => {
    const unsubscribe = reloadTags();
    return () => unsubscribe();
  }, [reloadTags]);

  const handleEditClick = (tag: PaymentTag) => {
    setSelectedTag(tag);
    setIsEditDialogOpen(true);
  }
  
  const handleAddClick = () => {
    setIsAddDialogOpen(true);
  }

  const handleDeleteClick = (tag: PaymentTag) => {
    setSelectedTag(tag);
    setIsDeleteAlertOpen(true);
  }

  const handleConfirmDelete = async () => {
    if (!selectedTag) return;
    try {
        const result = await deletePaymentTag(selectedTag.id);
        if (result.success) {
            toast({ variant: "success", title: "Success", description: "Payment tag deleted successfully." });
        }
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete payment tag." });
    } finally {
        setIsDeleteAlertOpen(false);
        setSelectedTag(undefined);
    }
  }

  const handleDialogSuccess = () => {
    setIsEditDialogOpen(false);
    setIsAddDialogOpen(false);
    setSelectedTag(undefined);
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        toast({
            variant: "success",
            title: "Copied to clipboard",
            description: `Tag "${text}" has been copied.`,
        });
    }, (err) => {
        toast({
            variant: "destructive",
            title: "Failed to copy",
            description: "Could not copy the tag.",
        });
    });
  };

  const handleExport = (dateRange?: DateRange) => {
    let tagsToExport = filteredTags;

    if (dateRange?.from && dateRange?.to) {
        const fromDate = new Date(dateRange.from);
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);

        tagsToExport = tagsToExport.filter(tag => {
            const tagDate = new Date(tag.date);
            return tagDate >= fromDate && tagDate <= toDate;
        });
    }

    if (tagsToExport.length === 0) {
        toast({
            variant: "destructive",
            title: "No Data",
            description: "There are no tags within the selected date range to export.",
        });
        return;
    }


    const csvHeaders = ["Tag ID", "Date & Time", "Tag", "Status"];
    const csvRows = [
      csvHeaders.join(','),
      ...tagsToExport.map(tag => [
        tag.id,
        format(new Date(tag.date), "yyyy-MM-dd HH:mm:ss"),
        `"${tag.tag}"`,
        tag.status
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
    link.setAttribute('download', `${method}-Tags-Report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsDateRangePickerOpen(false);
  };


  const filteredTags = React.useMemo(() => {
    if (!searchQuery) return tags;
    return tags.filter(tag =>
      tag.tag.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tags, searchQuery]);
  
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredTags.length / ITEMS_PER_PAGE);
  const paginatedTags = filteredTags.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
  );

  return (
    <>
      <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-col gap-4">
              <CardTitle className="text-base font-semibold">Running {method} Tags</CardTitle>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative flex-grow min-w-[150px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search Tag"
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => setIsDateRangePickerOpen(true)} disabled={tags.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Report
                    </Button>
                    {role !== 'Agent' && (
                        <Button variant="outline" size="sm" onClick={handleAddClick}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Tag
                        </Button>
                    )}
                </div>
              </div>
          </CardHeader>
          <CardContent className="p-0 flex-grow flex flex-col">
              <div className="border-t flex-grow">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full p-8"><Loader2 className="h-6 w-6 animate-spin"/></div>
                ) : (
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Date &amp; Time</TableHead>
                              <TableHead>Tag</TableHead>
                              <TableHead>Status</TableHead>
                              {role !== 'Agent' && <TableHead className="text-right">Actions</TableHead>}
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {paginatedTags.length > 0 ? paginatedTags.map(tag => (
                              <TableRow key={tag.id}>
                                  <TableCell className="text-xs">
                                      <ClientFormattedDate dateString={tag.date} />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm">{tag.tag}</span>
                                      {tag.status === 'Active' && (
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(tag.tag)}>
                                            <Copy className="h-3 w-3" />
                                            <span className="sr-only">Copy Tag</span>
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                      <Badge
                                        className={cn(
                                          'capitalize text-white',
                                          tag.status === 'Active' && 'bg-green-500 hover:bg-green-600',
                                          tag.status === 'Inactive' && 'bg-yellow-500 hover:bg-yellow-600',
                                          tag.status === 'Deactivated' && 'bg-red-500 hover:bg-red-600'
                                        )}
                                      >
                                        {tag.status}
                                      </Badge>
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
                                          <DropdownMenuItem onSelect={() => handleEditClick(tag)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit Status
                                          </DropdownMenuItem>
                                          {role === 'Admin' && (
                                            <>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteClick(tag)}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                              </DropdownMenuItem>
                                            </>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                  )}
                              </TableRow>
                          )) : (
                              <TableRow>
                                  <TableCell colSpan={role !== 'Agent' ? 4 : 3} className="h-24 text-center">
                                      No tags found.
                                  </TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
                )}
              </div>

              {totalPages > 1 && (
                  <div className="flex items-center justify-center p-2 border-t">
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
          </CardContent>
      </Card>
      <EditPaymentTagDialog 
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        tag={selectedTag}
        onSuccess={handleDialogSuccess}
      />
      <AddPaymentTagDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        method={method}
        onSuccess={handleDialogSuccess}
        />
       <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the tag <span className="font-semibold font-mono">{selectedTag?.tag}</span>.
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
  )
}
