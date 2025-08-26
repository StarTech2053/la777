import { z } from 'zod';

// Input validation schemas
export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number');

// Sanitization functions
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function validateAndSanitizeInput(input: any, schema: z.ZodSchema) {
  try {
    const validated = schema.parse(input);
    return { success: true, data: validated };
  } catch (error) {
    return { success: false, error: error };
  }
}

// Rate limiting utility
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// XSS Prevention
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// CSRF Protection
export function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function validateCSRFToken(token: string, storedToken: string): boolean {
  return token === storedToken;
}

// SQL Injection Prevention (for any future database queries)
export function sanitizeSQLInput(input: string): string {
  return input.replace(/['";\\]/g, '');
}

// File upload validation
export const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const maxFileSize = 5 * 1024 * 1024; // 5MB

export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  if (!allowedImageTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' };
  }

  if (file.size > maxFileSize) {
    return { valid: false, error: 'File size too large. Maximum size is 5MB.' };
  }

  return { valid: true };
}

// Audit logging
export function logSecurityEvent(event: string, userId?: string, details?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    userId,
    details,
    ip: 'CLIENT_IP', // This should be passed from the request
    userAgent: 'USER_AGENT' // This should be passed from the request
  };

  console.log('🔒 Security Event:', logEntry);
  // In production, this should be sent to a secure logging service
}

// Session security
export function generateSecureSessionId(): string {
  return crypto.randomUUID();
}

// Password strength checker
export function checkPasswordStrength(password: string): { score: number; feedback: string[] } {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('Password should be at least 8 characters long');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Password should contain at least one lowercase letter');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Password should contain at least one uppercase letter');

  if (/\d/.test(password)) score++;
  else feedback.push('Password should contain at least one number');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('Password should contain at least one special character');

  return { score, feedback };
}
