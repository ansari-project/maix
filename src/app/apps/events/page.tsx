import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function EventManagerAppPage() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Event Manager</h1>
        <p className="text-gray-600 mb-8">
          Plan and manage community events with AI assistance.
        </p>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-500">
            Event Manager integration coming soon.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}