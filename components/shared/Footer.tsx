import { useState } from "react";
import { signOut } from "@/lib/actions/user.action";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { MessageCircle } from "lucide-react";
import { requestSupportChat } from "@/lib/support-chat";

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
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-teal-700 transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        onClick={requestSupportChat}
        aria-label="Contact support"
        title="Contact support"
      >
        <MessageCircle aria-hidden="true" size={20} />
      </button>
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
