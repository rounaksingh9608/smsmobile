import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = authHeader.replace('Bearer ', '');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const societyId = user.societyId;

    const [notices, complaints, facilities, bookings, invoices, familyMembers, vehicles] = await Promise.all([
      prisma.notice.findMany({ where: { societyId }, orderBy: { createdAt: 'desc' } }),
      prisma.complaint.findMany({ where: { author: user.name, societyId }, orderBy: { createdAt: 'desc' } }),
      prisma.facility.findMany({ where: { societyId } }),
      prisma.facilityBooking.findMany({ where: { userId }, include: { facility: true }, orderBy: { createdAt: 'desc' } }),
      prisma.invoice.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.familyMember.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      prisma.vehicle.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
    ]);

    return NextResponse.json({
      notices,
      complaints,
      facilities,
      bookings,
      invoices,
      familyMembers,
      vehicles,
      user
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
