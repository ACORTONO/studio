

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useJobOrders } from "@/contexts/JobOrderContext";
import { createJobOrderAction, updateJobOrderAction } from "@/lib/actions";
import { JobOrder } from "@/lib/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import React, { useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";


const formSchema = z.object({
  clientName: z.string().min(1, "Client name is required."),
  contactMethod: z.enum(['Contact No.', 'FB Messenger', 'Email']).default('Contact No.'),
  contactDetail: z.string().min(1, "Contact detail is required."),
  startDate: z.date({ required_error: "A start date is required." }),
  dueDate: z.date({ required_error: "A due date is required." }),
  notes: z.string().optional(),
  paidAmount: z.coerce.number().min(0).optional().default(0),
  discount: z.coerce.number().min(0, "Discount must be non-negative.").optional().default(0),
  discountType: z.enum(['amount', 'percent']).default('amount'),
  paymentMethod: z.enum(['Cash', 'E-Wallet (GCASH, MAYA)', 'Cheque', 'Bank Transfer']).default('Cash'),
  paymentReference: z.string().optional(),
  chequeBankName: z.string().optional(),
  chequeNumber: z.string().optional(),
  chequeDate: z.date().optional(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        description: z.string().min(1, "Description is required."),
        quantity: z.coerce.number().min(0.01, "Quantity must be > 0."),
        amount: z.coerce.number().min(0, "Amount must be >= 0."),
        status: z.enum(['Unpaid', 'Paid', 'Downpayment', 'Cheque']).default('Unpaid'),
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
        notes: initialData.notes || "",
        paymentReference: initialData.paymentReference || "",
        chequeBankName: initialData.chequeBankName || "",
        chequeNumber: initialData.chequeNumber || "",
        startDate: new Date(initialData.startDate),
        dueDate: new Date(initialData.dueDate),
        chequeDate: initialData.chequeDate ? new Date(initialData.chequeDate) : undefined,
    } : {
      clientName: "",
      contactMethod: 'Contact No.',
      contactDetail: "",
      notes: "",
      paidAmount: 0,
      discount: 0,
      discountType: 'amount',
      paymentMethod: 'Cash',
      paymentReference: "",
      chequeBankName: "",
      chequeNumber: "",
      chequeDate: undefined,
      items: [{ description: "", quantity: 1, amount: 0, status: "Unpaid" }],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");
  const watchDiscountValue = form.watch("discount") || 0;
  const watchPaidAmount = form.watch("paidAmount") || 0;
  const discountType = form.watch('discountType');
  const paymentMethod = form.watch('paymentMethod');
  
  const subTotal = watchItems.reduce(
    (acc, item) => acc + (item.quantity || 0) * (item.amount || 0),
    0
  );

  const calculatedDiscount = discountType === 'percent'
    ? subTotal * (watchDiscountValue / 100)
    : watchDiscountValue;
  
  const totalAmountWithDiscount = subTotal - calculatedDiscount;
  const totalAmount = totalAmountWithDiscount - watchPaidAmount;
  
   useEffect(() => {
    const allPaid = watchItems.every(item => item.status === 'Paid');
    const calculatedSubtotal = watchItems.reduce((acc, item) => acc + (item.quantity || 0) * (item.amount || 0), 0);
    const calculatedDiscount = form.getValues('discountType') === 'percent'
        ? calculatedSubtotal * ((form.getValues('discount') || 0) / 100)
        : (form.getValues('discount') || 0);

    if (allPaid) {
      form.setValue('paidAmount', calculatedSubtotal - calculatedDiscount);
    }
  }, [watchItems, form]);


  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        notes: initialData.notes || "",
        paymentReference: initialData.paymentReference || "",
        chequeBankName: initialData.chequeBankName || "",
        chequeNumber: initialData.chequeNumber || "",
        startDate: new Date(initialData.startDate),
        dueDate: new Date(initialData.dueDate),
        chequeDate: initialData.chequeDate ? new Date(initialData.chequeDate) : undefined
      });
    }
  }, [initialData, form]);

  useEffect(() => {
    if (!isEditMode) {
      const now = new Date();
      form.reset({
        ...form.getValues(),
        startDate: now,
        dueDate: now,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  const onSubmit = async (data: JobOrderFormValues) => {
    setIsSubmitting(true);
    
    let result;
    if (isEditMode && initialData) {
        result = await updateJobOrderAction({ ...data, id: initialData.id, jobOrderNumber: initialData.jobOrderNumber });
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
            paidAmount: 0,
            discount: 0,
            discountType: 'amount',
            paymentMethod: 'Cash',
            items: [{ description: "", quantity: 1, amount: 0, status: "Unpaid" }],
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
              <CardTitle>Job Receive and Deadlines</CardTitle>
              <CardDescription>Set the dates for this job order.</CardDescription>
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
                    <TableHead className="w-[40%]">Description</TableHead>
                    <TableHead className="w-[15%]">Quantity</TableHead>
                    <TableHead className="w-[15%]">Amount</TableHead>
                    <TableHead className="w-[20%]">Order Status</TableHead>
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
                                  <SelectItem value="Cheque">Cheque</SelectItem>
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
                    status: "Unpaid",
                  })
                }
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-8 bg-muted/50 p-6">
                <div className="w-full md:w-1/2 space-y-4">
                    <div className="flex justify-between items-center">
                         <h4 className="font-semibold">Payment Details</h4>
                    </div>
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Payment Method</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="Cash" />
                                </FormControl>
                                <FormLabel className="font-normal">Cash</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="E-Wallet (GCASH, MAYA)" />
                                </FormControl>
                                <FormLabel className="font-normal">E-Wallet (GCASH, MAYA)</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="Cheque" />
                                </FormControl>
                                <FormLabel className="font-normal">Cheque</FormLabel>
                              </FormItem>
                               <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="Bank Transfer" />
                                </FormControl>
                                <FormLabel className="font-normal">Bank Transfer</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {(paymentMethod === 'E-Wallet (GCASH, MAYA)' || paymentMethod === 'Bank Transfer') && (
                         <FormField
                            control={form.control}
                            name="paymentReference"
                            render={({ field }) => (
                               <FormItem>
                                 <FormLabel>Reference Number</FormLabel>
                                 <FormControl>
                                     <Input placeholder="Enter reference number" {...field} value={field.value || ''}/>
                                 </FormControl>
                                 <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                     {paymentMethod === 'Cheque' && (
                        <div className="grid grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="chequeBankName"
                                render={({ field }) => (
                                   <FormItem>
                                     <FormLabel>Bank Name</FormLabel>
                                     <FormControl>
                                         <Input placeholder="e.g., BDO" {...field} value={field.value || ''} />
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
                                     <FormLabel>Cheque Number</FormLabel>
                                     <FormControl>
                                         <Input placeholder="Enter cheque number" {...field} value={field.value || ''} />
                                     </FormControl>
                                     <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="chequeDate"
                                render={({ field }) => (
                                <FormItem className="flex flex-col col-span-2">
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
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
                </div>
                <div className="w-full md:w-1/2 space-y-2">
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
                     <FormField
                        control={form.control}
                        name="paidAmount"
                        render={({ field }) => (
                           <FormItem>
                             <div className="flex justify-between items-center">
                                <FormLabel className="text-muted-foreground">Paid Amount</FormLabel>
                                <FormControl>
                                    <Input type="number" className="w-24 h-8" placeholder="0.00" {...field} />
                                </FormControl>
                            </div>
                             <FormMessage className="text-right" />
                            </FormItem>
                        )}
                    />

                    <div className="flex justify-between border-t pt-2 mt-2 border-border">
                        <span className="text-lg font-bold">Total Amount</span>
                        <span className="text-lg font-bold text-primary">{formatCurrency(totalAmount)}</span>
                    </div>
                </div>
            </CardFooter>
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
                                    <Textarea rows={10} placeholder="e.g., Special delivery instructions." {...field} value={field.value || ''} />
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
                    {isEditMode ? 'Update Job Order' : 'Save Job Order'}
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
            <DialogFooter className="sm:justify-end gap-2">
                 <Button variant="outline" onClick={() => {
                    if (lastSavedOrder) {
                        window.open(`/print/${lastSavedOrder.id}`, '_blank');
                    }
                    handleDialogClose();
                }}>
                    <Printer className="mr-2 h-4 w-4"/>
                    Print
                </Button>
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

    
