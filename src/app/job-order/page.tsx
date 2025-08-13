
import { JobOrderForm } from "@/components/JobOrderForm";

export default function JobOrderPage() {
  return (
    <div className="dark">
      <h1 className="text-3xl font-headline font-bold mb-6">New Job Order</h1>
      <JobOrderForm />
    </div>
  );
}
