import { ReportsClient } from "@/components/ReportsClient";

export const dynamic = 'force-dynamic';

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-headline font-bold">Sales Reports</h1>
      <ReportsClient />
    </div>
  );
}
