import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const { name, age, guestCount, phone } = await request.json();
    
    const qrToken = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const visitor = await prisma.visitor.create({
      data: {
        name,
        age: age ? parseInt(age) : null,
        guestCount: guestCount ? parseInt(guestCount) : 1,
        phone,
        qrToken,
        expiresAt,
        destination: 'Unit 402',
        status: 'Pre-Authorized',
        icon: 'person'
      }
    });

    revalidatePath('/guard');
    return NextResponse.json({ id: visitor.id, qrToken: visitor.qrToken });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
