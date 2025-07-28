'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Calendar, Quote, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  summary: string;
  eventDate: string;
  eventType: string;
  publicFigure: {
    id: string;
    name: string;
    title?: string;
  };
  topic: {
    id: string;
    name: string;
  };
  articles: Array<{
    id: string;
    headline: string;
    sourceUrl: string;
    sourcePublisher: string;
    publishedAt: string;
    keyQuotes?: any;
  }>;
}

export default function EventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchEvents();
    }
  }, [status, router, days]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEvents = async () => {
    try {
      const res = await fetch(`/api/causemon/events?days=${days}`);
      if (!res.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await res.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">Loading events...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Causemon Events</h1>
          <p className="text-muted-foreground">
            Recent statements and speeches tracked by your monitors
          </p>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No events found. Create monitors and run searches to see results here.
            </p>
            <Button 
              className="mt-4"
              onClick={() => router.push('/causemon')}
            >
              Manage Monitors
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const date = format(new Date(event.eventDate), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Causemon Events</h1>
        <p className="text-muted-foreground">
          Recent statements and speeches tracked by your monitors
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            variant={days === 7 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDays(7)}
          >
            Last 7 days
          </Button>
          <Button
            variant={days === 30 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDays(30)}
          >
            Last 30 days
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(eventsByDate)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, dateEvents]) => (
            <div key={date}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(date), 'EEEE, MMMM d, yyyy')}
              </h2>
              <div className="space-y-4">
                {dateEvents.map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {event.title}
                      </CardTitle>
                      <CardDescription>
                        {event.publicFigure.name} on {event.topic.name}
                        {event.publicFigure.title && (
                          <span className="text-xs"> • {event.publicFigure.title}</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm">{event.summary}</p>
                      
                      {(() => {
                        const allQuotes = event.articles
                          .filter(article => article.keyQuotes && Array.isArray(article.keyQuotes))
                          .flatMap(article => article.keyQuotes);
                        
                        if (allQuotes.length === 0) return null;
                        
                        return (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <Quote className="h-3 w-3" />
                              Key Quotes
                            </h4>
                            {allQuotes.map((quote, i) => (
                              <blockquote key={i} className="border-l-2 pl-4 italic text-sm text-muted-foreground">
                                &quot;{quote}&quot;
                              </blockquote>
                            ))}
                          </div>
                        );
                      })()}

                      <Separator />

                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <FileText className="h-3 w-3" />
                          Sources ({event.articles.length})
                        </h4>
                        {event.articles.map((article) => (
                          <div key={article.id} className="text-sm">
                            <a
                              href={article.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {article.headline}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <p className="text-xs text-muted-foreground">
                              {article.sourcePublisher} • {format(new Date(article.publishedAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}