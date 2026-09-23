import React from "react";
import { UserManagementClient } from "./UserManagementClient";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export default async function ExecutivoUsuariosPage() {
  const supabase = await createServerClient();
  const { data: users } = await supabase.from('users').select('*').order('created_at', { ascending: false });

  return <UserManagementClient initialUsers={users || []} />;
}
