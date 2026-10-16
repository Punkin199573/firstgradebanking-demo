"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  sendTransactionalEmail,
  type EmailDeliveryResult,
} from "@/lib/email";

type SignUpInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

const hasSupabaseConfig = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY)
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

  let accountEmail: EmailDeliveryResult;
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    accountEmail = {
      sent: false,
      reason: "Email isn't configured. Set RESEND_API_KEY and EMAIL_FROM.",
    };
  } else {
    const accountClient =
      !data.session && process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createSupabaseAdminClient()
        : supabase;
    const { data: accounts, error: accountsError } = await accountClient
      .from("bank_accounts")
      .select("name, account_number, mask")
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: true });

    accountEmail = accountsError
      ? {
        sent: false,
        reason: `Account details could not be loaded for email: ${accountsError.message}`,
      }
      : !accounts?.length
        ? {
          sent: false,
          reason: "No account details were created, so no account email was sent.",
        }
        : await sendTransactionalEmail({
            to: data.user.email ?? email,
            subject: "Your First Grade Finance prototype account details",
            text: [
              "FIRST GRADE FINANCE · PROTOTYPE ACCOUNT DETAILS",
              "",
              `Welcome${firstName.trim() ? `, ${firstName.trim()}` : ""}.`,
              "",
              ...accounts.map(
                (account) =>
                  `${account.name}: synthetic account number ${account.account_number} (ending ${account.mask}).`
              ),
              "",
              "These are synthetic prototype details, not a real bank account. They cannot receive deposits or send payments. First Grade Finance is not a bank. Do not reply with passwords, verification codes, or sensitive financial information.",
            ].join("\n"),
          });
  }

  revalidatePath("/", "layout");
  return {
    requiresEmailConfirmation: !data.session,
    accountEmail,
  };
}

export async function signIn({ email, password }: signInProps) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Supabase did not return a signed-in user.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profileError) {
    throw new Error(`Could not load your account role: ${profileError.message}`);
  }

  revalidatePath("/", "layout");
  return { role: profile.role };
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
    .select("id, email, first_name, last_name, role")
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
    role: profile.role,
  };
}

export async function signOut() {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) throw new Error(`Could not sign out: ${error.message}`);

  revalidatePath("/", "layout");
  return true;
}
