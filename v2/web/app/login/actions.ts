"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") || "").trim(),
    password: String(formData.get("password") || ""),
  };
}

export async function login(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/login?error=Supabase%20non%20%C3%A8%20ancora%20collegato");
  }

  const supabase = await createClient();
  const { email, password } = readCredentials(formData);
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=Email%20o%20password%20non%20validi");
  }

  redirect("/");
}

export async function signup(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/login?error=Supabase%20non%20%C3%A8%20ancora%20collegato");
  }

  const supabase = await createClient();
  const { email, password } = readCredentials(formData);
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect("/login?error=Registrazione%20non%20riuscita");
  }

  redirect("/login?message=Controlla%20la%20tua%20email%20per%20confermare%20l%27account");
}
