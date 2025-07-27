
import { JobOrderForm } from "@/components/JobOrderForm";

export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-headline font-bold mb-6">New Invoice</h1>
      <JobOrderForm />
    </div>
  );
}
