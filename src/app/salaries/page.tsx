import { SalariesClient } from "@/components/SalariesClient";

export const dynamic = 'force-dynamic';

export default function SalariesPage() {
  return (
    <div className="space-y-8">
      <SalariesClient />
    </div>
  );
}
