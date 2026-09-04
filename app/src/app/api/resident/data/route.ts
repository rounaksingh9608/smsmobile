import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const [notices, complaints, facilities, bookings, invoices, familyMembers, vehicles] = await Promise.all([
      prisma.notice.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.complaint.findMany({ where: { author: 'Resident (Unit 402)' }, orderBy: { createdAt: 'desc' } }),
      prisma.facility.findMany(),
      prisma.facilityBooking.findMany({ where: { userId: 'Resident (Unit 402)' }, include: { facility: true }, orderBy: { createdAt: 'desc' } }),
      prisma.invoice.findMany({ where: { userId: 'Resident (Unit 402)' }, orderBy: { createdAt: 'desc' } }),
      prisma.familyMember.findMany({ where: { userId: 'Resident (Unit 402)' }, orderBy: { createdAt: 'asc' } }),
      prisma.vehicle.findMany({ where: { userId: 'Resident (Unit 402)' }, orderBy: { createdAt: 'asc' } })
    ]);

    return NextResponse.json({
      notices,
      complaints,
      facilities,
      bookings,
      invoices,
      familyMembers,
      vehicles
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
