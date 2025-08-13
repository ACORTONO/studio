

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
  Banknote,
  Building,
  Wallet,
  Landmark,
  FileText,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useJobOrders } from "@/contexts/JobOrderContext";
import { createJobOrderAction, updateJobOrderAction } from "@/lib/actions";
import { JobOrder, Payment } from "@/lib/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import React, { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const paymentSchema = z.object({
  id: z.string().optional(),
  date: z.date(),
  amount: z.coerce.number().min(0, "Amount must be non-negative."),
  notes: z.string().optional(),
  paymentMethod: z.enum(["Cash", "Cheque", "E-Wallet", "Bank Transfer"]).default("Cash"),
  bankName: z.string().optional(),
  chequeNumber: z.string().optional(),
  chequeDate: z.date().optional(),
  eWalletReference: z.string().optional(),
  bankTransferReference: z.string().optional(),
});


const formSchema = z.object({
  clientName: z.string().min(1, "Client name is required."),
  contactMethod: z.enum(['Contact No.', 'FB Messenger', 'Email']).default('Contact No.'),
  contactDetail: z.string().min(1, "Contact detail is required."),
  startDate: z.date({ required_error: "A start date is required." }),
  dueDate: z.date({ required_error: "A due date is required." }),
  notes: z.string().optional(),
  status: z.enum(["Pending", "Downpayment", "Completed", "Cancelled"]),
  discount: z.coerce.number().min(0, "Discount must be non-negative.").optional(),
  discountType: z.enum(['amount', 'percent']).default('amount'),
  payments: z.array(paymentSchema).optional(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        description: z.string().min(1, "Description is required."),
        quantity: z.coerce.number().min(0.01, "Quantity must be > 0."),
        amount: z.coerce.number().min(0, "Amount must be >= 0."),
        remarks: z.string().optional(),
        status: z.enum(['Unpaid', 'Paid', 'Downpayment']).default('Unpaid'),
      })
    )
    .min(1, "At least one item is required."),
});

type JobOrderFormValues = z.infer<typeof formSchema>;

interface JobOrderFormProps {
  initialData?: JobOrder;
}

