import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSearchService } from '@/lib/causemon/search-service';
import { getEventProcessor } from '@/lib/causemon/event-processor';
import { getEmailService } from '@/lib/causemon/email-service';

export async function GET(request: NextRequest) {
  // Simple auth check
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log('Starting daily Causemon cron job');

    // Get all active monitors
    const monitors = await prisma.monitor.findMany({
      where: { isActive: true },
      include: {
        user: true,
        publicFigure: true,
        topic: true
      }
    });

    console.log(`Found ${monitors.length} active monitors`);

    // Process each monitor
    const results = [];
    for (const monitor of monitors) {
      try {
        // Search for events
        const searchService = getSearchService();
        const searchResults = await searchService.searchForEvents(monitor);
        
        // Process and store events
        const eventProcessor = getEventProcessor();
        const processed = await eventProcessor.processSearchResults(
          searchResults,
          monitor.id,
          monitor.publicFigureId,
          monitor.topicId
        );

        results.push({
          userId: monitor.userId,
          monitor,
          created: processed.created
        });

        console.log(`Processed monitor ${monitor.id}: ${processed.created} new events`);
      } catch (error) {
        console.error(`Failed to process monitor ${monitor.id}:`, error);
      }
    }

    // Group results by user and send emails
    const userEvents = new Map<string, any[]>();
    
    for (const result of results) {
      if (result.created > 0) {
        if (!userEvents.has(result.userId)) {
          userEvents.set(result.userId, []);
        }
        userEvents.get(result.userId)!.push(result);
      }
    }

    // Send emails to users with new events
    const emailService = getEmailService();
    let emailsSent = 0;

    for (const [userId, userResults] of Array.from(userEvents.entries())) {
      try {
        // Get today's events for this user
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const events = await prisma.event.findMany({
          where: {
            createdAt: { gte: today },
            OR: userResults.map((r: any) => ({
              publicFigureId: r.monitor.publicFigureId,
              topicId: r.monitor.topicId
            }))
          },
          include: {
            publicFigure: true,
            topic: true,
            articles: true
          }
        });

        if (events.length > 0) {
          const user = userResults[0].monitor.user;
          await emailService.sendDailyDigest(user.email, user.name || '', events);
          
          // Update last sent timestamp
          await prisma.user.update({
            where: { id: userId },
            data: { lastDigestSentAt: new Date() }
          });

          emailsSent++;
          console.log(`Sent email to ${user.email} with ${events.length} events`);
        }
      } catch (error) {
        console.error(`Failed to send email to user ${userId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      monitorsProcessed: monitors.length,
      emailsSent
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}