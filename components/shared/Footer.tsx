import { useState } from "react";
import { signOut } from "@/lib/actions/user.action";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

const Footer = ({ user, type }: FooterProps) => {
  const router = useRouter();
  const [error, setError] = useState("");

  const handleLogOut = async () => {
    setError("");
    try {
      await signOut();
      router.push("/sign-in");
      router.refresh();
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "Could not sign out."
      );
    }
  };

  return (
    <footer className="footer">
      <div className={type === "mobile" ? "footer_name-mobile" : "footer_name"}>
        <p className="text-xl font-bold text-gray-700">{user?.firstName[0]}</p>
      </div>
      <div
        className={type === "mobile" ? "footer_email-mobile" : "footer_email"}
      >
        <h1 className="text-14 truncate  text-gray-700 font-semibold">
          {user?.name}
          <p className="text-14 truncate font-normal text-gray-600 ">
            {user?.email}
          </p>
        </h1>
      </div>
      <button
        type="button"
        className="footer_image"
        onClick={handleLogOut}
        aria-label="Sign out"
      >
        <Image src="/icons/logout.svg" fill alt="" />
      </button>
      {error && <p className="text-12 text-red-600" role="alert">{error}</p>}
    </footer>
  );
};

export default Footer;
