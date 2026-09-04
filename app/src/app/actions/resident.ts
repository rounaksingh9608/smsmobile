'use server';

import { prisma } from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getNotices() {
  return await prisma.notice.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function getFacilities() {
  let facilities = await prisma.facility.findMany();
  if (facilities.length === 0) {
    // Seed default facilities
    await prisma.facility.createMany({
      data: [
        { name: 'Gym', description: 'Fully equipped fitness center', rate: 50, validity: 'Monthly', icon: 'fitness_center' },
        { name: 'Swimming Pool', description: 'Olympic size pool with heating', rate: 30, validity: 'Monthly', icon: 'pool' },
        { name: 'Party Lawn', description: 'Outdoor lawn for events (50 pax max)', rate: 100, validity: 'Daily', icon: 'celebration' }
      ]
    });
    facilities = await prisma.facility.findMany();
  }
  return facilities;
}

export async function getMyBookings() {
  return await prisma.facilityBooking.findMany({
    where: { userId: 'Resident (Unit 402)' },
    include: { facility: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function bookFacility(facilityId: string, date: Date, endDate?: Date) {
  await prisma.facilityBooking.create({
    data: {
      facilityId,
      userId: 'Resident (Unit 402)',
      date,
      endDate: endDate || null,
      status: 'ACTIVE'
    }
  });
}

export async function getInvoices() {
  let invoices = await prisma.invoice.findMany({
    where: { userId: 'Resident (Unit 402)' },
    orderBy: { createdAt: 'desc' }
  });

  if (invoices.length === 0) {
    // Seed default invoices
    await prisma.invoice.createMany({
      data: [
        { userId: 'Resident (Unit 402)', title: 'Monthly Maintenance - September', amount: 120.00, dueDate: new Date(new Date().setDate(new Date().getDate() + 5)), status: 'PENDING' },
        { userId: 'Resident (Unit 402)', title: 'Monthly Maintenance - August', amount: 120.00, dueDate: new Date(new Date().setDate(new Date().getDate() - 25)), status: 'PAID', paidAt: new Date(new Date().setDate(new Date().getDate() - 26)) },
        { userId: 'Resident (Unit 402)', title: 'Gym Membership - August', amount: 50.00, dueDate: new Date(new Date().setDate(new Date().getDate() - 28)), status: 'PAID', paidAt: new Date(new Date().setDate(new Date().getDate() - 29)) }
      ]
    });
    invoices = await prisma.invoice.findMany({
      where: { userId: 'Resident (Unit 402)' },
      orderBy: { createdAt: 'desc' }
    });
  }
  return invoices;
}

export async function payInvoice(invoiceId: string) {
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'PAID',
      paidAt: new Date()
    }
  });
}

export async function getComplaints() {
  return await prisma.complaint.findMany({
    where: { author: 'Resident (Unit 402)' },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getFamilyMembers() {
  let members = await prisma.familyMember.findMany({
    where: { userId: 'Resident (Unit 402)' },
    orderBy: { createdAt: 'asc' }
  });

  if (members.length === 0) {
    await prisma.familyMember.createMany({
      data: [
        { userId: 'Resident (Unit 402)', name: 'Priya', relationship: 'Spouse', age: 34 },
        { userId: 'Resident (Unit 402)', name: 'Aarav', relationship: 'Child', age: 8 },
        { userId: 'Resident (Unit 402)', name: 'Diya', relationship: 'Child', age: 5 }
      ]
    });
    members = await prisma.familyMember.findMany({
      where: { userId: 'Resident (Unit 402)' },
      orderBy: { createdAt: 'asc' }
    });
  }
  return members;
}

export async function getVehicles() {
  let vehicles = await prisma.vehicle.findMany({
    where: { userId: 'Resident (Unit 402)' },
    orderBy: { createdAt: 'asc' }
  });

  if (vehicles.length === 0) {
    await prisma.vehicle.createMany({
      data: [
        { userId: 'Resident (Unit 402)', type: 'Car', makeModel: 'Honda City', registration: 'MH 12 AB 1234' },
        { userId: 'Resident (Unit 402)', type: 'Bike', makeModel: 'Royal Enfield', registration: 'MH 12 CD 5678' }
      ]
    });
    vehicles = await prisma.vehicle.findMany({
      where: { userId: 'Resident (Unit 402)' },
      orderBy: { createdAt: 'asc' }
    });
  }
  return vehicles;
}

export async function addFamilyMember(name: string, relationship: string, age: number) {
  await prisma.familyMember.create({
    data: {
      userId: 'Resident (Unit 402)',
      name,
      relationship,
      age
    }
  });
}

export async function removeFamilyMember(id: string) {
  await prisma.familyMember.delete({
    where: { id }
  });
}

export async function addVehicle(type: string, makeModel: string, registration: string) {
  await prisma.vehicle.create({
    data: {
      userId: 'Resident (Unit 402)',
      type,
      makeModel,
      registration
    }
  });
}

export async function removeVehicle(id: string) {
  await prisma.vehicle.delete({
    where: { id }
  });
}

export async function raiseComplaint(title: string) {
  await prisma.complaint.create({
    data: {
      title,
      status: 'OPEN',
      author: 'Resident (Unit 402)'
    }
  });
  revalidatePath('/secretary');
}

export async function inviteVisitor(name: string, age: number, guestCount: number, phone?: string) {
  // Generate random 8-character token
  const qrToken = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  // Set expiration to 24 hours from now
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const visitor = await prisma.visitor.create({
    data: {
      name,
      age,
      guestCount,
      phone,
      qrToken,
      expiresAt,
      destination: 'Unit 402',
      status: 'Pre-Authorized',
      icon: 'person'
    }
  });
  revalidatePath('/guard');
  
  return { id: visitor.id, qrToken: visitor.qrToken };
}
