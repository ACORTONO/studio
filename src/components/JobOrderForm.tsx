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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useJobOrders } from "@/contexts/JobOrderContext";
import { createJobOrderAction } from "@/lib/actions";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import React from "react";

const formSchema = z.object({
  clientName: z.string().min(1, "Client name is required."),
  contactNumber: z.string().min(1, "Contact number is required."),
  date: z.date({ required_error: "A date is required." }),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Description is required."),
        quantity: z.coerce.number().min(0.01, "Quantity must be > 0."),
        amount: z.coerce.number().min(0, "Amount must be >= 0."),
        remarks: z.string().optional(),
      })
    )
    .min(1, "At least one item is required."),
});

type JobOrderFormValues = z.infer<typeof formSchema>;

export function JobOrderForm() {
  const { toast } = useToast();
  const { addJobOrder, jobOrders } = useJobOrders();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<JobOrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: "",
      contactNumber: "",
      date: new Date(),
      items: [{ description: "", quantity: 1, amount: 0, remarks: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");
  const totalAmount = watchItems.reduce(
    (acc, item) => acc + (item.quantity || 0) * (item.amount || 0),
    0
  );

  const onSubmit = async (data: JobOrderFormValues) => {
    setIsSubmitting(true);
    const existingJobOrderNumbers = jobOrders.map((jo) => jo.jobOrderNumber);
    const result = await createJobOrderAction(data, existingJobOrderNumbers);

    if (result.success && result.data) {
      addJobOrder(result.data);
      toast({
        title: "Success",
        description: "Job order created successfully.",
        variant: 'default',
        className: 'bg-green-500 text-white'
      });
      form.reset();
    } else {
      toast({
        title: "Error",
        description:
          "Failed to create job order. " + (result.error || ""),
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>
              Enter the client's details for the job order.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-6">
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
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel>Date</FormLabel>
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
          <CardFooter className="flex justify-end bg-muted/50 p-6">
            <div className="text-xl font-bold">
              Total Amount:{" "}
              <span className="text-primary">
                {formatCurrency(totalAmount)}
              </span>
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
            Save Job Order
          </Button>
        </div>
      </form>
    </Form>
  );
}
