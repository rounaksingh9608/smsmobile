import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function GET() {
  try {
    const visitors = await prisma.visitor.findMany({
      where: {
        status: {
          notIn: ['Entered', 'Denied']
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ visitors });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { type, name, vendor, registration, destination, age, guestCount } = data;

    let createData: any = { destination, status: 'Entered' };

    if (type === 'visitor') {
      createData.name = name;
      createData.age = age ? parseInt(age) : null;
      createData.guestCount = guestCount ? parseInt(guestCount) : 1;
      createData.icon = 'person';
    } else if (type === 'delivery') {
      createData.name = `${vendor} Delivery`;
      createData.icon = 'local_shipping';
    } else if (type === 'vehicle') {
      createData.name = `Vehicle ${registration}`;
      createData.icon = 'directions_car';
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const visitor = await prisma.visitor.create({
      data: createData
    });

    revalidatePath('/guard'); // Trigger Next.js cache invalidate
    return NextResponse.json({ visitor }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
