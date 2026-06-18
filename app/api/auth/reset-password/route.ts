import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password, code } = await req.json();

    if (!email || !password || !code) {
      return NextResponse.json({ error: 'Email, password, and code are required' }, { status: 400 });
    }

    // Verify code
    const verification = await prisma.verificationCode.findUnique({
      where: { email },
    });

    if (!verification || verification.code !== code) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    if (verification.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Verification code expired' }, { status: 400 });
    }

    // Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hashedPassword = await hashPassword(password);

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
      },
    });

    // Delete used code
    await prisma.verificationCode.delete({ where: { email } });

    return NextResponse.json({ 
      message: 'Password reset successfully'
    });

  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
