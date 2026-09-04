import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const { action, id, type, makeModel, registration } = await request.json();
    
    if (action === 'add') {
      const vehicle = await prisma.vehicle.create({
        data: {
          userId: 'Resident (Unit 402)',
          type,
          makeModel,
          registration
        }
      });
      return NextResponse.json({ vehicle });
    } else if (action === 'remove') {
      await prisma.vehicle.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
