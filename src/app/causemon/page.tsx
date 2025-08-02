'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Mail, Pause, Play, Search, Loader2, FileText } from 'lucide-react';

interface PublicFigure {
  id: string;
  name: string;
  title?: string;
  imageUrl?: string;
}

interface Topic {
  id: string;
  name: string;
}

interface Monitor {
  id: string;
  publicFigure: PublicFigure;
  topic: Topic;
  isActive: boolean;
  emailFrequency: string;
  createdAt: string;
}

// Circular progress component
const CircularProgress = ({ progress, size = 16 }: { progress: number; size?: number }) => {
  const radius = (size - 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-muted-foreground/20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="text-primary transition-all duration-1000 ease-linear"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Search className="h-2.5 w-2.5" />
      </div>
    </div>
  );
};

export default function CausemonPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [publicFigureName, setPublicFigureName] = useState('');
  const [topicName, setTopicName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searching, setSearching] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<{[key: string]: any}>({});
  const [searchProgress, setSearchProgress] = useState<{[key: string]: number}>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      const monitorsRes = await fetch('/api/causemon/monitors');

      if (!monitorsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const monitorsData = await monitorsRes.json();
      setMonitors(monitorsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createMonitor = async () => {
    if (!publicFigureName.trim() || !topicName.trim()) {
      alert('Please enter both a public figure and a topic');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/causemon/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicFigureName: publicFigureName.trim(),
          topicName: topicName.trim(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create monitor');
      }

      const newMonitor = await res.json();
      setMonitors([...monitors, newMonitor]);
      setPublicFigureName('');
      setTopicName('');
      console.log('Monitor created successfully');
    } catch (error: any) {
      console.error('Error creating monitor:', error);
      alert(error.message || 'Failed to create monitor');
    } finally {
      setCreating(false);
    }
  };

  const deleteMonitor = async (id: string) => {
    try {
      const res = await fetch(`/api/causemon/monitors/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete monitor');
      }

      // Refresh monitors from server to ensure UI is in sync
      await fetchData();
      console.log('Monitor deleted successfully');
    } catch (error) {
      console.error('Error deleting monitor:', error);
      alert('Failed to delete monitor');
    }
  };

  const toggleMonitor = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/causemon/monitors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!res.ok) {
        throw new Error('Failed to update monitor');
      }

      const updatedMonitor = await res.json();
      setMonitors(monitors.map((m) => (m.id === id ? updatedMonitor : m)));
      console.log(`Monitor ${!isActive ? 'activated' : 'paused'}`);
    } catch (error) {
      console.error('Error updating monitor:', error);
      alert('Failed to update monitor');
    }
  };


  const searchMonitor = async (id: string) => {
    setSearching(id);
    setSearchResults(prev => ({ ...prev, [id]: null })); // Clear previous results
    setSearchProgress(prev => ({ ...prev, [id]: 0 })); // Start progress at 0

    // Start progress animation (60 second estimate)
    const progressInterval = setInterval(() => {
      setSearchProgress(prev => {
        const currentProgress = prev[id] || 0;
        if (currentProgress >= 100) {
          clearInterval(progressInterval);
          return prev;
        }
        return { ...prev, [id]: currentProgress + (100 / 60) }; // Increment by ~1.67% per second
      });
    }, 1000);
    
    try {
      const res = await fetch(`/api/causemon/monitors/${id}/search`, {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to search');
      }

      const result = await res.json();
      setSearchResults(prev => ({ ...prev, [id]: result }));
      console.log('Search results:', result);
    } catch (error: any) {
      console.error('Error searching:', error);
      setSearchResults(prev => ({ 
        ...prev, 
        [id]: { 
          error: error.message || 'Failed to search',
          success: false 
        } 
      }));
    } finally {
      clearInterval(progressInterval);
      setSearching(null);
      setSearchProgress(prev => ({ ...prev, [id]: 100 })); // Complete progress
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Causemon</h1>
            <p className="text-muted-foreground">
              Track what public figures say about causes you care about
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/causemon/events')}
          >
            View Events
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Create New Monitor</CardTitle>
          <CardDescription>
            Enter any public figure and topic to start receiving daily updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Public Figure
            </label>
            <Input
              value={publicFigureName}
              onChange={(e) => setPublicFigureName(e.target.value)}
              placeholder="e.g., Anthony Albanese"
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Topic</label>
            <Input
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              placeholder="e.g., Palestine"
              className="w-full"
            />
          </div>

          <Button
            onClick={createMonitor}
            disabled={creating || !publicFigureName.trim() || !topicName.trim()}
            className="w-full"
          >
            {creating ? 'Creating...' : 'Create Monitor'}
          </Button>
        </CardContent>
      </Card>

      {monitors.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">
              No monitors yet. Create your first monitor above!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {monitors.map((monitor) => (
            <Card key={monitor.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">
                      {monitor.publicFigure.name} on {monitor.topic.name}
                    </CardTitle>
                    {monitor.publicFigure.title && (
                      <CardDescription>
                        {monitor.publicFigure.title}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => router.push(`/causemon/events?monitorId=${monitor.id}`)}
                      title="View Events"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleMonitor(monitor.id, monitor.isActive)}
                      title={monitor.isActive ? 'Pause' : 'Activate'}
                    >
                      {monitor.isActive ? <Pause /> : <Play />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => searchMonitor(monitor.id)}
                      disabled={searching === monitor.id || !monitor.isActive}
                      title={searching === monitor.id ? 
                        `Searching... ${Math.round(searchProgress[monitor.id] || 0)}%` : 
                        "Search Now"}
                    >
                      {searching === monitor.id ? (
                        <CircularProgress progress={searchProgress[monitor.id] || 0} size={16} />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" title="Delete">
                          <Trash2 />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Monitor?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. You will stop receiving
                            updates about {monitor.publicFigure.name} on{' '}
                            {monitor.topic.name}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMonitor(monitor.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Mail className="h-4 w-4" />
                  <span>
                    {monitor.emailFrequency === 'daily'
                      ? 'Daily emails'
                      : 'Weekly emails'}
                  </span>
                  <span>•</span>
                  <span>
                    Status: {monitor.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>

                {/* Search Progress Display */}
                {searching === monitor.id && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <CircularProgress progress={searchProgress[monitor.id] || 0} size={20} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Searching for events...
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300">
                          Progress: {Math.round(searchProgress[monitor.id] || 0)}% 
                          {searchProgress[monitor.id] && searchProgress[monitor.id] > 0 && (
                            <span> • Estimated time remaining: {Math.max(0, Math.round(60 - (searchProgress[monitor.id] * 0.6)))}s</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Search Results Display */}
                {searchResults[monitor.id] && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    {searchResults[monitor.id].error ? (
                      <div className="text-sm text-destructive">
                        <strong>Search failed:</strong> {searchResults[monitor.id].error}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-sm">
                          <strong>Search completed!</strong> Found {searchResults[monitor.id].eventsFound} events in{' '}
                          {searchResults[monitor.id].timing ? 
                            `${(searchResults[monitor.id].timing.totalDuration / 1000).toFixed(1)}s` : 
                            'unknown time'}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>• Created {searchResults[monitor.id].eventsCreated} new events</div>
                          <div>• Skipped {searchResults[monitor.id].eventsSkipped} duplicates</div>
                          {searchResults[monitor.id].timing && (
                            <div>
                              • Timing: Search {(searchResults[monitor.id].timing.searchDuration / 1000).toFixed(1)}s, 
                              Processing {(searchResults[monitor.id].timing.processingDuration / 1000).toFixed(1)}s
                            </div>
                          )}
                        </div>

                        {/* Display all found events */}
                        {searchResults[monitor.id].allEvents && searchResults[monitor.id].allEvents.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <h4 className="text-sm font-semibold">All Events Found:</h4>
                            <div className="space-y-2">
                              {searchResults[monitor.id].allEvents.map((eventItem: any, index: number) => (
                                <div key={index} className="text-xs p-3 bg-background border rounded-lg space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{eventItem.event.title}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      eventItem.status === 'NEW' 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                    }`}>
                                      {eventItem.status}
                                    </span>
                                  </div>
                                  <div className="text-muted-foreground">
                                    {eventItem.event.eventDate} • {eventItem.event.summary}
                                  </div>
                                  {eventItem.event.quotes && eventItem.event.quotes.length > 0 && (
                                    <div className="text-muted-foreground italic">
                                      &ldquo;{eventItem.event.quotes[0]}&rdquo;
                                    </div>
                                  )}
                                  {eventItem.event.sources && eventItem.event.sources.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      Source: {eventItem.event.sources[0].publisher}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {searchResults[monitor.id].eventsCreated > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/causemon/events')}
                            className="mt-2"
                          >
                            View New Events
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}