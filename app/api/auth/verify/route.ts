import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email, token } = await req.json();

    if (!email || !token) {
      return NextResponse.json({ error: 'Email and token are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.verified) {
      return NextResponse.json({ message: 'User already verified' });
    }

    if (user.verificationToken !== token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verified: true,
        verificationToken: null, // Clear token after verification
      },
    });

    return NextResponse.json({ message: 'Email verified successfully' });

  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
