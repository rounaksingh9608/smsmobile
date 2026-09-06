import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = authHeader.replace('Bearer ', '');

    const { facilityId, date, endDate } = await request.json();
    
    const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
    if (!facility) return NextResponse.json({ error: 'Facility not found' }, { status: 404 });

    const startDate = new Date(date);
    const endBookingDate = endDate ? new Date(endDate) : null;
    
    const booking = await prisma.facilityBooking.create({
      data: {
        facilityId,
        userId,
        date: startDate,
        endDate: endBookingDate,
        status: 'ACTIVE'
      }
    });

    let totalAmount = facility.rate;
    if (endBookingDate) {
      const diffTime = Math.abs(endBookingDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive of both days
      if (diffDays > 0) {
        totalAmount = facility.rate * diffDays;
      }
    }

    // Generate Invoice for the booking
    await prisma.invoice.create({
      data: {
        userId,
        title: `Facility Booking: ${facility.name}`,
        amount: totalAmount,
        dueDate: new Date(), // Due immediately
        status: 'PAID', // UI confirms payment immediately
        paidAt: new Date()
      }
    });

    return NextResponse.json({ booking });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
