import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    // 1. Validate Admin (Owner) Permission
    const supabaseServer = await createServerClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: profileRaw } = await supabaseServer
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const profile = profileRaw as any;

    if (profile?.role !== 'owner') {
      return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
    }

    // 2. Extract Data
    const { email, name, role } = await req.json();

    if (!email || !name || !role) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    // 3. Init Supabase Admin Client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 4. Generate Random Password
    const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + "!";

    // 5. Create User in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role,
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Explicitly insert into public.users in case the auth trigger fails or is missing
    const { error: dbError } = await supabaseAdmin.from('users').upsert({
      id: authData.user.id,
      email: authData.user.email,
      name,
      role
    });

    if (dbError) {
      console.error("Error inserting into public.users:", dbError);
    }

    // 6. Return Success with the generated password
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        role,
      },
      generatedPassword
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro interno" }, { status: 500 });
  }
}
