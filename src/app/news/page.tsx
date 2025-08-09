import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function NewsPage() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">News & Updates</h1>
        <p className="text-gray-600">
          Stay informed about the latest developments in the Maix community.
        </p>
        <div className="mt-8 p-8 bg-gray-100 rounded-lg text-center">
          <p className="text-gray-500">News page will be implemented in Phase 5</p>
        </div>
      </div>
    </DashboardLayout>
  )
}