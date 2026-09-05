import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const { action, id, name, relationship, age } = await request.json();
    
    if (action === 'add') {
      const member = await prisma.familyMember.create({
        data: {
          userId: 'Resident (Unit 402)',
          name,
          relationship,
          age: parseInt(age) || 0
        }
      });
      return NextResponse.json({ member });
    } else if (action === 'remove') {
      await prisma.familyMember.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
