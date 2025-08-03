import { prisma } from '../src/lib/prisma';

async function clearEvents() {
  try {
    // Delete all articles first (due to foreign key constraint)
    const deletedArticles = await prisma.article.deleteMany({});
    console.log(`Deleted ${deletedArticles.count} articles`);

    // Then delete all events
    const deletedEvents = await prisma.event.deleteMany({});
    console.log(`Deleted ${deletedEvents.count} events`);

    console.log('All Causemon events cleared successfully');
  } catch (error) {
    console.error('Error clearing events:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearEvents();