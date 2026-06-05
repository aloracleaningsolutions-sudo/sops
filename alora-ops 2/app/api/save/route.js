import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      console.error('Missing env vars:', { url: !!url, key: !!key })
      return Response.json({ error: 'Missing Supabase config' }, { status: 500 })
    }

    const supabase = createClient(url, key)
    const body = await request.json()

    const { error } = await supabase
      .from('alora_ops')
      .upsert({
        id: 'main',
        payload: body,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) {
      console.error('Supabase save error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Save error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
