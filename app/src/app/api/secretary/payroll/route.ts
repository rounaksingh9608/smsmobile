import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = authHeader.replace('Bearer ', '');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role.toLowerCase() !== 'secretary' || !user.societyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const societyId = user.societyId;
    const currentMonthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    // Check if payroll already run
    const existingPayroll = await prisma.expense.findFirst({
      where: {
        societyId,
        title: { contains: currentMonthLabel }
      }
    });

    if (existingPayroll) {
      return NextResponse.json({ error: 'Payroll already executed for this month' }, { status: 400 });
    }

    // Fetch staff
    const staff = await prisma.user.findMany({
      where: { 
        societyId, 
        role: { in: ['Security', 'Sweeper', 'Plumber', 'Electrician', 'Guard'] } 
      }
    });

    const expenses = [];

    // Add secretary salary
    expenses.push({
      title: `Secretary Salary - ${currentMonthLabel}`,
      amount: 500,
      recipientId: user.id,
      societyId
    });

    // Add staff salaries
    for (const member of staff) {
      expenses.push({
        title: `${member.role} Salary - ${currentMonthLabel}`,
        amount: 200,
        recipientId: member.id,
        societyId
      });
    }

    await prisma.expense.createMany({
      data: expenses
    });

    return NextResponse.json({ message: 'Payroll executed successfully', count: expenses.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
