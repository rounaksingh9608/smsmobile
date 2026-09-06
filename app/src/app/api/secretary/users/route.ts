import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const secretaryId = authHeader.replace('Bearer ', '');

    const secretary = await prisma.user.findUnique({ where: { id: secretaryId } });
    if (!secretary || !secretary.societyId) return NextResponse.json({ error: 'Invalid user' }, { status: 403 });
    const societyId = secretary.societyId;

    const { action, id, name, role, apartment, tower } = await request.json();
    
    if (action === 'create') {
      const sanitizedName = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
      let loginId = '';
      if (role === 'Resident' && apartment) {
        loginId = `${sanitizedName}@${apartment}`;
      } else {
        loginId = `${sanitizedName}@${role.toLowerCase()}`;
      }
      const password = Math.random().toString(36).slice(-8);

      const user = await prisma.user.create({
        data: {
          name,
          role,
          apartment,
          tower,
          societyId,
          loginId,
          password
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
