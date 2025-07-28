import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCausemon() {
  console.log('🌱 Seeding Causemon data...');

  // Create public figures
  const publicFigures = await Promise.all([
    prisma.publicFigure.create({
      data: {
        name: 'Anthony Albanese',
        title: 'Prime Minister of Australia',
        aliases: ['Albo', 'PM Albanese', 'Anthony Norman Albanese'],
      },
    }),
    prisma.publicFigure.create({
      data: {
        name: 'Joe Biden',
        title: 'President of the United States',
        aliases: ['President Biden', 'Joseph R. Biden Jr.', 'Biden'],
      },
    }),
    prisma.publicFigure.create({
      data: {
        name: 'Rishi Sunak',
        title: 'Prime Minister of the United Kingdom',
        aliases: ['PM Sunak', 'Rishi Sunak MP'],
      },
    }),
    prisma.publicFigure.create({
      data: {
        name: 'Justin Trudeau',
        title: 'Prime Minister of Canada',
        aliases: ['PM Trudeau', 'Justin Pierre James Trudeau'],
      },
    }),
    prisma.publicFigure.create({
      data: {
        name: 'Emmanuel Macron',
        title: 'President of France',
        aliases: ['President Macron', 'Macron'],
      },
    }),
  ]);

  console.log(`✅ Created ${publicFigures.length} public figures`);

  // Create topics
  const topics = await Promise.all([
    prisma.topic.create({
      data: {
        name: 'Palestine',
        keywords: ['Gaza', 'West Bank', 'Palestinian', 'Israel', 'ceasefire', 'humanitarian'],
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Climate Change',
        keywords: ['climate', 'global warming', 'carbon', 'emissions', 'renewable', 'net zero'],
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Immigration',
        keywords: ['refugees', 'asylum', 'immigration', 'migrants', 'border', 'visa'],
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Economy',
        keywords: ['inflation', 'recession', 'unemployment', 'GDP', 'interest rates', 'cost of living'],
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Healthcare',
        keywords: ['NHS', 'Medicare', 'healthcare', 'hospitals', 'doctors', 'medical', 'health'],
      },
    }),
  ]);

  console.log(`✅ Created ${topics.length} topics`);
}

seedCausemon()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });