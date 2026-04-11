import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/mail';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate 6-digit code (simple fallback)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`Attempting to upsert verification code for ${email}...`);

    // Upsert verification code
    await prisma.verificationCode.upsert({
      where: { email },
      update: { code, expiresAt },
      create: { email, code, expiresAt },
    });

    // 发送邮件（真实或模拟）
    await sendVerificationEmail(email, code);

    return NextResponse.json({ message: 'Verification code sent (check your email)' });

  } catch (error: any) {
    console.error('Send code error details:', error);
    // Return actual error message for debugging
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
}
