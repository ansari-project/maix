import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function TodosPage() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">My Todos</h1>
        <p className="text-gray-600 mb-6">
          Manage your tasks across all projects.
        </p>
        <div className="mt-8 p-8 bg-gray-100 rounded-lg text-center">
          <p className="text-gray-500">Todo management will be migrated to new layout in Phase 4</p>
          <p className="text-sm text-gray-400 mt-2">Currently available at /my-todos</p>
        </div>
      </div>
    </DashboardLayout>
  )
}