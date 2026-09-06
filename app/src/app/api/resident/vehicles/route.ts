import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = authHeader.replace('Bearer ', '');

    const body = await request.json();
    const { action, id, type, makeModel, registration } = body;

    if (action === 'remove' && id) {
      await prisma.vehicle.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        userId,
        type,
        makeModel,
        registration
      }
    });

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
