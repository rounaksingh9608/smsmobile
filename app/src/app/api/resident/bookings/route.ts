import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const { facilityId, date, endDate } = await request.json();
    
    const booking = await prisma.facilityBooking.create({
      data: {
        facilityId,
        userId: 'Resident (Unit 402)',
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
        status: 'ACTIVE'
      }
    });

    return NextResponse.json({ booking });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
