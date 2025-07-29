'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, TestTube, Mail, Pause, Play, Search } from 'lucide-react';

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

export default function CausemonPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [publicFigureName, setPublicFigureName] = useState('');
  const [topicName, setTopicName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [searching, setSearching] = useState<string | null>(null);

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

  const testMonitor = async (id: string) => {
    setTesting(id);
    try {
      const res = await fetch(`/api/causemon/monitors/${id}/test`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to test monitor');
      }

      const result = await res.json();
      alert(`Test Results: Found ${result.eventsFound} events. Check console for details.`);
      console.log('Test results:', result);
    } catch (error) {
      console.error('Error testing monitor:', error);
      alert('Failed to test monitor');
    } finally {
      setTesting(null);
    }
  };

  const searchMonitor = async (id: string) => {
    setSearching(id);
    try {
      const res = await fetch(`/api/causemon/monitors/${id}/search`, {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to search');
      }

      const result = await res.json();
      alert(`Search complete! Found ${result.eventsFound} events. Created ${result.eventsCreated} new events.`);
      console.log('Search results:', result);
    } catch (error: any) {
      console.error('Error searching:', error);
      alert(error.message || 'Failed to search');
    } finally {
      setSearching(null);
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
                      title="Search Now"
                    >
                      <Search />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => testMonitor(monitor.id)}
                      disabled={testing === monitor.id}
                      title="Test Monitor"
                    >
                      <TestTube />
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}