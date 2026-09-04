import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token required.' }, { status: 400 });
    }

    const visitor = await prisma.visitor.findUnique({
      where: { qrToken: token }
    });

    if (!visitor) {
      return NextResponse.json({ success: false, message: 'Invalid Pass: Token not found.' });
    }

    if (visitor.status === 'Entered') {
      return NextResponse.json({ success: false, message: 'Invalid Pass: Already used.' });
    }

    if (visitor.expiresAt && visitor.expiresAt < new Date()) {
      return NextResponse.json({ success: false, message: 'Invalid Pass: Token has expired.' });
    }

    await prisma.visitor.update({
      where: { id: visitor.id },
      data: { status: 'Entered' }
    });

    revalidatePath('/guard');
    return NextResponse.json({ success: true, message: `Access Granted to ${visitor.name}` });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
