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
    const societyId = user.societyId;

    const complaints = await prisma.complaint.findMany({
      where: { societyId },
      orderBy: { createdAt: 'desc' }
    });
    
    const visitors = await prisma.visitor.findMany({
      where: { societyId, status: 'Pre-Authorized' },
      orderBy: { createdAt: 'desc' }
    });

    const users = await prisma.user.findMany({
      where: { societyId, role: 'Resident' },
      include: { familyMembers: true, invoices: true },
      orderBy: { createdAt: 'desc' }
    });

    const staff = await prisma.user.findMany({
      where: { 
        societyId, 
        role: { in: ['Security', 'Sweeper', 'Plumber', 'Electrician', 'Guard'] } 
      },
      orderBy: { createdAt: 'desc' }
    });

    const notices = await prisma.notice.findMany({
      where: { societyId },
      orderBy: { createdAt: 'desc' }
    });

    const expenses = await prisma.expense.findMany({
      where: { societyId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ complaints, visitors, users, staff, notices, expenses, user, society: user.society });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
