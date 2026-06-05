import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()

    const { error } = await supabase
      .from('alora_ops')
      .upsert({
        id: 'main',
        payload: body,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) throw error

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
