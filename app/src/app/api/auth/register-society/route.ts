import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, password } = body;

    if (!name || !phone || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if society exists
    const existingSociety = await prisma.society.findFirst({
      where: {
        OR: [{ email }, { phone }]
      }
    });

    if (existingSociety) {
      return NextResponse.json({ error: 'A society with this email or phone already exists' }, { status: 400 });
    }

    // Create Society
    const society = await prisma.society.create({
      data: {
        name,
        phone,
        email,
        password, // In a real app, hash this!
      },
    });

    // Create Secretary User
    const user = await prisma.user.create({
      data: {
        name: 'Secretary',
        role: 'secretary',
        phone,
        password, // In a real app, hash this!
        societyId: society.id,
      },
    });

    return NextResponse.json({ success: true, societyId: society.id });
  } catch (error) {
    console.error("Register Society Error:", error);
    return NextResponse.json({ error: 'Failed to register society' }, { status: 500 });
  }
}
