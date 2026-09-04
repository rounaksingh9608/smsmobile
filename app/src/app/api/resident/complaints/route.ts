import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const { title } = await request.json();
    const complaint = await prisma.complaint.create({
      data: {
        title,
        status: 'OPEN',
        author: 'Resident (Unit 402)'
      }
    });
    revalidatePath('/secretary');
    return NextResponse.json({ complaint });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
