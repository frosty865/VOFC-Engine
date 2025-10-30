import { createClient } from '@supabase/supabase-js'

export const revalidate = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function ModelsPage() {
  const { data, error } = await supabase
    .from('v_learning_overview')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error)
    return <div className="text-red-600 p-4">Error loading model data: {error.message}</div>

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Model Learning Overview</h2>
      <div className="overflow-x-auto bg-white shadow rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-3 text-left">Model</th>
              <th className="p-3 text-right">Accept Rate</th>
              <th className="p-3 text-right">Edit Rate</th>
              <th className="p-3 text-right">Softmatches</th>
              <th className="p-3 text-right">Soft Ratio</th>
              <th className="p-3 text-right">Updated</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((s) => (
              <tr key={s.model_version} className="border-t">
                <td className="p-3 font-mono">{s.model_version}</td>
                <td className="p-3 text-right">{(s.accept_rate * 100).toFixed(1)}%</td>
                <td className="p-3 text-right">{(s.avg_edits * 100).toFixed(1)}%</td>
                <td className="p-3 text-right">{s.softmatch_count}</td>
                <td className="p-3 text-right">{(s.softmatch_ratio * 100).toFixed(1)}%</td>
                <td className="p-3 text-right text-gray-500">{new Date(s.updated_at).toLocaleDateString()}</td>
              </tr>
            )) || (
              <tr>
                <td className="p-3" colSpan="6">
                  <p className="text-gray-500">No model data available</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


