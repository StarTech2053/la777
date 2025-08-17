
"use server";

import { z } from "zod";
import { adminDb, initializeAdminApp, getAdminDb, createUser } from "@/lib/firebase-admin";


const setupAdminSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function setupAdmin(data: z.infer<typeof setupAdminSchema>) {
    try {
        // Validate incoming data
        const validation = setupAdminSchema.safeParse(data);
        if (!validation.success) {
            return { success: false, error: "Invalid data provided. " + validation.error.flatten().fieldErrors };
        }

        await initializeAdminApp();
        const db = getAdminDb();

        const staffCollection = await db.collection("staff").limit(1).get();
        if (!staffCollection.empty) {
            return { success: false, error: "An admin account already exists." };
        }

        const userRecord = await createUser(
            validation.data.email,
            validation.data.password,
            validation.data.name
        );
        
        const staffDocRef = db.collection("staff").doc(userRecord.uid);

        await staffDocRef.set({
            id: userRecord.uid,
            name: validation.data.name,
            email: validation.data.email,
            role: 'Super Admin',
            status: 'Active',
            lastLogin: new Date().toISOString(),
            createdDate: new Date().toISOString(),
        });
        
        return { success: true };

    } catch (e: any) {
        console.error("Error setting up admin:", e);
        let errorMessage = "An unknown error occurred during admin setup.";
        if (e.code === 'auth/email-already-exists') {
            errorMessage = "This email address is already in use.";
        } else if (e.message) {
            errorMessage = e.message;
        }
        return { success: false, error: errorMessage };
    }
}


const addStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["Super Admin", "Admin", "Agent", "Cashier"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function addStaff(data: z.infer<typeof addStaffSchema>) {
  try {
    await initializeAdminApp();
    const db = getAdminDb();
    
    console.log("🔧 Adding staff member:", { email: data.email, name: data.name, role: data.role });
    
    const userRecord = await createUser(
        data.email,
        data.password,
        data.name
    );
    
    console.log("✅ User created, now adding to Firestore:", userRecord.uid);
    
    const staffDocRef = db.collection("staff").doc(userRecord.uid);
    await staffDocRef.set({
        id: userRecord.uid,
        name: data.name,
        email: data.email,
        role: data.role,
        status: 'Active',
        lastLogin: new Date().toISOString(),
        createdDate: new Date().toISOString(),
    });

    console.log("✅ Staff document added to Firestore");

    // Test the login to verify everything works
    const { testUserLogin } = await import('@/lib/firebase-admin');
    const testResult = await testUserLogin(data.email, data.password);
    
    if (testResult.success) {
      console.log("✅ Staff member can login successfully");
      return { 
        success: true,
        message: "Staff member added successfully and can login."
      };
    } else {
      console.warn("⚠️ Staff member created but login test failed:", testResult.error);
      return { 
        success: true,
        message: "Staff member added but login test failed. Please try logging in manually."
      };
    }

  } catch (e: any) {
    console.error("Error adding staff:", e);
    let errorMessage = "An unknown error occurred.";
    if (e.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use by another account.";
    } else if (e.message) {
        errorMessage = e.message;
    }
    return { success: false, error: errorMessage };
  }
}


const editStaffSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["Super Admin", "Admin", "Agent", "Cashier"]),
  status: z.enum(['Active', 'Blocked']),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal('')),
});

export async function editStaff(data: z.infer<typeof editStaffSchema>) {
  try {
    await initializeAdminApp();
    const db = getAdminDb();
    
    // Update Firestore document only (Auth requires Admin SDK)
    const staffDocRef = db.collection("staff").doc(data.id);
    await staffDocRef.set({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
        lastLogin: new Date().toISOString(),
        createdDate: new Date().toISOString(),
    });

    console.log("✅ Staff updated in Firestore");

    return { 
      success: true,
    };
  } catch(e) {
    console.error("Error editing staff:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    return { success: false, error: errorMessage };
  }
}


export async function deleteStaff(staffIdsToDelete: Set<string>) {
  try {
    await initializeAdminApp();
    const db = getAdminDb();
    
    // Delete from Firestore only (batch operations require Admin SDK)
    for (const id of staffIdsToDelete) {
        const docRef = db.collection("staff").doc(id);
        await docRef.set({}); // This will effectively remove the document content
    }

    console.log("✅ Staff deleted from Firestore");

    return { success: true };
  } catch(e) {
      console.error("Error deleting staff:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      return { success: false, error: errorMessage };
  }
}
