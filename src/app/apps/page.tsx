import { DashboardLayout } from '@/components/layout/DashboardLayout'
import Link from 'next/link'
import { BarChart3, Calendar } from 'lucide-react'

export default function AppsPage() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Apps</h1>
        <p className="text-gray-600 mb-8">
          Explore and manage your integrated applications.
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link 
            href="/apps/causemon"
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
          >
            <BarChart3 className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Causemon</h3>
            <p className="text-gray-600">
              Monitor causes and track public figure positions on important topics.
            </p>
          </Link>
          
          <Link 
            href="/apps/events"
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
          >
            <Calendar className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Event Manager</h3>
            <p className="text-gray-600">
              Plan and manage community events with AI assistance.
            </p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}