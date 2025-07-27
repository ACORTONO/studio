
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
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Printer, PlusCircle, TrendingUp, TrendingDown, DollarSign, Pencil, Trash2, Search, ArrowUpDown, Users, ChevronDown } from "lucide-react";
import {
  startOfToday,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfToday,
  endOfWeek,
  endOfMonth,
  endOfYear,
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
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Expense, ExpenseCategory, JobOrder } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";


const expenseItemSchema = z.object({
    id: z.string().optional(),
    description: z.string().min(1, 'Description is required'),
    amount: z.coerce.number().min(0.01, 'Amount must be positive')
});

const expenseSchema = z.object({
    id: z.string().optional(),
    description: z.string().min(1, 'Main description is required'),
    category: z.enum(['General', 'Cash Advance', 'Salary', 'Fixed Expense']),
    items: z.array(expenseItemSchema).min(1, 'At least one expense item is required.')
});

type SortableJobOrderKeys = keyof JobOrder;
type SortableExpenseKeys = keyof Expense;

const StatCard = ({ title, value, icon: Icon, description, className }: { title: string, value: string, icon: React.ElementType, description: string, className?: string }) => (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs">{description}</p>
      </CardContent>
    </Card>
);

export function DashboardClient() {
  const { jobOrders, expenses, addExpense, updateExpense, deleteExpense } = useJobOrders();
  const [timeFilter, setTimeFilter] = useState("today");
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [jobOrderSearchQuery, setJobOrderSearchQuery] = useState("");
  const [expenseSearchQuery, setExpenseSearchQuery] = useState("");
  const [jobOrderSortConfig, setJobOrderSortConfig] = useState<{ key: SortableJobOrderKeys; direction: 'ascending' | 'descending' } | null>({ key: 'startDate', direction: 'descending' });
  const [expenseSortConfig, setExpenseSortConfig] = useState<{ key: SortableExpenseKeys; direction: 'ascending' | 'descending' } | null>({ key: 'date', direction: 'descending' });


  const expenseForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
        description: '',
        category: 'General',
        items: [{ description: '', amount: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: expenseForm.control,
    name: "items"
  });

  const { filteredOrders, filteredExpenses, totalSales, totalExpenses, netProfit, totalCustomers } = useMemo(() => {
    const now = new Date();
    let interval: Interval;

    switch (timeFilter) {
      case "weekly":
        interval = { start: startOfWeek(now), end: endOfWeek(now) };
        break;
      case "monthly":
        interval = { start: startOfMonth(now), end: endOfMonth(now) };
        break;
      case "yearly":
        interval = { start: startOfYear(now), end: endOfYear(now) };
        break;
      default:
        interval = { start: startOfToday(), end: endOfToday() };
    }

    const dateFilteredOrders = jobOrders.filter(order => isWithinInterval(parseISO(order.startDate), interval));
    
    let sortedAndFilteredOrders = dateFilteredOrders.filter(order => 
      order.clientName.toLowerCase().includes(jobOrderSearchQuery.toLowerCase()) ||
      order.jobOrderNumber.toLowerCase().includes(jobOrderSearchQuery.toLowerCase())
    );

    if (jobOrderSortConfig !== null) {
        sortedAndFilteredOrders.sort((a, b) => {
            const aValue = a[jobOrderSortConfig.key];
            const bValue = b[jobOrderSortConfig.key];

            if (aValue === undefined || bValue === undefined) return 0;

            let comparison = 0;
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                if (jobOrderSortConfig.key === 'startDate' || jobOrderSortConfig.key === 'dueDate') {
                    comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
                } else {
                    comparison = aValue.localeCompare(bValue);
                }
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            }
            
            return jobOrderSortConfig.direction === 'ascending' ? comparison : -comparison;
        });
    }

    const dateFilteredExpenses = expenses.filter(expense => isWithinInterval(parseISO(expense.date), interval));

    let sortedAndFilteredExpenses = dateFilteredExpenses.filter(expense => 
        expense.description.toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
        expense.category.toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
        expense.items.some(item => item.description.toLowerCase().includes(expenseSearchQuery.toLowerCase()))
    );

     if (expenseSortConfig !== null) {
        sortedAndFilteredExpenses.sort((a, b) => {
            const aValue = a[expenseSortConfig.key];
            const bValue = b[expenseSortConfig.key];

            if (aValue === undefined || bValue === undefined) return 0;

            let comparison = 0;
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                if (expenseSortConfig.key === 'date') {
                    comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
                } else {
                    comparison = aValue.localeCompare(bValue);
                }
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            }
            
            return expenseSortConfig.direction === 'ascending' ? comparison : -comparison;
        });
    }


    const totalSales = sortedAndFilteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalExpenses = sortedAndFilteredExpenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
    const uniqueClients = new Set(sortedAndFilteredOrders.map(order => order.clientName));

    return {
      filteredOrders: sortedAndFilteredOrders,
      filteredExpenses: sortedAndFilteredExpenses,
      totalSales,
      totalExpenses,
      netProfit: totalSales - totalExpenses,
      totalCustomers: uniqueClients.size,
    };
  }, [jobOrders, expenses, timeFilter, jobOrderSearchQuery, expenseSearchQuery, jobOrderSortConfig, expenseSortConfig]);

  const requestJobOrderSort = (key: SortableJobOrderKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (jobOrderSortConfig && jobOrderSortConfig.key === key && jobOrderSortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setJobOrderSortConfig({ key, direction });
  }

  const requestExpenseSort = (key: SortableExpenseKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (expenseSortConfig && expenseSortConfig.key === key && expenseSortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setExpenseSortConfig({ key, direction });
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const handleExpenseSubmit = (values: z.infer<typeof expenseSchema>) => {
    if (editingExpense) {
      updateExpense({ ...values, id: editingExpense.id });
    } else {
      addExpense(values);
    }
    expenseForm.reset({ description: '', category: 'General', items: [{ description: '', amount: 0 }] });
    setIsExpenseDialogOpen(false);
    setEditingExpense(null);
  }
  
  const handleOpenExpenseDialog = (expense?: Expense) => {
    if (expense) {
        setEditingExpense(expense);
        expenseForm.reset(expense);
    } else {
        setEditingExpense(null);
        expenseForm.reset({ description: '', category: 'General', items: [{ description: '', amount: 0 }] });
    }
    setIsExpenseDialogOpen(true);
  }

  const handleDeleteExpense = (expenseId: string) => {
    deleteExpense(expenseId);
  }

  const watchExpenseItems = expenseForm.watch("items");
  const expenseTotalAmount = watchExpenseItems.reduce(
    (acc, item) => acc + (item.amount || 0),
    0
  );

  const getCategoryBadge = (category: ExpenseCategory) => {
    const variants: { [key in ExpenseCategory]: Parameters<typeof badgeVariants>[0]['variant'] } = {
        'General': 'secondary',
        'Salary': 'success',
        'Cash Advance': 'warning',
        'Fixed Expense': 'info'
    };
    return <Badge variant={variants[category]}>{category}</Badge>
  }
  
  const SortableJobOrderHeader = ({ title, sortKey }: { title: string, sortKey: SortableJobOrderKeys }) => (
     <TableHead>
        <Button variant="ghost" onClick={() => requestJobOrderSort(sortKey)}>
            {title}
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    </TableHead>
  )

  const SortableExpenseHeader = ({ title, sortKey }: { title: string, sortKey: SortableExpenseKeys }) => (
     <TableHead>
        <Button variant="ghost" onClick={() => requestExpenseSort(sortKey)}>
            {title}
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    </TableHead>
  )

  const renderContent = () => (
    <div className="space-y-4 mt-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
            title="Total Sales" 
            value={formatCurrency(totalSales)} 
            icon={TrendingUp} 
            description={`For the selected period`}
            className="bg-green-600/20 border-green-600 text-green-100"
        />
        <StatCard 
            title="Total Expenses" 
            value={formatCurrency(totalExpenses)} 
            icon={TrendingDown} 
            description={`For the selected period`}
            className="bg-red-600/20 border-red-600 text-red-100"
        />
        <StatCard 
            title="Net Profit" 
            value={formatCurrency(netProfit)} 
            icon={DollarSign} 
            description={`For the selected period`}
            className="bg-blue-600/20 border-blue-600 text-blue-100"
        />
         <StatCard 
            title="Total Customers" 
            value={totalCustomers.toString()} 
            icon={Users} 
            description={`For the selected period`}
            className="bg-purple-600/20 border-purple-600 text-purple-100"
        />
      </div>
      <Tabs defaultValue="jobOrders" className="space-y-4">
        <TabsList>
            <TabsTrigger value="jobOrders">Job Orders ({filteredOrders.length})</TabsTrigger>
            <TabsTrigger value="expenses">Expenses ({filteredExpenses.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="jobOrders">
          <Card>
              <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                          <CardTitle>Job Orders</CardTitle>
                          <CardDescription>A list of job orders for the selected period.</CardDescription>
                      </div>
                       <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                              placeholder="Search by client or J.O. #" 
                              className="pl-10 w-full sm:w-64"
                              value={jobOrderSearchQuery}
                              onChange={(e) => setJobOrderSearchQuery(e.target.value)}
                          />
                      </div>
                  </div>
              </CardHeader>
              <CardContent>
              <Table>
                  <TableHeader>
                  <TableRow>
                      <TableHead className="w-[100px]">Items</TableHead>
                      <SortableJobOrderHeader title="Job Order #" sortKey="jobOrderNumber" />
                      <SortableJobOrderHeader title="Client Name" sortKey="clientName" />
                      <SortableJobOrderHeader title="Start Date" sortKey="startDate" />
                      <SortableJobOrderHeader title="Due Date" sortKey="dueDate" />
                      <SortableJobOrderHeader title="Amount" sortKey="totalAmount" />
                      <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                  {filteredOrders.length > 0 ? (
                      filteredOrders.map((order) => (
                        <Collapsible asChild key={order.id}>
                          <>
                            <TableRow>
                                <TableCell>
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      View
                                      <ChevronDown className="h-4 w-4 ml-2" />
                                      <span className="sr-only">Toggle details</span>
                                    </Button>
                                  </CollapsibleTrigger>
                                </TableCell>
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
                             <CollapsibleContent asChild>
                                <TableRow>
                                  <TableCell colSpan={7} className="p-0">
                                      <div className="bg-muted/50 p-4">
                                          <h4 className="font-semibold mb-2">Order Items:</h4>
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-center">Qty</TableHead>
                                                <TableHead className="text-right">Price</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {order.items.map(item => (
                                                <TableRow key={item.id}>
                                                  <TableCell>
                                                    {item.description}
                                                    {item.remarks && <p className="text-xs text-muted-foreground">{item.remarks}</p>}
                                                  </TableCell>
                                                  <TableCell className="text-center">{item.quantity}</TableCell>
                                                  <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                                  <TableCell className="text-right">{formatCurrency(item.quantity * item.amount)}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                      </div>
                                  </TableCell>
                                </TableRow>
                              </CollapsibleContent>
                          </>
                        </Collapsible>
                      ))
                  ) : (
                      <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
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
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div>
                            <CardTitle>Expenses</CardTitle>
                            <CardDescription>A list of expenses for the selected period.</CardDescription>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search expenses..." 
                                className="pl-10 w-full sm:w-64"
                                value={expenseSearchQuery}
                                onChange={(e) => setExpenseSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <SortableExpenseHeader title="Date" sortKey="date" />
                                <SortableExpenseHeader title="Category" sortKey="category" />
                                <SortableExpenseHeader title="Description" sortKey="description" />
                                <TableHead>Items</TableHead>
                                <SortableExpenseHeader title="Total Amount" sortKey="totalAmount" />
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredExpenses.length > 0 ? (
                                filteredExpenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                                        <TableCell>{getCategoryBadge(expense.category)}</TableCell>
                                        <TableCell className="font-medium">{expense.description}</TableCell>
                                        <TableCell>
                                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                                                {expense.items.map(item => (
                                                    <li key={item.id}>{item.description} - {formatCurrency(item.amount)}</li>
                                                ))}
                                            </ul>
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(expense.totalAmount)}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenExpenseDialog(expense)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete this expense record.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteExpense(expense.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
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


  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-headline font-bold">Dashboard</h1>
            <Dialog open={isExpenseDialogOpen} onOpenChange={(isOpen) => {
                 setIsExpenseDialogOpen(isOpen);
                 if (!isOpen) {
                    setEditingExpense(null);
                    expenseForm.reset();
                 }
            }}>
                <DialogTrigger asChild>
                    <Button onClick={() => handleOpenExpenseDialog()}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                    <form onSubmit={expenseForm.handleSubmit(handleExpenseSubmit)}>
                        <DialogHeader>
                            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
                            <DialogDescription>
                                {editingExpense ? 'Update the details of your expense.' : 'Record a new expense with multiple items.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="description" className="text-right">Description</Label>
                                <Input id="description" {...expenseForm.register('description')} className="col-span-3" placeholder="e.g., Office Supplies"/>
                                {expenseForm.formState.errors.description && <p className="text-red-500 text-xs col-span-4 text-right">{expenseForm.formState.errors.description.message}</p>}
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category" className="text-right">Category</Label>
                                 <Select onValueChange={(value: ExpenseCategory) => expenseForm.setValue('category', value)} defaultValue={expenseForm.getValues('category')}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="General">General</SelectItem>
                                        <SelectItem value="Cash Advance">Cash Advance</SelectItem>
                                        <SelectItem value="Salary">Salary</SelectItem>
                                        <SelectItem value="Fixed Expense">Fixed Expense</SelectItem>
                                    </SelectContent>
                                </Select>
                                {expenseForm.formState.errors.category && <p className="text-red-500 text-xs col-span-4 text-right">{expenseForm.formState.errors.category.message}</p>}
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
                            <Button type="submit">{editingExpense ? 'Update' : 'Save'} Expense</Button>
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
            <TabsTrigger value="yearly">This Year</TabsTrigger>
        </TabsList>
        <TabsContent value="today">{renderContent()}</TabsContent>
        <TabsContent value="weekly">{renderContent()}</TabsContent>
        <TabsContent value="monthly">{renderContent()}</TabsContent>
        <TabsContent value="yearly">{renderContent()}</TabsContent>
      </Tabs>
    </div>
  );
}
