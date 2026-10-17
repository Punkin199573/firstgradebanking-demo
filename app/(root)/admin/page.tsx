import AdminDashboard from "@/components/shared/AdminDashboard";
import { getAdminDashboardData } from "@/lib/actions/admin.action";
import { getLoggedInUser } from "@/lib/actions/user.action";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getLoggedInUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "admin") {
    return (
      <section className="flex h-full w-full items-center justify-center bg-gray-25 p-5 sm:p-8">
        <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-chart sm:p-8">
          <p className="text-12 font-semibold uppercase tracking-[0.16em] text-blue-700">
            Meridian Finance · Operations
          </p>
          <h1 className="mt-2 text-24 font-semibold text-gray-900">
            Admin access isn&apos;t enabled for this account
          </h1>
          <p className="mt-3 text-14 leading-6 text-gray-600">
            Admin access is granted by the Supabase project owner. Ask them to
            promote your account using the steps in the project&apos;s
            &quot;Enable the admin console&quot; setup guide, then sign out and
            sign back in.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-14 font-semibold text-white hover:bg-blue-800"
          >
            Return to dashboard
          </Link>
        </div>
      </section>
    );
  }

  const data = await getAdminDashboardData();
  return <AdminDashboard data={data} />;
}
