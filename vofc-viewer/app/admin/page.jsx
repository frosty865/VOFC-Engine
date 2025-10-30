import { createClient } from '@supabase/supabase-js'

export const revalidate = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function AdminOverviewPage() {
  const { data: stats } = await supabase
    .from('v_learning_overview')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(3)

  const { data: soft } = await supabase
    .from('v_recent_softmatches')
    .select('*')
    .limit(5)

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-2">Model Performance Summary</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {stats?.map((s) => (
            <div key={s.model_version} className="bg-white shadow p-4 rounded-xl">
              <div className="font-medium">{s.model_version}</div>
              <div className="text-sm text-gray-500">Last updated {new Date(s.updated_at).toLocaleString()}</div>
              <div className="mt-3 text-sm">
                <p>Accept rate: <strong>{(s.accept_rate * 100).toFixed(1)}%</strong></p>
                <p>Softmatch ratio: <strong>{(s.softmatch_ratio * 100).toFixed(1)}%</strong></p>
              </div>
            </div>
          )) || <p className="text-gray-500">No data available</p>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Recent Soft Matches</h2>
        <ul className="bg-white shadow rounded-xl divide-y">
          {soft?.map((r, i) => (
            <li key={i} className="p-3 text-sm">
              <div>{r.new_text}</div>
              <div className="text-gray-500 text-xs">
                sim {r.similarity?.toFixed(3)} • {r.source_doc}
              </div>
            </li>
          )) || <p className="p-3 text-gray-500">No soft matches yet</p>}
        </ul>
      </section>
    </div>
  )
}
