import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import { storage } from "./firebase";

// Fallback to base64 for local development
const useBase64Fallback = process.env.NODE_ENV === 'development';

// Convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
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
    
    // Use base64 fallback for local development
    if (useBase64Fallback) {
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
  } catch (error) {
    console.error("❌ Error uploading file:", error);
    
    // If Firebase Storage fails, fallback to base64
    if (useBase64Fallback || (error instanceof Error && error.message.includes('cors'))) {
      console.log("🔄 Falling back to base64 due to CORS error");
      try {
        const base64Data = await fileToBase64(file);
        console.log("✅ Base64 fallback successful");
        return base64Data;
      } catch (base64Error) {
        console.error("❌ Base64 fallback also failed:", base64Error);
        throw new Error("Failed to process image. Please try again.");
      }
    }
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('unauthorized')) {
        throw new Error("Upload failed: Please sign in again");
      } else if (error.message.includes('quota')) {
        throw new Error("Upload failed: Storage quota exceeded");
      } else if (error.message.includes('network')) {
        throw new Error("Upload failed: Network error. Please check your connection");
      } else if (error.message.includes('cors')) {
        throw new Error("Upload failed: CORS error. Please try again");
      }
    }
    
    throw new Error("Failed to upload file. Please try again.");
  }
}

// Upload image with compression and validation
export async function uploadImage(
  file: File,
  path: string,
  maxSize: number = 1024 * 1024 // 1MB default
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

    // Validate image dimensions (optional)
    const isValidImage = await validateImage(file);
    if (!isValidImage) {
      throw new Error('Invalid image file. Please try a different image.');
    }

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
  const path = `avatars/${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  return await uploadImage(file, path, 2 * 1024 * 1024); // 2MB max for avatars
}

// Upload game image with specific settings
export async function uploadGameImage(
  file: File,
  gameId: string
): Promise<string> {
  console.log("🔄 Uploading game image for game:", gameId);
  const path = `games/${gameId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  return await uploadImage(file, path, 5 * 1024 * 1024); // 5MB max for game images
}

// Delete file from storage
export async function deleteFile(path: string): Promise<void> {
  try {
    console.log("🔄 Deleting file:", path);
    
    // Skip deletion for base64 fallback
    if (useBase64Fallback) {
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
    if (useBase64Fallback) {
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
