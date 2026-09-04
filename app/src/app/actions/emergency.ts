'use server';

import { prisma } from '@/app/lib/prisma';

export async function triggerEmergency(type: string, user: string) {
  // End any active emergencies
  await prisma.emergencyEvent.updateMany({
    where: { status: 'ACTIVE' },
    data: { status: 'RESOLVED' }
  });

  // Create new active emergency
  const event = await prisma.emergencyEvent.create({
    data: {
      type,
      status: 'ACTIVE',
      triggeredBy: user
    }
  });

  return event;
}

export async function getActiveEmergency() {
  const active = await prisma.emergencyEvent.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' }
  });
  return active;
}

export async function resolveEmergency(id: string) {
  await prisma.emergencyEvent.update({
    where: { id },
    data: { status: 'RESOLVED' }
  });
}
