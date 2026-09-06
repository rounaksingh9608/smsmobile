import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = authHeader.replace('Bearer ', '');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { title } = await request.json();
    const complaint = await prisma.complaint.create({
      data: {
        title,
        status: 'OPEN',
        author: user.name,
        societyId: user.societyId
      }
    });
    revalidatePath('/secretary');
    return NextResponse.json({ complaint });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
