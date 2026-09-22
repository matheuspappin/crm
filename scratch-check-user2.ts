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
  const { data: users, error: err } = await supabase.auth.admin.listUsers()
  if (err) console.error(err)
  const user = users?.users.find(u => u.email === 'bruno.fer2017@outlook.com')
  console.log('User:', user)
}

check()
