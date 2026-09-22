import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const envStr = fs.readFileSync('.env.local', 'utf8')
const env: Record<string, string> = {}
for (const line of envStr.split('\n')) {
  const [k, ...v] = line.split('=')
  if (k && v.length) env[k.trim()] = v.join('=').trim()
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL!,
  env.SUPABASE_SERVICE_ROLE_KEY!
)

async function check() {
  const { error } = await supabase.from('users').upsert({
    id: 'ea5392f1-5f8c-4002-a4f0-c76c5fc76da9',
    email: 'bruno.fer2017@outlook.com',
    name: 'bruno frança',
    role: 'vendas'
  });
  console.log('Upsert Error:', error)
}

check()
