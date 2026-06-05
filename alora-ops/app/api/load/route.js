import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('alora_ops')
      .select('*')
      .eq('id', 'main')
      .single()

    if (error && error.code === 'PGRST116') {
      // Row doesn't exist yet — return empty
      return Response.json({ data: null })
    }
    if (error) throw error

    return Response.json({ data: data?.payload || null })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
