const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const societies = await prisma.society.findMany();
  if (societies.length === 0) {
    console.log("No societies found.");
    return;
  }

  for (const society of societies) {
    const existing = await prisma.facility.findMany({ where: { societyId: society.id } });
    if (existing.length === 0) {
      await prisma.facility.createMany({
        data: [
          {
            name: 'Swimming Pool',
            description: 'Olympic size pool with temperature control',
            rate: 15.0,
            validity: 'Daily',
            icon: 'pool',
            societyId: society.id
          },
          {
            name: 'Gymnasium',
            description: 'Fully equipped fitness center',
            rate: 30.0,
            validity: 'Monthly',
            icon: 'fitness_center',
            societyId: society.id
          },
          {
            name: 'Clubhouse',
            description: 'Event space and community hall',
            rate: 100.0,
            validity: 'Daily',
            icon: 'deck',
            societyId: society.id
          }
        ]
      });
      console.log(`Added facilities to society: ${society.name}`);
    } else {
      console.log(`Society ${society.name} already has facilities.`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
