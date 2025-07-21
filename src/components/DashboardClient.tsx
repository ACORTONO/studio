
"use client";

import React, { useState, useMemo } from "react";
import Link from 'next/link';
import { useJobOrders } from "@/contexts/JobOrderContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Printer, PlusCircle, TrendingUp, TrendingDown, DollarSign, Pencil, Trash2 } from "lucide-react";
import {
  startOfToday,
  startOfWeek,
  startOfMonth,
  endOfToday,
  endOfWeek,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";


const expenseItemSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    amount: z.coerce.number().min(0.01, 'Amount must be positive')
});

const expenseSchema = z.object({
    description: z.string().min(1, 'Main description is required'),
    items: z.array(expenseItemSchema).min(1, 'At least one expense item is required.')
});

const StatCard = ({ title, value, icon: Icon, description }: { title: string, value: string, icon: React.ElementType, description: string }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
);

export function DashboardClient() {
  const { jobOrders, expenses, addExpense } = useJobOrders();
  const [timeFilter, setTimeFilter] = useState("today");
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);

  const expenseForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { 
        description: '', 
        items: [{ description: '', amount: 0 }] 
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: expenseForm.control,
    name: "items"
  });

  const { filteredOrders, filteredExpenses, totalSales, totalExpenses, netProfit } = useMemo(() => {
    const now = new Date();
    let interval: Interval;

    switch (timeFilter) {
      case "weekly":
        interval = { start: startOfWeek(now), end: endOfWeek(now) };
        break;
      case "monthly":
        interval = { start: startOfMonth(now), end: endOfMonth(now) };
        break;
      default:
        interval = { start: startOfToday(), end: endOfToday() };
    }

    const filteredOrders = jobOrders.filter(order => isWithinInterval(parseISO(order.date), interval));
    const filteredExpenses = expenses.filter(expense => isWithinInterval(parseISO(expense.date), interval));

    const totalSales = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.totalAmount, 0);

    return {
      filteredOrders,
      filteredExpenses,
      totalSales,
      totalExpenses,
      netProfit: totalSales - totalExpenses
    };
  }, [jobOrders, expenses, timeFilter]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const handleAddExpense = (values: z.infer<typeof expenseSchema>) => {
    addExpense(values);
    expenseForm.reset({ description: '', items: [{ description: '', amount: 0 }] });
    setIsExpenseDialogOpen(false);
  }

  const watchExpenseItems = expenseForm.watch("items");
  const expenseTotalAmount = watchExpenseItems.reduce(
    (acc, item) => acc + (item.amount || 0),
    0
  );

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-headline font-bold">Dashboard</h1>
            <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                    <form onSubmit={expenseForm.handleSubmit(handleAddExpense)}>
                        <DialogHeader>
                            <DialogTitle>Add New Expense</DialogTitle>
                            <DialogDescription>Record a new expense with multiple items.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="description" className="text-right">Description</Label>
                                <Input id="description" {...expenseForm.register('description')} className="col-span-3" placeholder="e.g., Office Supplies"/>
                                {expenseForm.formState.errors.description && <p className="text-red-500 text-xs col-span-4 text-right">{expenseForm.formState.errors.description.message}</p>}
                            </div>
                            
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Expense Items</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="w-[120px]">Amount</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fields.map((field, index) => (
                                                <TableRow key={field.id}>
                                                    <TableCell>
                                                        <Input {...expenseForm.register(`items.${index}.description`)} placeholder="e.g., Bond paper"/>
                                                        {expenseForm.formState.errors.items?.[index]?.description && <p className="text-red-500 text-xs mt-1">{expenseForm.formState.errors.items?.[index]?.description?.message}</p>}
                                                    </TableCell>
                                                    <TableCell>
                                                         <Input type="number" {...expenseForm.register(`items.${index}.amount`)} placeholder="0.00"/>
                                                         {expenseForm.formState.errors.items?.[index]?.amount && <p className="text-red-500 text-xs mt-1">{expenseForm.formState.errors.items?.[index]?.amount?.message}</p>}
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
                                        onClick={() => append({ description: "", amount: 0 })}
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Item
                                    </Button>
                                </CardContent>
                                <CardFooter className="flex justify-end bg-muted/50 p-3 font-bold">
                                    Total: {formatCurrency(expenseTotalAmount)}
                                </CardFooter>
                            </Card>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Cancel</Button>
                            </DialogClose>
                            <Button type="submit">Save Expense</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>

        <Tabs defaultValue="today" onValueChange={setTimeFilter} className="space-y-4">
        <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="weekly">This Week</TabsTrigger>
            <TabsTrigger value="monthly">This Month</TabsTrigger>
        </TabsList>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Total Sales" value={formatCurrency(totalSales)} icon={TrendingUp} description={`For the selected period`} />
            <StatCard title="Total Expenses" value={formatCurrency(totalExpenses)} icon={TrendingDown} description={`For the selected period`} />
            <StatCard title="Net Profit" value={formatCurrency(netProfit)} icon={DollarSign} description={`For the selected period`}/>
        </div>
        </Tabs>
        
        <Tabs defaultValue="jobOrders" className="space-y-4">
            <TabsList>
                <TabsTrigger value="jobOrders">Job Orders</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
            </TabsList>
            <TabsContent value="jobOrders">
                <Card>
                    <CardHeader>
                    <CardTitle>Job Orders</CardTitle>
                    <CardDescription>A list of job orders for the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Job Order #</TableHead>
                            <TableHead>Client Name</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredOrders.length > 0 ? (
                            filteredOrders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell>
                                <Badge variant="outline">{order.jobOrderNumber}</Badge>
                                </TableCell>
                                <TableCell className="font-medium">{order.clientName}</TableCell>
                                <TableCell>{new Date(order.startDate).toLocaleDateString()}</TableCell>
                                <TableCell>{new Date(order.dueDate).toLocaleDateString()}</TableCell>
                                <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                                <TableCell className="text-right space-x-2">
                                <Button asChild variant="ghost" size="icon">
                                    <Link href={`/edit/${order.id}`}>
                                    <Pencil className="h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button asChild variant="ghost" size="icon">
                                    <Link href={`/print/${order.id}`} target="_blank">
                                    <Printer className="h-4 w-4" />
                                    </Link>
                                </Button>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No job orders for this period.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="expenses">
                <Card>
                    <CardHeader>
                        <CardTitle>Expenses</CardTitle>
                        <CardDescription>A list of expenses for the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead className="text-right">Total Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredExpenses.length > 0 ? (
                                    filteredExpenses.map((expense) => (
                                        <TableRow key={expense.id}>
                                            <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-medium">{expense.description}</TableCell>
                                            <TableCell>
                                                <ul className="list-disc list-inside text-sm text-muted-foreground">
                                                    {expense.items.map(item => (
                                                        <li key={item.id}>{item.description} - {formatCurrency(item.amount)}</li>
                                                    ))}
                                                </ul>
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(expense.totalAmount)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No expenses for this period.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}

    
