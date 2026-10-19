"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../ui/button";
import { Form } from "@/components/ui/form";
import { authFormSchema } from "@/lib/utils";
import CustomInput from "./CustomInput";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { signUp, signIn } from "@/lib/actions/user.action";
import ThemeToggle from "./ThemeToggle";

const AuthForm = ({ type }: AuthFormProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [accountCreatedWithSession, setAccountCreatedWithSession] =
    useState(false);

  const formSchema = authFormSchema(type);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError("");
    setMessage("");
    setAccountCreatedWithSession(false);

    try {
      if (type === "sign-up") {
        const result = await signUp({
          firstName: values.firstName ?? "",
          lastName: values.lastName ?? "",
          email: values.email,
          password: values.password,
        });

        if (result.requiresEmailConfirmation) {
          setMessage(
            `Account created. Check your email to confirm your address. ${
              result.accountEmail.sent
                ? "Your account account details were emailed."
                : `The account-details email was not sent: ${result.accountEmail.reason}`
            }`
          );
          return;
        }

        if (!result.accountEmail.sent) {
          setAccountCreatedWithSession(true);
          setMessage(
            `Account created, but the account account-details email was not sent: ${result.accountEmail.reason}`
          );
          return;
        }

        router.replace("/");
        router.refresh();
        return;
      }

      const user = await signIn({
        email: values.email,
        password: values.password,
      });
      router.replace(user.role === "admin" ? "/admin" : "/");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Authentication failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-form">
      <header className="flex flex-col gap-5 md:gap-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex cursor-pointer items-center gap-2">
            <Image src="/icons/logo.svg" alt="logo" width={40} height={40} />
            <h1 className="text-18 font-semibold leading-tight text-black-1">
              First Grade
              <span className="block text-10 font-medium tracking-[0.16em] text-gray-500">
                FINANCE
              </span>
            </h1>
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-col gap-1 md:gap-3">
          <h1 className="text-24 font-semibold text-gray-900 lg:text-36">
            {type === "sign-in" ? "Sign In" : "Create your account"}
          </h1>
          <p className="text-16 font-normal text-gray-600">
            {type === "sign-in"
              ? "Welcome back. Enter your credentials to continue."
              : "Create your First Grade Finance account."}
          </p>
        </div>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {type === "sign-up" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CustomInput
                control={form.control}
                name="firstName"
                label="First Name"
                placeholder="First name"
                autoComplete="given-name"
              />
              <CustomInput
                control={form.control}
                name="lastName"
                label="Last Name"
                placeholder="Last name"
                autoComplete="family-name"
              />
            </div>
          )}
          <CustomInput
            control={form.control}
            name="email"
            label="Email"
            placeholder="you@example.com"
            autoComplete="email"
          />
          <CustomInput
            control={form.control}
            name="password"
            label="Password"
            placeholder="At least 8 characters"
            autoComplete={
              type === "sign-in" ? "current-password" : "new-password"
            }
          />

          {type === "sign-up" && (
            <p className="text-12 text-gray-600">
              Keep your account information secure and never share your password.
            </p>
          )}
          {error && (
            <p className="text-14 text-red-600" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="text-14 text-success-700" role="status">
              {message}
            </p>
          )}
          {accountCreatedWithSession && (
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-bankGradient px-4 text-14 font-semibold text-white"
            >
              Continue to dashboard
            </Link>
          )}

          <Button
            type="submit"
            className="form-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" /> Please wait...
              </>
            ) : type === "sign-in" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </Form>

      <footer>
        <p className="text-14 font-normal text-gray-600">
          {type === "sign-in"
            ? "Don't have an account?"
            : "Already have an account?"}
        </p>
        <Link
          href={type === "sign-in" ? "/sign-up" : "/sign-in"}
          className="form-link"
        >
          {type === "sign-in" ? "Sign Up" : "Sign In"}
        </Link>
      </footer>
    </section>
  );
};

export default AuthForm;
