import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const logs = await prisma.visitor.findMany({
      where: {
        status: { in: ['Entered', 'Denied'] }
      },
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
