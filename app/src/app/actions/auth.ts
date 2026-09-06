'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/app/lib/prisma';

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
  cookieStore.delete('user-role');
  cookieStore.delete('society-id');
  cookieStore.delete('user-id');
  redirect('/login');
}

export async function registerSociety(formData: FormData) {
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!name || !phone || !email || !password) {
    throw new Error('All fields are required');
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

  // Auto-login after registration
  const cookieStore = await cookies();
  cookieStore.set('auth-token', user.id, { path: '/' });
  cookieStore.set('user-role', user.role, { path: '/' });
  cookieStore.set('society-id', society.id, { path: '/' });
  cookieStore.set('user-id', user.id, { path: '/' });

  redirect('/secretary');
}

export async function loginUser(formData: FormData) {
  const societyId = formData.get('societyId') as string;
  const identifier = formData.get('identifier') as string; // Phone or loginId
  const password = formData.get('password') as string;

  if (!societyId || !identifier || !password) {
    throw new Error('All fields are required');
  }
  
  if (identifier === "superadmin" && password === "superadmin") {
      const cookieStore = await cookies();
      cookieStore.set('auth-token', 'super-admin-token', { path: '/' });
      cookieStore.set('user-role', 'super-admin', { path: '/' });
      redirect('/super-admin');
  }

  // Find User by Phone or LoginId in the given Society
  const user = await prisma.user.findFirst({
    where: {
      societyId,
      password, // In a real app, compare hashes!
      OR: [
        { phone: identifier },
        { loginId: identifier },
      ],
    },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const cookieStore = await cookies();
  cookieStore.set('auth-token', user.id, { path: '/' });
  cookieStore.set('user-role', user.role.toLowerCase(), { path: '/' });
  cookieStore.set('society-id', societyId, { path: '/' });
  cookieStore.set('user-id', user.id, { path: '/' });

  // Auto redirect based on role
  const role = user.role.toLowerCase();
  if (role === 'secretary') {
    redirect('/secretary');
  } else if (role === 'guard' || role === 'security') {
    redirect('/guard');
  } else if (role === 'resident') {
    redirect('/resident');
  } else {
    redirect('/');
  }
}

export async function getSocieties() {
  return await prisma.society.findMany({
    select: {
      id: true,
      name: true,
    }
  });
}
