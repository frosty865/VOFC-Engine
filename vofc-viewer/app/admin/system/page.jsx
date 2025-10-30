export const dynamic = 'force-dynamic'

export default async function SystemStatusPage() {
  const res = await fetch('/api/dashboard/system', { cache: 'no-store' })
  const status = await res.json().catch(() => ({}))

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">System Health</h2>
      <div className="bg-white shadow p-4 rounded-xl text-sm">
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(status, null, 2)}
        </pre>
      </div>
    </div>
  )
}


