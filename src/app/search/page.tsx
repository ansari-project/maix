import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function SearchPage() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Search & Discovery</h1>
        <div className="max-w-2xl mx-auto mt-8">
          <input
            type="text"
            placeholder="Search projects, people, skills..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled
          />
          <div className="mt-8 p-8 bg-gray-100 rounded-lg text-center">
            <p className="text-gray-500">Search functionality will be implemented in Phase 4</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}