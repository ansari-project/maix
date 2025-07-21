import { PublicHeader } from "@/components/layout/PublicHeader"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <PublicHeader />
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </>
  )
}