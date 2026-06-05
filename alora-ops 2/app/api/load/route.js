import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      console.error('Missing env vars:', { url: !!url, key: !!key })
      return Response.json({ error: 'Missing Supabase config', data: null }, { status: 500 })
    }

    const supabase = createClient(url, key)

    const { data, error } = await supabase
      .from('alora_ops')
      .select('*')
      .eq('id', 'main')
      .single()

    if (error && error.code === 'PGRST116') {
      return Response.json({ data: null })
    }
    if (error) {
      console.error('Supabase load error:', error)
      return Response.json({ error: error.message, data: null }, { status: 500 })
    }

    return Response.json({ data: data?.payload || null })
  } catch (err) {
    console.error('Load error:', err)
    return Response.json({ error: err.message, data: null }, { status: 500 })
  }
}
