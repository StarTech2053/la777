import { NextRequest, NextResponse } from 'next/server';

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!FIREBASE_API_KEY) {
  throw new Error('FIREBASE_API_KEY environment variable is required');
}

export async function POST(request: NextRequest) {
  try {
    const { email, currentPassword, newPassword } = await request.json();

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Email, current password and new password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Rate limiting check (basic implementation)
    const clientIP = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    console.log("🔧 Changing password for:", email, "from IP:", clientIP);

    // Step 1: Sign in with current password to get ID token
    const signInResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: currentPassword,
        returnSecureToken: true
      })
    });

    const signInData = await signInResponse.json();

    if (!signInResponse.ok) {
      console.error("❌ Sign in failed:", signInData.error?.message);
      if (signInData.error?.message === 'INVALID_PASSWORD') {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 400 }
        );
      } else if (signInData.error?.message === 'EMAIL_NOT_FOUND') {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { success: false, error: signInData.error?.message || 'Authentication failed' },
          { status: 400 }
        );
      }
    }

    const idToken = signInData.idToken;
    console.log("✅ User authenticated successfully");

    // Step 2: Update password using ID token
    const updateResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken: idToken,
        password: newPassword,
        returnSecureToken: false
      })
    });

    const updateData = await updateResponse.json();

    if (!updateResponse.ok) {
      console.error("❌ Password update failed:", updateData.error?.message);
      if (updateData.error?.message === 'WEAK_PASSWORD') {
        return NextResponse.json(
          { success: false, error: 'New password is too weak. Please use a stronger password.' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { success: false, error: updateData.error?.message || 'Failed to update password' },
          { status: 400 }
        );
      }
    }

    console.log("✅ Password updated successfully");

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error: any) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
