const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.createMany({
    data: [
      { name: 'John Doe', role: 'Resident' },
      { name: 'Jane Smith', role: 'Resident' },
      { name: 'Officer Jenkins', role: 'Guard' },
      { name: 'Sarah Connor', role: 'Secretary' }
    ]
  });
  console.log('Added dummy users');
}

main().catch(console.error).finally(() => prisma.$disconnect());
