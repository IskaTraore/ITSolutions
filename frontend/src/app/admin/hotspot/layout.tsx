import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { apiServer } from "@/lib/server";

export const dynamic = "force-dynamic";

interface MeResponse {
  user: {
    username: string;
    email: string;
    role: string;
  } | null;
  wallet: { balance: number };
}

export default async function AdminHotspotLayout({ children }: { children: React.ReactNode }) {
  const me = await apiServer<MeResponse>("/auth/me");

  return (
    <DashboardLayout user={me?.user ?? null} balance={me?.wallet?.balance ?? 0}>
      {children}
    </DashboardLayout>
  );
}
