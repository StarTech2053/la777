
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Staff } from "@/lib/types";

function ClientFormattedDate({ dateString, format: formatString }: { dateString: string, format: string }) {
  const [formattedDate, setFormattedDate] = React.useState<string>('');

  React.useEffect(() => {
    setFormattedDate(format(new Date(dateString), formatString));
  }, [dateString, formatString]);

  if (!formattedDate) {
    return null;
  }

  return <>{formattedDate}</>;
}

interface StaffTableProps {
    staffData: Staff[];
    selectedStaffIds: Set<string>;
    onSelectionChange: (selectedIds: Set<string>) => void;
    onEdit: (staff: Staff) => void;
    onDelete: (staff: Staff) => void;
}

export function StaffTable({ 
    staffData,
    selectedStaffIds,
    onSelectionChange,
    onEdit,
    onDelete,
}: StaffTableProps) {

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    const newSelectedIds = new Set<string>();
    if (checked === true) {
      staffData.forEach((s) => newSelectedIds.add(s.id));
    }
    onSelectionChange(newSelectedIds);
  };

  const handleSelectRow = (staffId: string) => {
    const newSelectedIds = new Set(selectedStaffIds);
    if (newSelectedIds.has(staffId)) {
      newSelectedIds.delete(staffId);
    } else {
      newSelectedIds.add(staffId);
    }
    onSelectionChange(newSelectedIds);
  };

  const isAllSelected = staffData.length > 0 && selectedStaffIds.size === staffData.length;
  const isSomeSelected = selectedStaffIds.size > 0 && selectedStaffIds.size < staffData.length;

  return (
    <div className="rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
               <Checkbox
                checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                onCheckedChange={handleSelectAll}
                disabled={staffData.length === 0}
              />
            </TableHead>
            <TableHead>Staff Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffData.length > 0 ? staffData.map((member) => (
            <TableRow 
                key={member.id}
                data-state={selectedStaffIds.has(member.id) && "selected"}
            >
              <TableCell>
                 <Checkbox
                  checked={selectedStaffIds.has(member.id)}
                  onCheckedChange={() => handleSelectRow(member.id)}
                />
              </TableCell>
              <TableCell>
                <div className="font-medium">{member.name}</div>
                <div className="text-xs text-muted-foreground">{member.email}</div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{member.role}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={member.status === "Active" ? "success" : "destructive"}
                >
                  {member.status}
                </Badge>
              </TableCell>
              <TableCell><ClientFormattedDate dateString={member.lastLogin} format="Pp" /></TableCell>
              <TableCell><ClientFormattedDate dateString={member.createdDate} format="PP" /></TableCell>
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
                    <DropdownMenuItem onSelect={() => onEdit(member)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(member)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No staff members found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
       <div className="flex items-center justify-between p-4 border-t">
        <div className="text-sm text-muted-foreground">
          {selectedStaffIds.size} of {staffData.length} row(s) selected.
        </div>
      </div>
    </div>
  );
}
