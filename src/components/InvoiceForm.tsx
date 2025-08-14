

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import {
  PlusCircle,
  Trash2,
  Loader2,
  Save,
} from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useInvoices } from "@/contexts/InvoiceContext";
import { createInvoiceAction, updateInvoiceAction } from "@/lib/actions";
import { Invoice } from "@/lib/types";
import { format } from "date-fns";
import React, { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const formSchema = z.object({
  clientName: z.string().min(1, "Client name is required."),
  address: z.string().min(1, "Address is required."),
  date: z.date({ required_error: "An invoice date is required." }),
  dueDate: z.date({ required_error: "A due date is required." }),
  notes: z.string().optional(),
  status: z.enum(["Unpaid", "Paid"]),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        description: z.string().min(1, "Description is required."),
        quantity: z.coerce.number().min(0.01, "Quantity must be > 0."),
        amount: z.coerce.number().min(0, "Amount must be >= 0."),
      })
    )
    .min(1, "At least one item is required."),
});

type InvoiceFormValues = z.infer<typeof formSchema>;

interface InvoiceFormProps {
  initialData?: Invoice;
}

export function InvoiceForm({ initialData }: InvoiceFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { addInvoice, updateInvoice, invoices } = useInvoices();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [lastSavedInvoice, setLastSavedInvoice] = React.useState<Invoice | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = React.useState(false);

  const isEditMode = !!initialData;

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
        ...initialData,
        date: new Date(initialData.date),
        dueDate: new Date(initialData.dueDate),
    } : {
      clientName: "",
      address: "",
      date: new Date(), 
      dueDate: new Date(),
      notes: "",
      status: "Unpaid",
      items: [{ description: "", quantity: 1, amount: 0 }],
    },
  });

  useEffect(() => {
    if (initialData) {
       form.reset({
        ...initialData,
        date: new Date(initialData.date),
        dueDate: new Date(initialData.dueDate),
      });
    }
  }, [initialData, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");
  
  const subTotal = watchItems.reduce(
    (acc, item) => acc + (item.quantity || 0) * (item.amount || 0),
    0
  );

  const onSubmit = async (data: InvoiceFormValues) => {
    setIsSubmitting(true);
    
    let result;
    if (isEditMode && initialData) {
        result = await updateInvoiceAction({ ...data, id: initialData.id, invoiceNumber: initialData.invoiceNumber });
    } else {
        const existingInvoiceNumbers = invoices.map((inv) => inv.invoiceNumber);
        result = await createInvoiceAction(data, existingInvoiceNumbers);
    }

    if (result.success && result.data) {
      if (isEditMode) {
        updateInvoice(result.data);
      } else {
        addInvoice(result.data);
      }
      setLastSavedInvoice(result.data);
      setIsSuccessDialogOpen(true);
      if (!isEditMode) {
        form.reset({
            clientName: "",
            address: "",
            notes: "",
            status: "Unpaid",
            items: [{ description: "", quantity: 1, amount: 0 }],
            date: new Date(),
            dueDate: new Date(),
        });
      }
    } else {
      toast({
        title: "Error",
        description:
          `Failed to ${isEditMode ? 'update' : 'create'} invoice. ` + (result.error || ""),
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };
  
  const handleDialogClose = () => {
    setIsSuccessDialogOpen(false);
    if(isEditMode) {
      router.push('/invoice');
    }
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 bg-white dark:bg-card p-8 rounded-lg shadow-lg">
          
          <div className="bg-gray-800 text-white p-6 rounded-t-lg -m-8 mb-0">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                      <Image src="https://storage.googleapis.com/stedi-dev-screenshots/adslab-logo.png" alt="Company Logo" width={50} height={50} className="w-12 h-12 rounded-full bg-white p-1"/>
                      <div>
                          <h2 className="text-2xl font-bold">ADS Digital Printing Services</h2>
                          <p className="text-sm text-gray-300">sales@adsdigitalprint.com</p>
                      </div>
                  </div>
                  <div className="text-right">
                      <p>123 Printing Press Lane</p>
                      <p>Imus, Cavite, 4103</p>
                      <p>Philippines</p>
                  </div>
              </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8 pt-8">
              <div>
                  <h3 className="font-semibold text-lg mb-2">Invoice Number</h3>
                  <p className="text-muted-foreground">{initialData?.invoiceNumber || "Will be generated"}</p>
                  <div className="mt-4">
                    <p className="text-sm"><span className="font-medium">Issued Date:</span> {format(form.getValues('date'), "dd MMM yyyy")}</p>
                    <p className="text-sm"><span className="font-medium">Due Date:</span> {format(form.getValues('dueDate'), "dd MMM yyyy")}</p>
                  </div>
              </div>
              <div className="text-right">
                   <h3 className="font-semibold text-lg mb-2">Billed to</h3>
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Client Name" {...field} className="text-right border-0 focus-visible:ring-0 p-0 h-auto text-base"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                            <FormItem className="mt-1">
                                <FormControl>
                                    <Textarea placeholder="Client Address" {...field} className="text-right border-0 focus-visible:ring-0 p-0 h-auto text-sm text-muted-foreground resize-none" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
              </div>
          </div>


          <div>
            <h3 className="text-lg font-semibold mb-1">Item Details</h3>
            <p className="text-sm text-muted-foreground mb-4">Details item with more info</p>
            <div className="flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <table className="min-w-full">
                      <thead className="text-muted-foreground uppercase text-sm">
                          <tr>
                              <th scope="col" className="py-3.5 pl-4 pr-3 text-left font-semibold sm:pl-0">Item</th>
                              <th scope="col" className="px-3 py-3.5 text-center font-semibold">Order/Type</th>
                              <th scope="col" className="px-3 py-3.5 text-center font-semibold">Rate</th>
                              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0 text-right font-semibold">Amount</th>
                              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0"></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {fields.map((field, index) => (
                              <tr key={field.id}>
                                  <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium sm:w-auto sm:max-w-none sm:pl-0">
                                      <FormField
                                          control={form.control}
                                          name={`items.${index}.description`}
                                          render={({ field }) => (
                                              <FormItem>
                                                  <FormControl>
                                                      <Input {...field} placeholder="Item description" className="border-0 focus-visible:ring-0 p-0"/>
                                                  </FormControl>
                                                  <FormMessage />
                                              </FormItem>
                                          )}
                                      />
                                  </td>
                                  <td className="px-3 py-4 text-center">
                                       <FormField
                                          control={form.control}
                                          name={`items.${index}.quantity`}
                                          render={({ field }) => (
                                              <FormItem>
                                                  <FormControl>
                                                      <Input type="number" {...field} className="w-20 text-center border-0 focus-visible:ring-0 p-0"/>
                                                  </FormControl>
                                                  <FormMessage />
                                              </FormItem>
                                          )}
                                      />
                                  </td>
                                  <td className="px-3 py-4 text-center">
                                      <FormField
                                          control={form.control}
                                          name={`items.${index}.amount`}
                                          render={({ field }) => (
                                              <FormItem>
                                                  <FormControl>
                                                      <Input type="number" {...field} className="w-24 text-center border-0 focus-visible:ring-0 p-0"/>
                                                  </FormControl>
                                                  <FormMessage />
                                              </FormItem>
                                          )}
                                      />
                                  </td>
                                  <td className="py-4 pl-3 pr-4 text-right text-sm sm:pr-0">
                                      {formatCurrency((watchItems[index]?.quantity || 0) * (watchItems[index]?.amount || 0))}
                                  </td>
                                   <td className="py-4 pl-3 pr-4 text-right text-sm sm:pr-0">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => remove(index)}
                                        disabled={fields.length <= 1}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                </div>
              </div>
            </div>
             <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-4 p-0 text-primary"
                onClick={() =>
                  append({
                    description: "",
                    quantity: 1,
                    amount: 0,
                  })
                }
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Item
              </Button>
          </div>
          
          <div className="mt-6 flex justify-end">
              <div className="w-full max-w-sm space-y-4">
                  <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(subTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                      <FormLabel className="text-muted-foreground">Discount</FormLabel>
                      <span className="font-medium text-primary cursor-pointer">Add</span>
                  </div>
                   <div className="flex justify-between">
                      <FormLabel className="text-muted-foreground">Tax</FormLabel>
                      <span className="font-medium text-primary cursor-pointer">Add</span>
                  </div>
                  <div className="flex justify-between border-t pt-4 mt-4 border-border font-bold text-lg">
                      <span className="">Total</span>
                      <span className="text-primary">{formatCurrency(subTotal)}</span>
                  </div>
              </div>
          </div>

          <div className="flex justify-end pt-8">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditMode ? 'Update Invoice' : 'Save Invoice'}
            </Button>
          </div>
        </form>
      </Form>
      <Dialog open={isSuccessDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Success!</DialogTitle>
                <DialogDescription>
                    The invoice has been {isEditMode ? 'updated' : 'created'} successfully.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end gap-2">
                <Button onClick={handleDialogClose}>
                    <Save className="mr-2 h-4 w-4"/>
                    Save
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
