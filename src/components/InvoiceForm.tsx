

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import {
  CalendarIcon,
  PlusCircle,
  Trash2,
  Loader2,
  Save,
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useInvoices } from "@/contexts/InvoiceContext";
import { createInvoiceAction, updateInvoiceAction } from "@/lib/actions";
import { Invoice } from "@/lib/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import React, { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const formSchema = z.object({
  clientName: z.string().min(1, "Client name is required."),
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
      date: new Date(), 
      dueDate: new Date(),
      notes: "",
      status: "Unpaid",
      items: [{ description: "", quantity: 1, amount: 0 }],
    },
  });

  useEffect(() => {
    if (!isEditMode) {
      form.reset({
        ...form.getValues(),
        date: new Date(),
        dueDate: new Date(),
      });
    }
  }, [isEditMode, form]);

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
        const id = initialData.id;
        result = await updateInvoiceAction({ ...data, id: id, invoiceNumber: initialData.invoiceNumber });
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
        form.reset();
         form.reset({
            ...form.getValues(),
            clientName: "",
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
              <CardDescription>
                Enter the client's details for the invoice.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>Set the dates for this invoice.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
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
                            {field.value && field.value instanceof Date && !isNaN(field.value.getTime()) ? (
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
                            {field.value && field.value instanceof Date && !isNaN(field.value.getTime()) ? (
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Items</CardTitle>
              <CardDescription>
                Add the items for this invoice.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-3/5">Description</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} placeholder="e.g., Website Design" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.amount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        {formatCurrency(
                          (watchItems[index]?.quantity || 0) *
                            (watchItems[index]?.amount || 0)
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={fields.length <= 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
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
            </CardContent>
            <CardFooter className="flex flex-col items-end space-y-4 bg-muted/50 p-6">
                <div className="w-full max-w-sm space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">{formatCurrency(subTotal)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2 border-border">
                        <span className="text-lg font-bold">Total</span>
                        <span className="text-lg font-bold text-primary">{formatCurrency(subTotal)}</span>
                    </div>
                </div>
            </CardFooter>
          </Card>
          
          <div className="flex justify-end">
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
