
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
import { format } from "date-fns";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Report } from "@/lib/types";
import { Loader2 } from "lucide-react";

export function ReportsTable() {
  const [reports, setReports] = React.useState<Report[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const reportsQuery = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
        const reportsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                date: data.date,
                playerName: data.playerName,
                gameName: data.gameName,
                transactionType: data.type,
                amount: data.amount,
                staffName: data.staffName,
                balanceAfter: data.balanceAfter || 0, // Assuming this might not exist on all tx
                notes: data.notes
            } as Report;
        });
        setReports(reportsData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching reports:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
        <div className="rounded-lg border shadow-sm flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Game</TableHead>
            <TableHead>Transaction Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.length > 0 ? reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell>{format(new Date(report.date), 'Pp')}</TableCell>
              <TableCell>{report.playerName}</TableCell>
              <TableCell>{report.gameName}</TableCell>
              <TableCell>{report.transactionType}</TableCell>
              <TableCell>
                {report.transactionType === 'Deposit' || report.transactionType === 'Withdraw' ? '$' : ''}
                {report.amount.toLocaleString()}
              </TableCell>
              <TableCell>{report.staffName}</TableCell>
              <TableCell>{report.notes || 'N/A'}</TableCell>
            </TableRow>
          )) : (
             <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                    No reports found.
                </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
