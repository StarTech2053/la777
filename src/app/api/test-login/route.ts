import { NextRequest, NextResponse } from 'next/server';
import { testUserLogin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await testUserLogin(email, password);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Login test successful'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Error testing login:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
