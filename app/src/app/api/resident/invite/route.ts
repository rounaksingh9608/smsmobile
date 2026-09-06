import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = authHeader.replace('Bearer ', '');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

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
        destination: `Tower ${user.tower}, Apt ${user.apartment}`,
        status: 'Pre-Authorized',
        icon: 'person',
        societyId: user.societyId
      }
    });

    revalidatePath('/guard');
    return NextResponse.json({ id: visitor.id, qrToken: visitor.qrToken });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
