import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const userRecord = await createUser(email, password, displayName || 'Test User');

    return NextResponse.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email
      }
    });

  } catch (error: any) {
    console.error('Error creating test user:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
