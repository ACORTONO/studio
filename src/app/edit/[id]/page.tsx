
"use client";

import { JobOrderForm } from "@/components/JobOrderForm";
import { useJobOrders } from "@/contexts/JobOrderContext";
import { useParams } from 'next/navigation';
import { Skeleton } from "@/components/ui/skeleton";
import { useLayoutEffect, useState } from "react";
import { JobOrder } from "@/lib/types";

export default function EditJobOrderPage() {
    const { id } = useParams();
    const { getJobOrderById } = useJobOrders();
    const [jobOrder, setJobOrder] = useState<JobOrder | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    useLayoutEffect(() => {
        if (id) {
            const data = getJobOrderById(id as string);
            setJobOrder(data);
            setIsLoading(false);
        }
    }, [id, getJobOrderById]);

    if (isLoading) {
        return (
             <div className="space-y-8">
                <Skeleton className="h-10 w-1/4"/>
                <div className="space-y-6">
                    <Skeleton className="h-40 w-full"/>
                    <Skeleton className="h-24 w-full"/>
                    <Skeleton className="h-64 w-full"/>
                    <Skeleton className="h-32 w-full"/>
                </div>
            </div>
        )
    }

    if (!jobOrder) {
        return <div>Job order not found.</div>
    }

  return (
    <div>
      <h1 className="text-3xl font-headline font-bold mb-6">Edit Job Order</h1>
      <JobOrderForm initialData={jobOrder} />
    </div>
  );
}
