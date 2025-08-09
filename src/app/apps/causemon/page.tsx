import { DashboardLayout } from '@/components/layout/DashboardLayout'
import Link from 'next/link'

export default function CausemonAppPage() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Causemon</h1>
        <p className="text-gray-600 mb-8">
          Monitor causes and track public figure positions on important topics.
        </p>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-500 mb-4">
            Causemon app integration is already available.
          </p>
          <Link
            href="/causemon"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Open Causemon Dashboard
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}