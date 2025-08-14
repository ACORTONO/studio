
"use client";

import { InvoiceForm } from "@/components/InvoiceForm";
import { useInvoices } from "@/contexts/InvoiceContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useLayoutEffect, useState, use } from "react";
import { Invoice } from "@/lib/types";

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { getInvoiceById } = useInvoices();
    const [invoice, setInvoice] = useState<Invoice | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    useLayoutEffect(() => {
        if (id) {
            const data = getInvoiceById(id as string);
            setInvoice(data);
            setIsLoading(false);
        }
    }, [id, getInvoiceById]);

    if (isLoading) {
        return (
             <div className="space-y-8">
                <Skeleton className="h-10 w-1/4"/>
                <div className="space-y-6">
                    <Skeleton className="h-40 w-full"/>
                    <Skeleton className="h-24 w-full"/>
                    <Skeleton className="h-64 w-full"/>
                </div>
            </div>
        )
    }

    if (!invoice) {
        return <div>Invoice not found.</div>
    }

  return (
    <div>
      <h1 className="text-3xl font-headline font-bold mb-6">Edit Invoice</h1>
      <InvoiceForm initialData={invoice} />
    </div>
  );
}
