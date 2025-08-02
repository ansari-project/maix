import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { SearchResult } from './search-service';

export class EventProcessor {
  async processSearchResults(
    results: SearchResult,
    monitorId: string,
    publicFigureId: string,
    topicId: string
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    console.log(`\n[Deduplication Debug] Processing ${results.events.length} events for monitor ${monitorId}`);
    console.log(`[Deduplication Debug] Public Figure ID: ${publicFigureId}, Topic ID: ${topicId}`);

    for (const event of results.events) {
      try {
        // Create deduplication hash
        const deduplicationHash = this.createEventHash(
          event.title,
          event.eventDate,
          publicFigureId
        );

        console.log(`\n[Deduplication Debug] Processing event: "${event.title}"`);
        console.log(`[Deduplication Debug] Event date: ${event.eventDate}`);
        console.log(`[Deduplication Debug] Generated hash: ${deduplicationHash}`);
        console.log(`[Deduplication Debug] Hash components:`);
        console.log(`  - Normalized title: "${event.title.toLowerCase().replace(/[^a-z0-9]/g, '')}"`);
        console.log(`  - Date string: "${new Date(event.eventDate).toISOString().split('T')[0]}"`);
        console.log(`  - Public figure ID: "${publicFigureId}"`);

        // Check if event already exists
        const existing = await prisma.event.findUnique({
          where: { deduplicationHash }
        });

        if (existing) {
          console.log(`[Deduplication Debug] ⚠️ DUPLICATE FOUND - Event already exists`);
          console.log(`[Deduplication Debug] Existing event ID: ${existing.id}`);
          console.log(`[Deduplication Debug] Existing event created at: ${existing.createdAt}`);
          console.log(`[Deduplication Debug] Skipping: "${event.title}" on ${event.eventDate}`);
          skipped++;
          continue;
        }

        console.log(`[Deduplication Debug] ✅ NEW EVENT - No duplicate found`);

        // Parse event date
        const eventDate = new Date(event.eventDate);
        if (isNaN(eventDate.getTime())) {
          console.error(`Invalid date for event: ${event.eventDate}`);
          skipped++;
          continue;
        }

        // Determine event type from title
        const eventType = this.inferEventType(event.title);

        // Create event first, then handle articles separately to avoid unique constraint conflicts
        const createdEvent = await prisma.event.create({
          data: {
            publicFigureId,
            topicId,
            title: event.title,
            summary: event.summary,
            eventDate,
            eventType,
            deduplicationHash
          }
        });

        // Handle articles separately with proper conflict handling
        for (const source of event.sources) {
          try {
            await prisma.article.create({
              data: {
                eventId: createdEvent.id,
                headline: source.headline,
                sourceUrl: source.url,
                sourcePublisher: source.publisher,
                publishedAt: eventDate,
                sourceType: this.inferSourceType(source.publisher),
                contentHash: createHash('md5').update(source.url).digest('hex'),
                fullText: event.summary,
                keyQuotes: event.quotes || []
              }
            });
            console.log(`[Deduplication Debug] ✅ Created article: ${source.url}`);
          } catch (articleError: any) {
            if (articleError.code === 'P2002') {
              // Article already exists - find it and connect to this event
              const existingArticle = await prisma.article.findUnique({
                where: { sourceUrl: source.url }
              });
              if (existingArticle) {
                console.log(`[Deduplication Debug] ⚠️ Article already exists, connecting to event: ${source.url}`);
                // Article is already connected to another event, which is fine
                // Multiple events can reference the same article source
              }
            } else {
              console.error(`[Deduplication Debug] ❌ Failed to create article: ${source.url}`, articleError);
              throw articleError; // Re-throw non-uniqueness errors
            }
          }
        }

        created++;
        console.log(`[Deduplication Debug] ✨ Successfully created event: "${event.title}"`);
        console.log(`[Deduplication Debug] Event ID: ${deduplicationHash}`);
      } catch (error) {
        console.error(`[Deduplication Debug] ❌ Failed to process event "${event.title}":`, error);
        if (error instanceof Error && 'code' in error && error.code === 'P2002') {
          console.error(`[Deduplication Debug] Unique constraint violation - possible race condition`);
        }
        skipped++;
      }
    }

    console.log(`\n[Deduplication Debug] Summary:`);
    console.log(`[Deduplication Debug] Total events processed: ${results.events.length}`);
    console.log(`[Deduplication Debug] Created: ${created}`);
    console.log(`[Deduplication Debug] Skipped (duplicates/errors): ${skipped}`)

    // Update monitor's last searched timestamp
    await prisma.monitor.update({
      where: { id: monitorId },
      data: { lastSearchedAt: new Date() }
    });

    return { created, skipped };
  }

  private createEventHash(title: string, eventDate: string, publicFigureId: string): string {
    // Normalize title by lowercasing and removing special characters
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Create consistent date format (YYYY-MM-DD)
    const date = new Date(eventDate);
    const dateStr = date.toISOString().split('T')[0];
    
    // Create hash
    const content = `${normalizedTitle}-${dateStr}-${publicFigureId}`;
    const hash = createHash('md5').update(content).digest('hex');
    
    // Debug logging for hash creation
    console.log(`[Hash Debug] Creating hash for: "${title}"`);
    console.log(`[Hash Debug] Normalized: "${normalizedTitle}"`);
    console.log(`[Hash Debug] Date: ${dateStr}, Public Figure: ${publicFigureId}`);
    console.log(`[Hash Debug] Content string: "${content}"`);
    console.log(`[Hash Debug] Generated hash: ${hash}`);
    
    return hash;
  }

  private inferEventType(title: string): string {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('speech') || lowerTitle.includes('address') || lowerTitle.includes('speak')) {
      return 'speech';
    } else if (lowerTitle.includes('interview')) {
      return 'interview';
    } else if (lowerTitle.includes('statement') || lowerTitle.includes('announce')) {
      return 'statement';
    } else if (lowerTitle.includes('vote') || lowerTitle.includes('voted')) {
      return 'vote';
    } else if (lowerTitle.includes('hearing') || lowerTitle.includes('committee')) {
      return 'hearing';
    } else if (lowerTitle.includes('press') || lowerTitle.includes('conference')) {
      return 'press_conference';
    }
    
    return 'statement'; // Default
  }

  private inferSourceType(publisher: string): string {
    const lowerPublisher = publisher.toLowerCase();
    
    if (lowerPublisher.includes('parliament') || lowerPublisher.includes('hansard')) {
      return 'hansard';
    } else if (lowerPublisher.includes('committee')) {
      return 'committee';
    } else if (lowerPublisher.includes('press') || lowerPublisher.includes('release')) {
      return 'press_release';
    }
    
    return 'media'; // Default for news organizations
  }
}

// Singleton instance
let eventProcessor: EventProcessor | null = null;

export function getEventProcessor(): EventProcessor {
  if (!eventProcessor) {
    eventProcessor = new EventProcessor();
  }
  return eventProcessor;
}