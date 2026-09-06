import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = authHeader.replace('Bearer ', '');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { society: true }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ user, society: user.society });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = authHeader.replace('Bearer ', '');

    const { name, phone, password, gender } = await request.json();

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;
    if (phone) dataToUpdate.phone = phone;
    if (password) dataToUpdate.password = password;
    if (gender) dataToUpdate.gender = gender;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
