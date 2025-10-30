import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function SoftmatchesPage() {
  const { data, error } = await supabase
    .from('v_recent_softmatches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error)
    return <div className="text-red-600 p-4">Error loading soft matches: {error.message}</div>

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Recent Soft Matches</h2>
      <div className="bg-white shadow rounded-xl overflow-y-auto max-h-[75vh]">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 sticky top-0">
            <tr>
              <th className="p-3 text-left">Text</th>
              <th className="p-3 text-right">Similarity</th>
              <th className="p-3 text-left">Source Doc</th>
              <th className="p-3 text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((r, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="p-3 max-w-md text-gray-800">{r.new_text}</td>
                <td className="p-3 text-right">{r.similarity?.toFixed(3)}</td>
                <td className="p-3">{r.source_doc}</td>
                <td className="p-3 text-right text-gray-500">
                  {new Date(r.created_at).toLocaleString()}
                </td>
              </tr>
            )) || (
              <tr>
                <td className="p-3" colSpan="4">
                  <p className="text-gray-500">No soft match data yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


