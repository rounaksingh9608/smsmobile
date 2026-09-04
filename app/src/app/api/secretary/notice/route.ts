import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const { title, content } = await request.json();
    
    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        type: 'ALERT',
        author: 'Secretary'
      }
    });

    return NextResponse.json({ notice });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
