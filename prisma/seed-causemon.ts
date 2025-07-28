import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCausemon() {
  console.log('🌱 Seeding Causemon data...');

  // Create one public figure
  const publicFigure = await prisma.publicFigure.create({
    data: {
      name: 'Anthony Albanese',
      title: 'Prime Minister of Australia',
      aliases: ['Albo', 'PM Albanese', 'Anthony Norman Albanese'],
    },
  });

  console.log(`✅ Created public figure: ${publicFigure.name}`);

  // Create one topic
  const topic = await prisma.topic.create({
    data: {
      name: 'Palestine',
      keywords: ['Gaza', 'West Bank', 'Palestinian', 'Israel', 'ceasefire', 'humanitarian'],
    },
  });

  console.log(`✅ Created topic: ${topic.name}`);
}

seedCausemon()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });