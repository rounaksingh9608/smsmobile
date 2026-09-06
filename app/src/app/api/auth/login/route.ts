import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { societyId, identifier, password } = body;

    if (!societyId || !identifier || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        societyId,
        password,
        OR: [
          { phone: identifier },
          { loginId: identifier }
        ]
      },
      include: {
        society: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return NextResponse.json({
      token: user.id, // Mock token
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        societyId: user.societyId,
        societyName: user.society?.name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