export function JobOrderForm({ initialData }: JobOrderFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { addJobOrder, updateJobOrder, jobOrders, getJobOrderById } = useJobOrders();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [lastSavedOrder, setLastSavedOrder] = React.useState<JobOrder | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = React.useState(false);

  const isEditMode = !!initialData;

  const form = useForm<JobOrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
        ...initialData,
        startDate: new Date(initialData.startDate),
        dueDate: new Date(initialData.dueDate),
        payments: initialData.payments?.map(p => ({
          ...p,
          date: new Date(p.date),
          chequeDate: p.chequeDate ? new Date(p.chequeDate) : undefined,
        })) || [],
    } : {
      clientName: "",
      contactMethod: 'Contact No.',
      contactDetail: "",
      startDate: undefined,
      dueDate: undefined,
      notes: "",
      status: "Pending",
      discount: 0,
      discountType: 'amount',
      payments: [],
      items: [{ description: "", quantity: 1, amount: 0, remarks: "", status: "Unpaid" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const { fields: paymentFields, append: appendPayment, remove: removePayment } = useFieldArray({
      control: form.control,
      name: "payments",
  });

  const watchItems = form.watch("items");
  const watchDiscountValue = form.watch("discount") || 0;
  const watchPayments = form.watch("payments") || [];
  const watchStatus = form.watch('status');
  const discountType = form.watch('discountType');
  
  const paidAmount = watchPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const subTotal = watchItems.reduce(
    (acc, item) => acc + (item.quantity || 0) * (item.amount || 0),
    0
  );

  const calculatedDiscount = discountType === 'percent'
    ? subTotal * (watchDiscountValue / 100)
    : watchDiscountValue;

  const total = subTotal - calculatedDiscount;
  const balance = total - paidAmount;


  const handleStatusChange = useCallback((status: string) => {
    const currentItems = form.getValues('items');
    const newItems = currentItems.map(item => ({ ...item, status: 'Unpaid' as const }));

    if (status === 'Completed') {
        form.setValue('payments', [{
            date: new Date(),
            amount: total,
            notes: 'Full payment on completion.',
            paymentMethod: 'Cash'
        }]);
        form.setValue('items', currentItems.map(item => ({ ...item, status: 'Paid' as const })), { shouldDirty: true });
    } else if (status === 'Pending' || status === 'Cancelled') {
        form.setValue('payments', []);
        form.setValue('items', newItems, { shouldDirty: true });
    }
  }, [form, total]);

  useEffect(() => {
    if(watchStatus) {
        // handleStatusChange(watchStatus);
    }
  }, [watchStatus, handleStatusChange]);


  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        startDate: new Date(initialData.startDate),
        dueDate: new Date(initialData.dueDate),
        payments: initialData.payments?.map(p => ({
            ...p,
            date: new Date(p.date),
            chequeDate: p.chequeDate ? new Date(p.chequeDate) : undefined,
        })) || [],
      });
    } else {
       form.reset({
        ...form.getValues(),
        startDate: new Date(),
        dueDate: new Date(),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const onSubmit = async (data: JobOrderFormValues) => {
    setIsSubmitting(true);
    
    let result;
    if (isEditMode && initialData) {
        const existingOrder = getJobOrderById(initialData.id);
        result = await updateJobOrderAction({ ...data, id: initialData.id, jobOrderNumber: existingOrder?.jobOrderNumber || "" });
    } else {
        const existingJobOrderNumbers = jobOrders.map((jo) => jo.jobOrderNumber);
        result = await createJobOrderAction(data, existingJobOrderNumbers);
    }

    if (result.success && result.data) {
      if (isEditMode) {
        updateJobOrder(result.data);
      } else {
        addJobOrder(result.data);
      }
      setLastSavedOrder(result.data);
      setIsSuccessDialogOpen(true);
      if (!isEditMode) {
        form.reset({
            clientName: "",
            contactMethod: 'Contact No.',
            contactDetail: "",
            startDate: new Date(),
            dueDate: new Date(),
            notes: "",
            status: "Pending",
            discount: 0,
            discountType: 'amount',
            payments: [],
            items: [{ description: "", quantity: 1, amount: 0, remarks: "", status: "Unpaid" }],
        });
      }
    } else {
      toast({
        title: "Error",
        description:
          `Failed to ${isEditMode ? 'update' : 'create'} job order. ` + (result.error || ""),
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };
  
  const handlePrint = () => {
    if (lastSavedOrder) {
        window.open(`/print/${lastSavedOrder.id}`, '_blank');
    }
    handleDialogClose();
  }
  
  const handleDialogClose = () => {
    setIsSuccessDialogOpen(false);
    if(isEditMode) {
      router.push('/dashboard');
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
                Enter the client's details for the job order.
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
              <div className="grid grid-cols-3 gap-2">
                 <FormField
                    control={form.control}
                    name="contactMethod"
                    render={({ field }) => (
                      <FormItem className="col-span-1">
                        <FormLabel>Contact Thru</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Contact No.">Contact No.</SelectItem>
                              <SelectItem value="FB Messenger">FB Messenger</SelectItem>
                              <SelectItem value="Email">Email</SelectItem>
                            </SelectContent>
                          </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactDetail"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Contact Detail</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 09123456789 or FB name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job Order Details</CardTitle>
              <CardDescription>Set the dates for this job order.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-6">
               <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Downpayment">Downpayment</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
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
              <CardTitle>Job Items</CardTitle>
              <CardDescription>
                Add the items for this job order.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Description</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-1/5">Remarks</TableHead>
                    <TableHead className="w-1/5">Status</TableHead>
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
                                <Input {...field} placeholder="e.g., Repair" />
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
                        <FormField
                          control={form.control}
                          name={`items.${index}.remarks`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} placeholder="Optional notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.status`}
                          render={({ field }) => (
                            <FormItem>
                               <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                                  <SelectItem value="Paid">Paid</SelectItem>
                                  <SelectItem value="Downpayment">Downpayment</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                    remarks: "",
                    status: "Unpaid",
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
                                                  {discountType === 'amount' ? '₱' : '%'}
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
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Paid Amount</span>
                        <span className="font-medium">{formatCurrency(paidAmount)}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Balance</span>
                        <span className="font-medium">{formatCurrency(balance)}</span>
                    </div>

                    <div className="flex justify-between border-t pt-2 mt-2 border-border">
                        <span className="text-lg font-bold">Total</span>
                        <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
                    </div>
                </div>
            </CardFooter>
          </Card>
          
          <Card>
             <CardHeader>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>Record all payments for this job order.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Payment Method</TableHead>
                            <TableHead>Notes/Reference</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paymentFields.map((field, index) => {
                            const paymentMethod = form.watch(`payments.${index}.paymentMethod`);
                            return (
                                <TableRow key={field.id}>
                                    <TableCell>
                                        <FormField
                                            control={form.control}
                                            name={`payments.${index}.date`}
                                            render={({ field }) => (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                                        >
                                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <FormField control={form.control} name={`payments.${index}.amount`} render={({ field }) => ( <Input type="number" {...field} /> )}/>
                                    </TableCell>
                                    <TableCell>
                                        <FormField control={form.control} name={`payments.${index}.paymentMethod`} render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Cash">Cash</SelectItem>
                                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                                    <SelectItem value="E-Wallet">E-Wallet</SelectItem>
                                                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}/>
                                    </TableCell>
                                    <TableCell>
                                        {paymentMethod === 'Cheque' ? (
                                             <div className="grid grid-cols-2 gap-2">
                                                <FormField control={form.control} name={`payments.${index}.bankName`} render={({ field }) => (<Input placeholder="Bank Name" {...field} />)} />
                                                <FormField control={form.control} name={`payments.${index}.chequeNumber`} render={({ field }) => (<Input placeholder="Cheque No." {...field} />)} />
                                            </div>
                                        ) : paymentMethod === 'E-Wallet' ? (
                                             <FormField control={form.control} name={`payments.${index}.eWalletReference`} render={({ field }) => (<Input placeholder="e.g. GCash Ref No." {...field} />)} />
                                        ) : paymentMethod === 'Bank Transfer' ? (
                                            <FormField control={form.control} name={`payments.${index}.bankTransferReference`} render={({ field }) => (<Input placeholder="e.g. BDO Ref No." {...field} />)} />
                                        ) : (
                                            <FormField control={form.control} name={`payments.${index}.notes`} render={({ field }) => (<Input placeholder="Optional notes" {...field} />)} />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removePayment(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendPayment({ date: new Date(), amount: 0, paymentMethod: 'Cash' })}>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Add Payment
                </Button>
            </CardContent>
          </Card>
           <Card>
                <CardHeader>
                    <CardTitle>Additional Information</CardTitle>
                    <CardDescription>Add any extra notes or instructions for this job order.</CardDescription>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                    <Textarea rows={10} placeholder="e.g., Special delivery instructions." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditMode ? 'Update & Print Preview' : 'Save & Print Preview'}
            </Button>
          </div>
        </form>
      </Form>
      <Dialog open={isSuccessDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Success!</DialogTitle>
                <DialogDescription>
                    The job order has been {isEditMode ? 'updated' : 'created'} successfully.
                    Do you want to print it now?
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end gap-2">
                 <Button type="button" variant="secondary" onClick={handleDialogClose}>
                    No
                 </Button>
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4"/>
                    Yes, Print
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}



    