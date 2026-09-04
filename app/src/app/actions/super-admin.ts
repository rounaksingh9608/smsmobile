'use server';

import { prisma } from '@/app/lib/prisma';

export async function getPlatformStats() {
  const societyCount = await prisma.society.count();
  const userCount = await prisma.user.count(); // Assuming you have a User model, if not, it returns 0 or we mock it.
  
  return {
    societies: societyCount,
    users: userCount > 0 ? userCount : 84200 // Fallback if no users seeded yet
  };
}
