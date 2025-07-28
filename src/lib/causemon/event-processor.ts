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

    for (const event of results.events) {
      try {
        // Create deduplication hash
        const deduplicationHash = this.createEventHash(
          event.title,
          event.eventDate,
          publicFigureId
        );

        // Check if event already exists
        const existing = await prisma.event.findUnique({
          where: { deduplicationHash }
        });

        if (existing) {
          console.log(`Event already exists: ${event.title} on ${event.eventDate}`);
          skipped++;
          continue;
        }

        // Parse event date
        const eventDate = new Date(event.eventDate);
        if (isNaN(eventDate.getTime())) {
          console.error(`Invalid date for event: ${event.eventDate}`);
          skipped++;
          continue;
        }

        // Determine event type from title
        const eventType = this.inferEventType(event.title);

        // Create event with articles
        await prisma.event.create({
          data: {
            publicFigureId,
            topicId,
            title: event.title,
            summary: event.summary,
            eventDate,
            eventType,
            deduplicationHash,
            articles: {
              create: event.sources.map(source => ({
                headline: source.headline,
                sourceUrl: source.url,
                sourcePublisher: source.publisher,
                publishedAt: eventDate, // Use event date as fallback
                sourceType: this.inferSourceType(source.publisher),
                contentHash: createHash('md5').update(source.url).digest('hex'),
                fullText: event.summary, // Store summary as fullText for now
                keyQuotes: event.quotes || [] // Store quotes in article
              }))
            }
          }
        });

        created++;
        console.log(`Created event: ${event.title}`);
      } catch (error) {
        console.error(`Failed to process event "${event.title}":`, error);
        skipped++;
      }
    }

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
    return createHash('md5').update(content).digest('hex');
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