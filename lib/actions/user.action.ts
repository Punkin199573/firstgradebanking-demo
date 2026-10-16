"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SignUpInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

const hasSupabaseConfig = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

export async function signUp({ firstName, lastName, email, password }: SignUpInput) {
  if (firstName.trim().length < 2 || lastName.trim().length < 2) {
    throw new Error("Enter your first and last name.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      },
    },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Supabase did not return a new user.");

  revalidatePath("/", "layout");
  return { requiresEmailConfirmation: !data.session };
}

export async function signIn({ email, password }: signInProps) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Supabase did not return a signed-in user.");

  revalidatePath("/", "layout");
  return data.user;
}

export async function getLoggedInUser(): Promise<User | null> {
  if (!hasSupabaseConfig()) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (error.name === "AuthSessionMissingError") return null;
    throw new Error(`Could not verify the current session: ${error.message}`);
  }
  if (!data.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("id", data.user.id)
    .single();

  if (profileError) {
    throw new Error(`Could not load your profile: ${profileError.message}`);
  }

  return {
    $id: profile.id,
    userId: profile.id,
    id: profile.id,
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    name: `${profile.first_name} ${profile.last_name}`.trim(),
  };
}

export async function signOut() {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) throw new Error(`Could not sign out: ${error.message}`);

  revalidatePath("/", "layout");
  return true;
}
