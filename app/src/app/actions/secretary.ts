'use server';

import { prisma } from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getComplaints() {
  return await prisma.complaint.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function getExpectedVisitors() {
  return await prisma.visitor.findMany({
    where: { status: 'Pre-Authorized' },
    orderBy: { createdAt: 'desc' }
  });
}

export async function broadcastNotice(title: string, content: string) {
  await prisma.notice.create({
    data: {
      title,
      content,
      type: 'ALERT',
      author: 'Secretary'
    }
  });
  revalidatePath('/resident');
}

export async function getUsers() {
  return await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function createUser(name: string, role: string, apartment?: string, tower?: string) {
  await prisma.user.create({
    data: {
      name,
      role,
      apartment,
      tower
    }
  });
  revalidatePath('/secretary');
}

export async function deleteUser(id: string) {
  await prisma.user.delete({
    where: { id }
  });
  revalidatePath('/secretary');
}

export async function updateComplaintStatus(id: string, status: string) {
  await prisma.complaint.update({
    where: { id },
    data: { status }
  });
  revalidatePath('/secretary');
}

