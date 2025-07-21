"use client";

import React, { useState, useMemo } from "react";
import Link from 'next/link';
import { useJobOrders } from "@/contexts/JobOrderContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
import { Printer, PlusCircle, TrendingUp, TrendingDown, DollarSign, Pencil } from "lucide-react";
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
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";


const expenseSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    amount: z.coerce.number().min(0.01, 'Amount must be positive')
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
    defaultValues: { description: '', amount: 0 }
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
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

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
    expenseForm.reset();
    setIsExpenseDialogOpen(false);
  }

  return (
    <Tabs defaultValue="today" onValueChange={setTimeFilter} className="space-y-4">
      <div className="flex items-center justify-between">
        <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="weekly">This Week</TabsTrigger>
            <TabsTrigger value="monthly">This Month</TabsTrigger>
        </TabsList>
        <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={expenseForm.handleSubmit(handleAddExpense)}>
                    <DialogHeader>
                        <DialogTitle>Add New Expense</DialogTitle>
                        <DialogDescription>Record a new expense for the current period.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Description</Label>
                            <Input id="description" {...expenseForm.register('description')} className="col-span-3" />
                            {expenseForm.formState.errors.description && <p className="text-red-500 text-xs col-span-4 text-right">{expenseForm.formState.errors.description.message}</p>}
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">Amount</Label>
                            <Input id="amount" type="number" {...expenseForm.register('amount')} className="col-span-3" />
                             {expenseForm.formState.errors.amount && <p className="text-red-500 text-xs col-span-4 text-right">{expenseForm.formState.errors.amount.message}</p>}
                        </div>
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
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total Sales" value={formatCurrency(totalSales)} icon={TrendingUp} description={`For the selected period`} />
          <StatCard title="Total Expenses" value={formatCurrency(totalExpenses)} icon={TrendingDown} description={`For the selected period`} />
          <StatCard title="Net Profit" value={formatCurrency(netProfit)} icon={DollarSign} description={`For the selected period`}/>
      </div>
      
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
    </Tabs>
  );
}
