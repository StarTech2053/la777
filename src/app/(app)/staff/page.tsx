
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StaffTable } from "@/components/staff/staff-table";
import { UserPlus, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Staff } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { EditStaffDialog } from "@/components/staff/edit-staff-dialog";
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
import { deleteStaff } from "./actions";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";


export default function StaffPage() {
  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selectedStaffMember, setSelectedStaffMember] = React.useState<Staff | undefined>(undefined);
  const [selectedStaffIds, setSelectedStaffIds] = React.useState<Set<string>>(new Set());

  const router = useRouter();
  const { toast } = useToast();

  const reloadStaff = React.useCallback(() => {
    setIsLoading(true);
    const staffQuery = query(collection(db, "staff"), orderBy("createdDate", "desc"));
    const unsubscribe = onSnapshot(staffQuery, (snapshot) => {
        const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
        setStaff(staffData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching staff:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch staff from the database.' });
        setIsLoading(false);
    });

    return unsubscribe;
  }, [toast]);

  React.useEffect(() => {
    const unsubscribe = reloadStaff();
    return () => unsubscribe();
  }, [reloadStaff]);

  const filteredStaff = React.useMemo(() => {
    // First filter out deleted staff
    const activeStaff = staff.filter(s => s.status !== 'Deleted' && !s.deleted);
    
    // Then apply search filter
    if (!searchQuery) return activeStaff;
    return activeStaff.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [staff, searchQuery]);

  const handleEdit = (staffMember: Staff) => {
    setSelectedStaffMember(staffMember);
    setIsEditOpen(true);
  };
  
  const handleDelete = (staffMember?: Staff) => {
    if (staffMember) {
      setSelectedStaffIds(new Set([staffMember.id]));
    }
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedStaffIds.size === 0) return;
    try {
      const result = await deleteStaff(selectedStaffIds);
      if (result.success) {
        toast({ variant: "success", title: "Success", description: `${selectedStaffIds.size} staff member(s) deleted.` });
      }
    } catch(e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      toast({ variant: 'destructive', title: 'Error', description: errorMessage });
    } finally {
      setSelectedStaffIds(new Set());
      setIsDeleteOpen(false);
    }
  }


  const handleEditSuccess = () => {
    setIsEditOpen(false);
    toast({ variant: "success", title: "Success", description: "Staff member has been updated." });
  };


  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold md:text-2xl">Users Manage</h1>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
         <div className="w-full sm:w-auto sm:flex-1">
          <Input 
            id="search-staff"
            name="search-staff"
            placeholder="Search users..." 
            className="max-w-sm" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="destructive" className="flex-1" onClick={() => handleDelete()} disabled={selectedStaffIds.size === 0}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
          <Button className="flex-1" onClick={() => router.push('/staff/add')} disabled={selectedStaffIds.size > 0}>
            <UserPlus className="mr-2 h-4 w-4" /> Add Staff
          </Button>
        </div>
      </div>
       {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
       ) : (
          <StaffTable 
            staffData={filteredStaff} 
            onEdit={handleEdit}
            onDelete={handleDelete}
            selectedStaffIds={selectedStaffIds}
            onSelectionChange={setSelectedStaffIds}
          />
       )}

       <EditStaffDialog 
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        staffMember={selectedStaffMember}
        onSuccess={handleEditSuccess}
      />
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the selected staff member(s).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
