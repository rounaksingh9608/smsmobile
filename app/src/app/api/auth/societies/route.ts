import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const societies = await prisma.society.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(societies);
  } catch (error) {
    console.error('Error fetching societies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
