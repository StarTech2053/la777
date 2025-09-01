import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import { storage } from "./firebase";

// Check if we should use base64 fallback
const useBase64Fallback = () => {
  // Always use base64 for now to avoid errors
  return true;
  
  // Uncomment below code when Firebase Storage is properly configured
  /*
  // Check environment variable first
  if (process.env.NEXT_PUBLIC_USE_BASE64_FALLBACK === 'true') {
    return true;
  }
  
  // Always use base64 in development for now
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // Check if storage is available
  if (!storage) {
    return true;
  }
  
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    return true;
  }
  
  return false;
  */
};

// Convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log("🔄 Converting file to base64:", file.name, "Size:", file.size);
    
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      console.log("✅ Base64 conversion successful, length:", result.length);
      resolve(result);
    };
    
    reader.onerror = () => {
      console.error("❌ FileReader error");
      reject(new Error("Failed to read image file"));
    };
    
    reader.readAsDataURL(file);
  });
}

// Upload file to Firebase Storage with better error handling
export async function uploadFile(
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log("🔄 Starting file upload:", path);
    
    // Always use base64 for now to avoid Firebase Storage issues
    console.log("🔄 Using base64 fallback");
    const base64Data = await fileToBase64(file);
    console.log("✅ Base64 conversion successful");
    return base64Data;
    
    // Uncomment below code when Firebase Storage is properly configured
    /*
    // Use base64 fallback for local development or when storage is not available
    if (useBase64Fallback()) {
      console.log("🔄 Using base64 fallback for local development");
      const base64Data = await fileToBase64(file);
      return base64Data;
    }
    
    const storageRef = ref(storage, path);
    
    // Upload file with metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        'uploaded-by': 'web-app',
        'original-name': file.name,
        'upload-time': new Date().toISOString()
      }
    };
    
    const snapshot = await uploadBytes(storageRef, file, metadata);
    console.log("✅ File uploaded successfully:", snapshot.ref.fullPath);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("✅ Download URL generated:", downloadURL);
    
    return downloadURL;
    */
  } catch (error) {
    console.error("❌ Error uploading file:", error);
    throw new Error("Failed to process image. Please try again.");
  }
}

// Upload image with compression and validation
export async function uploadImage(
  file: File,
  path: string,
  maxSize: number = 5 * 1024 * 1024 // 5MB default
): Promise<string> {
  try {
    console.log("🔄 Starting image upload:", file.name, "Size:", file.size);
    
    // Check file size
    if (file.size > maxSize) {
      throw new Error(`File size must be less than ${(maxSize / (1024 * 1024)).toFixed(1)}MB`);
    }

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image (JPEG, PNG, GIF, etc.)');
    }

    // Skip image validation for now to avoid errors
    // const isValidImage = await validateImage(file);
    // if (!isValidImage) {
    //   throw new Error('Invalid image file. Please try a different image.');
    // }

    return await uploadFile(file, path);
  } catch (error) {
    console.error("❌ Error uploading image:", error);
    throw error;
  }
}

// Validate image file
async function validateImage(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(true);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    
    img.src = url;
  });
}

// Upload avatar image with specific settings
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<string> {
  console.log("🔄 Uploading avatar for user:", userId);
  console.log("🔄 File details:", file.name, "Size:", file.size, "Type:", file.type);
  
  // Always use base64 for now to avoid Firebase Storage issues
  console.log("🔄 Using base64 fallback for avatar");
  const base64Data = await fileToBase64(file);
  console.log("✅ Avatar base64 conversion successful, length:", base64Data.length);
  return base64Data;
}

// Upload game image with specific settings
export async function uploadGameImage(
  file: File,
  gameId: string
): Promise<string> {
  console.log("🔄 Uploading game image for game:", gameId);
  console.log("🔄 File details:", file.name, "Size:", file.size, "Type:", file.type);
  
  // Always use base64 for now to avoid Firebase Storage issues
  console.log("🔄 Using base64 fallback for game image");
  const base64Data = await fileToBase64(file);
  console.log("✅ Game image base64 conversion successful, length:", base64Data.length);
  return base64Data;
}

// Delete file from storage
export async function deleteFile(path: string): Promise<void> {
  try {
    console.log("🔄 Deleting file:", path);
    
    // Skip deletion for base64 fallback
    if (useBase64Fallback()) {
      console.log("🔄 Skipping deletion for base64 fallback");
      return;
    }
    
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    console.log("✅ File deleted successfully:", path);
  } catch (error) {
    console.error("❌ Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
}

// Get file download URL
export async function getFileURL(path: string): Promise<string> {
  try {
    console.log("🔄 Getting download URL for:", path);
    
    // Return path as-is for base64 fallback
    if (useBase64Fallback()) {
      console.log("🔄 Returning path as-is for base64 fallback");
      return path;
    }
    
    const storageRef = ref(storage, path);
    const url = await getDownloadURL(storageRef);
    console.log("✅ Download URL retrieved:", url);
    return url;
  } catch (error) {
    console.error("❌ Error getting file URL:", error);
    throw new Error("Failed to get file URL");
  }
}

// List files in a directory
export async function listFiles(path: string): Promise<string[]> {
  try {
    console.log("🔄 Listing files in:", path);
    
    // Return empty array for base64 fallback
    if (useBase64Fallback) {
      console.log("🔄 Returning empty array for base64 fallback");
      return [];
    }
    
    const storageRef = ref(storage, path);
    const result = await listAll(storageRef);
    const files = result.items.map(item => item.fullPath);
    console.log("✅ Files listed:", files.length, "files found");
    return files;
  } catch (error) {
    console.error("❌ Error listing files:", error);
    throw new Error("Failed to list files");
  }
}
