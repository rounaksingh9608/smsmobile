import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();
    
    const complaint = await prisma.complaint.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({ complaint });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
