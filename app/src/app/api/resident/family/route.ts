import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = authHeader.replace('Bearer ', '');

    const body = await request.json();
    const { action, id, name, relationship, age } = body;

    if (action === 'remove' && id) {
      await prisma.familyMember.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    const member = await prisma.familyMember.create({
      data: {
        userId,
        name,
        relationship,
        age: age ? parseInt(age) : 30 // Provide default if omitted
      }
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
