'use server';

import { prisma } from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

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
  const cookieStore = await cookies();
  const societyId = cookieStore.get('society-id')?.value;
  if (!societyId) return [];

  return await prisma.user.findMany({
    where: { societyId, role: 'Resident' },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getUserDetails(id: string) {
  const cookieStore = await cookies();
  const societyId = cookieStore.get('society-id')?.value;
  if (!societyId) return null;

  return await prisma.user.findUnique({
    where: { id, societyId },
    include: {
      familyMembers: true,
      vehicles: true
    }
  });
}

export async function createUser(name: string, role: string, phone: string, apartment?: string, tower?: string) {
  const cookieStore = await cookies();
  const societyId = cookieStore.get('society-id')?.value;

  if (!societyId) throw new Error("Unauthorized");

  // Generate a random 8-character password
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Generate loginId: name@flat for resident, else name@role
  const sanitizedName = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
  let loginId = '';
  if (role === 'Resident' && apartment) {
    loginId = `${sanitizedName}@${apartment}`;
  } else {
    loginId = `${sanitizedName}@${role.toLowerCase()}`;
  }

  const user = await prisma.user.create({
    data: {
      name,
      role,
      phone,
      loginId,
      password,
      societyId,
      apartment,
      tower
    }
  });
  
  revalidatePath('/secretary');
  return { id: user.id, loginId, password, phone };
}

export async function deleteUser(id: string) {
  const cookieStore = await cookies();
  const societyId = cookieStore.get('society-id')?.value;
  if (!societyId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.societyId !== societyId) {
    throw new Error("Unauthorized to delete this user");
  }

  if (user.role.toLowerCase() === 'secretary') {
    throw new Error("Secretaries cannot delete other secretaries");
  }

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

