import AuthForm from "@/components/shared/AuthForm";
import { getLoggedInUser } from "@/lib/actions/user.action";
import { redirect } from "next/navigation";
import React from "react";

const SignUp = async () => {
  if (await getLoggedInUser()) redirect("/");

  return (
    <section className="flex-center size-full max-sm:px-6">
      <AuthForm type="sign-up" />
    </section>
  );
};

export default SignUp;
