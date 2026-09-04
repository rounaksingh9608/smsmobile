'use server';

import { prisma } from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getVisitors() {
  return await prisma.visitor.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function updateVisitorStatus(id: string, status: string) {
  await prisma.visitor.update({
    where: { id },
    data: { status },
  });
  revalidatePath('/guard');
}

export async function getVisitorLogs() {
  return await prisma.visitor.findMany({
    where: {
      status: { in: ['Entered', 'Denied'] }
    },
    orderBy: { updatedAt: 'desc' }
  });
}

export async function manualLogVisitor(name: string, destination: string, age?: number, guestCount: number = 1) {
  await prisma.visitor.create({
    data: {
      name,
      destination,
      age,
      guestCount,
      status: 'Entered',
      icon: 'person'
    }
  });
  revalidatePath('/guard');
}

export async function manualLogDelivery(vendor: string, destination: string) {
  await prisma.visitor.create({
    data: {
      name: `${vendor} Delivery`,
      destination,
      status: 'Entered',
      icon: 'local_shipping'
    }
  });
  revalidatePath('/guard');
}

export async function manualLogVehicle(registration: string, destination: string) {
  await prisma.visitor.create({
    data: {
      name: `Vehicle ${registration}`,
      destination,
      status: 'Entered',
      icon: 'directions_car'
    }
  });
  revalidatePath('/guard');
}

export async function scanVisitorQr(token: string) {
  const visitor = await prisma.visitor.findUnique({
    where: { qrToken: token }
  });

  if (!visitor) {
    return { success: false, message: 'Invalid Pass: Token not found.' };
  }

  if (visitor.status === 'Entered') {
    return { success: false, message: 'Invalid Pass: Already used.' };
  }

  if (visitor.expiresAt && visitor.expiresAt < new Date()) {
    return { success: false, message: 'Invalid Pass: Token has expired.' };
  }

  await prisma.visitor.update({
    where: { id: visitor.id },
    data: { status: 'Entered' }
  });

  revalidatePath('/guard');
  return { success: true, message: `Access Granted to ${visitor.name}` };
}
