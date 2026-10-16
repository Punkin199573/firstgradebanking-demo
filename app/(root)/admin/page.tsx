import AdminDashboard from "@/components/shared/AdminDashboard";
import { getAdminDashboardData } from "@/lib/actions/admin.action";
import { getLoggedInUser } from "@/lib/actions/user.action";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getLoggedInUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "admin") redirect("/");

  const data = await getAdminDashboardData();
  return <AdminDashboard data={data} />;
}
