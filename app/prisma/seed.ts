import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.visitor.createMany({
    data: [
      {
        name: 'Mark Roberts',
        destination: 'Unit 402',
        status: 'Pending Approval',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxxTUXOqsASVXnbKSuvJk0lyEKSn8P4fsLjE1xKP7dPF1CpyhspoRZJ6qYq3c9am1ywVH2SZEMApGYqXM-hFIRPNjzMuH6a1SgE8KoHiH-amyJ5TBC-UdjYQRFBYGNNhrCNviCRhZ-bU60vZ_ASHgfCbRD8viOrQFjUErdD-WjUusz4fJQsmB7rZR6p7oDn_8JTORK8XUjjNQQhQdxTm3richirVTgMm0xS8lldvnbuyDqEWlUoGZg',
      },
      {
        name: 'Amazon Delivery',
        destination: 'Mailroom',
        status: 'Pre-Authorized',
        icon: 'local_shipping',
      },
    ],
  });

  await prisma.notice.createMany({
    data: [
      {
        title: 'Water Supply Maintenance',
        content: 'Water supply will be interrupted tomorrow from 10 AM to 2 PM.',
        type: 'ALERT',
        author: 'Secretary'
      }
    ]
  });

  await prisma.complaint.createMany({
    data: [
      {
        title: 'Leaking Pipe in Basement',
        status: 'OPEN',
        author: 'Unit 102'
      }
    ]
  });

  // Seed 1,245 dummy societies for the Super Admin dashboard
  const societies = [];
  for (let i = 1; i <= 1245; i++) {
    societies.push({
      name: `Society ${i}`,
      city: 'Metropolis',
      status: 'ACTIVE'
    });
  }
  await prisma.society.createMany({ data: societies });

  console.log('Database seeded with extended dummy data.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
