
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
import { JobOrder } from "@/lib/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Switch } from "./ui/switch";

const formSchema = z.object({
  clientName: z.string().min(1, "Client name is required."),
  contactNumber: z.string().min(1, "Contact number is required."),
  startDate: z.date({ required_error: "A start date is required." }),
  dueDate: z.date({ required_error: "A due date is required." }),
  notes: z.string().optional(),
  status: z.enum(["Pending", "In Progress", "Completed", "Cancelled"]),
  discount: z.coerce.number().min(0, "Discount must be non-negative.").optional(),
  discountType: z.enum(['amount', 'percent']).default('amount'),
  downpayment: z.coerce.number().min(0, "Downpayment must be non-negative.").optional(),
  paymentMethod: z.enum(["Cash", "Cheque", "E-Wallet", "Bank Transfer"]).default("Cash"),
  bankName: z.string().optional(),
  chequeNumber: z.string().optional(),
  chequeDate: z.date().optional(),
  eWalletReference: z.string().optional(),
  bankTransferReference: z.string().optional(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        description: z.string().min(1, "Description is required."),
        quantity: z.coerce.number().min(0.01, "Quantity must be > 0."),
        amount: z.coerce.number().min(0, "Amount must be >= 0."),
        remarks: z.string().optional(),
      })
    )
    .min(1, "At least one item is required."),
}).superRefine((data, ctx) => {
    if (data.paymentMethod === 'Cheque') {
        if (!data.bankName) {
            ctx.addIssue({ code: 'custom', message: 'Bank name is required for cheque payments.', path: ['bankName']});
        }
        if (!data.chequeNumber) {
            ctx.addIssue({ code: 'custom', message: 'Cheque number is required for cheque payments.', path: ['chequeNumber']});
        }
        if (!data.chequeDate) {
            ctx.addIssue({ code: 'custom', message: 'Cheque date is required for cheque payments.', path: ['chequeDate']});
        }
    }
    if (data.paymentMethod === 'E-Wallet' && !data.eWalletReference) {
        ctx.addIssue({ code: 'custom', message: 'E-Wallet reference is required.', path: ['eWalletReference']});
    }
    if (data.paymentMethod === 'Bank Transfer' && !data.bankTransferReference) {
        ctx.addIssue({ code: 'custom', message: 'Bank transfer reference is required.', path: ['bankTransferReference']});
    }
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
        chequeDate: initialData.chequeDate ? new Date(initialData.chequeDate) : undefined,
    } : {
      clientName: "",
      contactNumber: "",
      startDate: undefined, // Set to undefined initially to avoid hydration mismatch
      dueDate: undefined,
      notes: "",
      status: "Pending",
      discount: 0,
      discountType: 'amount',
      downpayment: 0,
      paymentMethod: "Cash",
      bankName: "",
      chequeNumber: "",
      eWalletReference: "",
      bankTransferReference: "",
      items: [{ description: "", quantity: 1, amount: 0, remarks: "" }],
    },
  });

  useEffect(() => {
    if (!isEditMode) {
      // Set the date only on the client side
      form.reset({
        ...form.getValues(),
        startDate: new Date(),
        dueDate: new Date(),
      });
    }
  }, [isEditMode, form]);

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        startDate: new Date(initialData.startDate),
        dueDate: new Date(initialData.dueDate),
        chequeDate: initialData.chequeDate ? new Date(initialData.chequeDate) : undefined,
      });
    }
  }, [initialData, form]);
  
  const paymentMethod = form.watch('paymentMethod');
  const discountType = form.watch('discountType');

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");
  const watchDiscountValue = form.watch("discount") || 0;
  const watchDownpayment = form.watch("downpayment") || 0;

  const subTotal = watchItems.reduce(
    (acc, item) => acc + (item.quantity || 0) * (item.amount || 0),
    0
  );

  const calculatedDiscount = discountType === 'percent'
    ? subTotal * (watchDiscountValue / 100)
    : watchDiscountValue;

  const amountDue = subTotal - calculatedDiscount - watchDownpayment;

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
        form.reset();
        // Reset again with new dates for the next form
         form.reset({
            ...form.getValues(),
            clientName: "",
            contactNumber: "",
            notes: "",
            discount: 0,
            discountType: 'amount',
            downpayment: 0,
            paymentMethod: "Cash",
            bankName: "",
            chequeNumber: "",
            eWalletReference: "",
            bankTransferReference: "",
            items: [{ description: "", quantity: 1, amount: 0, remarks: "" }],
            startDate: new Date(),
            dueDate: new Date(),
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
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact No.</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 09123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dates</CardTitle>
              <CardDescription>Select the start and due dates.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
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
                    <TableHead className="w-2/5">Description</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-1/5">Remarks</TableHead>
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
                                <Input {...field} placeholder="Optional" />
                              </FormControl>
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
                                    <FormControl>
                                        <Input type="number" className="w-24 h-8 text-right" placeholder="0.00" {...field} />
                                    </FormControl>
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
                                </div>
                            </div>
                             <FormMessage className="text-right" />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="downpayment"
                        render={({ field }) => (
                             <FormItem>
                               <div className="flex justify-between items-center">
                                <FormLabel className="text-muted-foreground">Downpayment</FormLabel>
                                <FormControl>
                                    <Input type="number" className="w-24 h-8 text-right" placeholder="0.00" {...field} />
                                </FormControl>
                               </div>
                               <FormMessage className="text-right" />
                            </FormItem>
                        )}
                    />

                    <div className="flex justify-between border-t pt-2 mt-2 border-border">
                        <span className="text-lg font-bold">Amount Due</span>
                        <span className="text-lg font-bold text-primary">{formatCurrency(amountDue)}</span>
                    </div>
                </div>
            </CardFooter>
          </Card>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Payment Details</CardTitle>
                    <CardDescription>Record payment information for this order.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Payment Method for Downpayment</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="grid grid-cols-2 gap-4"
                            >
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="Cash" />
                                </FormControl>
                                <FormLabel className="font-normal flex items-center gap-2"><Banknote/>Cash</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="Cheque" />
                                </FormControl>
                                <FormLabel className="font-normal flex items-center gap-2"><FileText/>Cheque</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="E-Wallet" />
                                </FormControl>
                                <FormLabel className="font-normal flex items-center gap-2"><Wallet/>E-Wallet</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="Bank Transfer" />
                                </FormControl>
                                <FormLabel className="font-normal flex items-center gap-2"><Landmark/>Bank Transfer</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {paymentMethod === 'Cheque' && (
                        <div className="space-y-4 border-l-2 border-primary pl-4">
                             <FormField
                                control={form.control}
                                name="bankName"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bank Name</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                            <Input placeholder="e.g., BDO Unibank" {...field} className="pl-10"/>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="chequeNumber"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cheque No.</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                             <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                             <Input placeholder="e.g., 123456789" {...field} className="pl-10"/>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="chequeDate"
                                render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Cheque Date</FormLabel>
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
                    )}
                     {paymentMethod === 'E-Wallet' && (
                        <div className="space-y-4 border-l-2 border-primary pl-4">
                             <FormField
                                control={form.control}
                                name="eWalletReference"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>E-Wallet Reference</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                            <Input placeholder="e.g., GCash Ref: 12345" {...field} className="pl-10"/>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    )}
                    {paymentMethod === 'Bank Transfer' && (
                        <div className="space-y-4 border-l-2 border-primary pl-4">
                             <FormField
                                control={form.control}
                                name="bankTransferReference"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bank Transfer Reference</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                            <Input placeholder="e.g., BDO Ref: 67890" {...field} className="pl-10"/>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    )}
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
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditMode ? 'Update' : 'Save'} Job Order
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
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-start">
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4"/>
                    Print Job Order
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
