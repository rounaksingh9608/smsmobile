import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = authHeader.replace('Bearer ', '');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.societyId) return NextResponse.json({ error: 'User or Society not found' }, { status: 404 });

    const { title, content } = await request.json();
    
    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        type: 'ALERT',
        author: user.name,
        societyId: user.societyId
      }
    });

    return NextResponse.json({ notice });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
