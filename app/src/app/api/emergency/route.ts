import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const { title, author } = await request.json();

    const emergency = await prisma.complaint.create({
      data: {
        title: title || 'GATE EMERGENCY',
        author: author || 'Security Guard',
        status: 'OPEN'
      }
    });

    revalidatePath('/secretary');
    revalidatePath('/guard');
    return NextResponse.json({ emergency }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
