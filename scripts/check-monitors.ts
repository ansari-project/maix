import { prisma } from '../src/lib/prisma';

async function checkMonitors() {
  try {
    const monitors = await prisma.monitor.findMany({
      include: {
        publicFigure: true,
        topic: true,
        user: true
      }
    });

    console.log('Current monitors:');
    monitors.forEach(monitor => {
      console.log(`\n- Monitor ID: ${monitor.id}`);
      console.log(`  User: ${monitor.user.email}`);
      console.log(`  Monitoring: ${monitor.publicFigure.name} on ${monitor.topic.name}`);
      console.log(`  Last searched: ${monitor.lastSearchedAt || 'Never'}`);
      console.log(`  Active: ${monitor.isActive}`);
    });

    // Check for events
    const events = await prisma.event.findMany({
      include: {
        publicFigure: true,
        topic: true,
        articles: true
      }
    });

    console.log(`\n\nTotal events in database: ${events.length}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMonitors();