const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'teste@testedev.com',
    password: 'o3tn7e5rVINUUKTQ!'
  });

  if (authError) {
    console.error('Login Error:', authError.message);
    return;
  }
  
  const user = authData.user;
  console.log('Logged in as:', user.email);

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Profile Error:', error);
  } else {
    console.log('Profile Success:', data);
  }
}

test();
