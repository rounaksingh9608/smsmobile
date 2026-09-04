import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const { action, id, name, role, apartment, tower } = await request.json();
    
    if (action === 'create') {
      const user = await prisma.user.create({
        data: {
          name,
          role,
          apartment,
          tower
        }
      });
      return NextResponse.json({ user });
    } else if (action === 'delete') {
      await prisma.user.delete({
        where: { id }
      });
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
