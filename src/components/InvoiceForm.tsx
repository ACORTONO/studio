
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import {
  PlusCircle,
  Trash2,
  Loader2,
  Save,
  CalendarIcon,
  Printer,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Calendar } from "./ui/calendar";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { useCompanyProfile } from "@/contexts/CompanyProfileContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const formSchema = z.object({
  clientName: z.string().min(1, "Client name is required."),
  address: z.string().min(1, "Address is required."),
  tinNumber: z.string().optional(),
  date: z.date({ required_error: "An invoice date is required." }),
  dueDate: z.date({ required_error: "A due date is required." }),
  termsAndConditions: z.string().optional(),
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
  discount: z.coerce.number().min(0, "Discount must be non-negative.").optional().default(0),
  discountType: z.enum(['amount', 'percent']).default('amount'),
  tax: z.coerce.number().min(0, "Tax must be non-negative.").optional().default(0),
  taxType: z.enum(['amount', 'percent']).default('amount'),
});

type InvoiceFormValues = z.infer<typeof formSchema>;

interface InvoiceFormProps {
  initialData?: Invoice;
}

export function InvoiceForm({ initialData }: InvoiceFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { addInvoice, updateInvoice, invoices } = useInvoices();
  const { profile } = useCompanyProfile();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [lastSavedInvoice, setLastSavedInvoice] = React.useState<Invoice | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = React.useState(false);

  const isEditMode = !!initialData;

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
        ...initialData,
        termsAndConditions: initialData.termsAndConditions || '',
        tinNumber: initialData.tinNumber || '',
        date: new Date(initialData.date),
        dueDate: new Date(initialData.dueDate),
    } : {
      clientName: "",
      address: "",
      tinNumber: "",
      date: new Date(), 
      dueDate: new Date(),
      termsAndConditions: "",
      status: "Unpaid",
      items: [{ description: "", quantity: 1, amount: 0 }],
      discount: 0,
      discountType: 'amount',
      tax: 0,
      taxType: 'amount'
    },
  });

  useEffect(() => {
    if (initialData) {
       form.reset({
        ...initialData,
        termsAndConditions: initialData.termsAndConditions || '',
        tinNumber: initialData.tinNumber || '',
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
  const watchDiscountValue = form.watch("discount") || 0;
  const watchDiscountType = form.watch("discountType");
  const watchTaxValue = form.watch("tax") || 0;
  const watchTaxType = form.watch("taxType");
  
  const subTotal = watchItems.reduce(
    (acc, item) => acc + (item.quantity || 0) * (item.amount || 0),
    0
  );

  const calculatedDiscount = watchDiscountType === 'percent'
    ? subTotal * (watchDiscountValue / 100)
    : watchDiscountValue;

  const taxableAmount = subTotal - calculatedDiscount;
  
  const calculatedTax = watchTaxType === 'percent'
    ? taxableAmount * (watchTaxValue / 100)
    : watchTaxValue;
  
  const totalAmount = taxableAmount + calculatedTax;


  const onSubmit = async (data: InvoiceFormValues) => {
    setIsSubmitting(true);
    
    let result;
    if (isEditMode && initialData) {
        result = await updateInvoiceAction({ ...data, id: initialData.id, invoiceNumber: initialData.invoiceNumber, status: data.status, });
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
            tinNumber: "",
            termsAndConditions: "",
            status: "Unpaid",
            items: [{ description: "", quantity: 1, amount: 0 }],
            date: new Date(),
            dueDate: new Date(),
            discount: 0,
            discountType: 'amount',
            tax: 0,
            taxType: 'amount'
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
                      <Image src={profile.logoUrl || "https://placehold.co/50x50.png"} alt="Company Logo" width={50} height={50} className="w-12 h-12 rounded-full bg-white p-1"/>
                      <div>
                          <h2 className="text-2xl font-bold">{profile.name}</h2>
                          <p className="text-sm text-gray-300">{profile.email}</p>
                      </div>
                  </div>
                  <div className="text-right">
                      <p className="whitespace-pre-wrap">{profile.address}</p>
                  </div>
              </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8 pt-8">
              <div>
                  <h3 className="font-semibold text-lg mb-2">Invoice Number</h3>
                  <p className="text-muted-foreground">{initialData?.invoiceNumber || "Will be generated"}</p>
                  <div className="mt-4 space-y-2">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Invoice Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Due Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
              </div>
              <div className="text-left">
                   <h3 className="font-semibold text-lg mb-2">Billed to</h3>
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Client Name" {...field} />
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
                                    <Textarea placeholder="Client Address" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="tinNumber"
                        render={({ field }) => (
                            <FormItem className="mt-1">
                                <FormControl>
                                    <Input placeholder="TIN No." {...field} value={field.value || ''} />
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
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-collapse border border-slate-400">
                      <thead className="text-muted-foreground uppercase text-sm">
                          <tr>
                              <th scope="col" className="py-3.5 pl-4 pr-3 text-left font-semibold sm:pl-0 border border-slate-300">Description</th>
                              <th scope="col" className="px-3 py-3.5 text-center font-semibold border border-slate-300">Quantity</th>
                              <th scope="col" className="px-3 py-3.5 text-center font-semibold border border-slate-300">Unit Price</th>
                              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0 text-right font-semibold border border-slate-300">Amount</th>
                              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0 border border-slate-300"></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {fields.map((field, index) => (
                              <tr key={field.id}>
                                  <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium sm:w-auto sm:max-w-none sm:pl-0 border border-slate-300">
                                      <FormField
                                          control={form.control}
                                          name={`items.${index}.description`}
                                          render={({ field }) => (
                                              <FormItem>
                                                  <FormControl>
                                                      <Input {...field} placeholder="Item description" />
                                                  </FormControl>
                                                  <FormMessage />
                                              </FormItem>
                                          )}
                                      />
                                  </td>
                                  <td className="px-3 py-4 text-center border border-slate-300">
                                       <FormField
                                          control={form.control}
                                          name={`items.${index}.quantity`}
                                          render={({ field }) => (
                                              <FormItem>
                                                  <FormControl>
                                                      <Input type="number" {...field} className="w-20 text-center"/>
                                                  </FormControl>
                                                  <FormMessage />
                                              </FormItem>
                                          )}
                                      />
                                  </td>
                                  <td className="px-3 py-4 text-center border border-slate-300">
                                      <FormField
                                          control={form.control}
                                          name={`items.${index}.amount`}
                                          render={({ field }) => (
                                              <FormItem>
                                                  <FormControl>
                                                      <Input type="number" {...field} className="w-24 text-center"/>
                                                  </FormControl>
                                                  <FormMessage />
                                              </FormItem>
                                          )}
                                      />
                                  </td>
                                  <td className="py-4 pl-3 pr-4 text-right text-sm sm:pr-0 border border-slate-300">
                                      {formatCurrency((watchItems[index]?.quantity || 0) * (watchItems[index]?.amount || 0))}
                                  </td>
                                   <td className="py-4 pl-3 pr-4 text-right text-sm sm:pr-0 border border-slate-300">
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
          
          <div className="grid grid-cols-2 gap-8">
            <div>
               <FormField
                control={form.control}
                name="termsAndConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms & Conditions</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add any terms or conditions for the client" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Payment Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Unpaid">Unpaid</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <div className="mt-6 flex justify-end">
                <div className="w-full max-w-sm space-y-4">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">{formatCurrency(subTotal)}</span>
                    </div>
                     <FormField
                        control={form.control}
                        name="discount"
                        render={({ field }) => (
                           <FormItem>
                             <div className="flex justify-between items-center">
                                <FormLabel className="text-muted-foreground">Discount</FormLabel>
                                <div className="flex items-center gap-2">
                                   <FormField
                                      control={form.control}
                                      name="discountType"
                                      render={({ field: switchField }) => (
                                          <div className="flex items-center space-x-2">
                                              <Switch
                                                  id="discount-type"
                                                  checked={switchField.value === 'percent'}
                                                  onCheckedChange={(checked) => {
                                                      switchField.onChange(checked ? 'percent' : 'amount');
                                                  }}
                                              />
                                              <Label htmlFor="discount-type" className="text-xs">
                                                  {watchDiscountType === 'amount' ? '₱' : '%'}
                                              </Label>
                                          </div>
                                      )}
                                  />
                                  <FormControl>
                                      <Input type="number" className="w-24 h-8" placeholder="0.00" {...field} />
                                  </FormControl>
                                </div>
                            </div>
                             <FormMessage className="text-right" />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="tax"
                        render={({ field }) => (
                           <FormItem>
                             <div className="flex justify-between items-center">
                                <FormLabel className="text-muted-foreground">Tax</FormLabel>
                                <div className="flex items-center gap-2">
                                   <FormField
                                      control={form.control}
                                      name="taxType"
                                      render={({ field: switchField }) => (
                                          <div className="flex items-center space-x-2">
                                              <Switch
                                                  id="tax-type"
                                                  checked={switchField.value === 'percent'}
                                                  onCheckedChange={(checked) => {
                                                      switchField.onChange(checked ? 'percent' : 'amount');
                                                  }}
                                              />
                                              <Label htmlFor="tax-type" className="text-xs">
                                                  {watchTaxType === 'amount' ? '₱' : '%'}
                                              </Label>
                                          </div>
                                      )}
                                  />
                                  <FormControl>
                                      <Input type="number" className="w-24 h-8" placeholder="0.00" {...field} />
                                  </FormControl>
                                </div>
                            </div>
                             <FormMessage className="text-right" />
                            </FormItem>
                        )}
                    />

                    <div className="flex justify-between border-t pt-4 mt-4 border-border font-bold text-lg">
                        <span className="">Total</span>
                        <span className="text-primary">{formatCurrency(totalAmount)}</span>
                    </div>
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
                 <Button variant="outline" onClick={() => {
                    if (lastSavedInvoice) {
                        window.open(`/invoice/print/${lastSavedInvoice.id}`, '_blank');
                    }
                    handleDialogClose();
                }}>
                    <Printer className="mr-2 h-4 w-4"/>
                    Print
                </Button>
                <Button onClick={handleDialogClose}>
                    <Save className="mr-2 h-4 w-4"/>
                    Close
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
