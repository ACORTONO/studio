import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-headline font-bold">Dashboard</h1>
      <DashboardClient />
    </div>
  );
}
