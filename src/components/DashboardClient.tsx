

"use client";

import React, from 'react';
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
import { Printer, PlusCircle, TrendingUp, TrendingDown, DollarSign, Pencil, Trash2, Search, ArrowUpDown, Users, ChevronDown, Activity, Hourglass, CheckCircle, CircleX, Wallet, AlertCircle } from "lucide-react";
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
  DialogFooter,
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
import { Expense, ExpenseCategory, JobOrder, JobOrderItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";


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

type SortableJobOrderKeys = keyof JobOrder | 'balance';
type SortableExpenseKeys = keyof Expense;

const StatCard = ({ title, value, icon: Icon, description, className }: { title: string, value: string, icon: React.ElementType, description: string, className?: string }) => (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-black">{title}</CardTitle>
        <Icon className="h-4 w-4 text-black" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-black">{value}</div>
        <p className="text-xs text-black">{description}</p>
      </CardContent>
    </Card>
);

const getStatusBadge = (status: JobOrder['status'], items: JobOrderItem[] = []) => {
    
    const itemStatusCounts = items.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
    }, {} as Record<JobOrderItem['status'], number>);

    const statusSummary = Object.entries(itemStatusCounts)
        .map(([st, count]) => `${count} ${st.toLowerCase()}`)
        .join(', ');

    if (items.some(i => i.status === 'Cheque')) {
         return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant="info"><Wallet className="mr-1 h-3 w-3"/> Cheque</Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                       <p>{statusSummary || 'Awaiting cheque clearance'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    switch (status) {
        case 'Completed':
            return <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3"/> Completed</Badge>;
        case 'Downpayment':
             return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="violet"><Wallet className="mr-1 h-3 w-3"/> Downpayment</Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                           <p>{statusSummary || 'Partially paid'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        case 'Pending':
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="warning"><Hourglass className="mr-1 h-3 w-3"/> Pending</Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                           <p>{statusSummary || 'Awaiting work'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        case 'Cancelled':
            return <Badge variant="destructive"><CircleX className="mr-1 h-3 w-3"/> Cancelled</Badge>;
        default:
            return <Badge>{status}</Badge>;
    }
}

const JobOrderRow = ({ jobOrder, onDelete }: { jobOrder: JobOrder, onDelete: (id: string) => void }) => {
    const { updateJobOrder } = useJobOrders();
    const [isOpen, setIsOpen] = React.useState(false);
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    
    const subtotal = jobOrder.totalAmount;
    const discountValue = jobOrder.discount || 0;
    const discountAmount = jobOrder.discountType === 'percent'
        ? subtotal * (discountValue / 100)
        : discountValue;
    const paidAmount = jobOrder.paidAmount || 0;
    const balance = subtotal - discountAmount - paidAmount;

    React.useEffect(() => {
        const itemStatuses = jobOrder.items.map(item => item.status);
        let derivedStatus: JobOrder['status'] = 'Pending';
        const isFullyPaid = balance <= 0 && jobOrder.paidAmount > 0;
        
        if (jobOrder.status === 'Cancelled') {
            derivedStatus = 'Cancelled';
        } else if (isFullyPaid || itemStatuses.every(s => s === 'Paid')) {
            derivedStatus = 'Completed';
        } else if (itemStatuses.some(s => s === 'Paid' || s === 'Downpayment' || s === 'Cheque') || (jobOrder.paidAmount || 0) > 0) {
            derivedStatus = 'Downpayment';
        }

        if (jobOrder.status !== derivedStatus) {
            updateJobOrder({ ...jobOrder, status: derivedStatus });
        }
    }, [jobOrder, updateJobOrder, balance]);


    return (
        <React.Fragment>
            <TableRow>
                <TableCell>
                     <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                        <span className="sr-only">Toggle details</span>
                    </Button>
                </TableCell>
                <TableCell>
                    <Badge variant="outline">{jobOrder.jobOrderNumber}</Badge>
                </TableCell>
                <TableCell className="font-medium">{jobOrder.clientName}</TableCell>
                <TableCell>
                    <ul className="list-disc list-inside text-xs">
                        {jobOrder.items.slice(0, 2).map(item => (
                            <li key={item.id} className="truncate">{item.description}</li>
                        ))}
                        {jobOrder.items.length > 2 && <li className="text-muted-foreground">...and {jobOrder.items.length - 2} more</li>}
                    </ul>
                </TableCell>
                <TableCell>{new Date(jobOrder.startDate).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(jobOrder.dueDate).toLocaleDateString()}</TableCell>
                <TableCell>{formatCurrency(jobOrder.totalAmount)}</TableCell>
                <TableCell>{formatCurrency(jobOrder.paidAmount)}</TableCell>
                <TableCell>{formatCurrency(balance)}</TableCell>
                <TableCell>{getStatusBadge(jobOrder.status, jobOrder.items)}</TableCell>
                <TableCell className="text-right space-x-2">
                    <Button asChild variant="ghost" size="icon">
                        <Link href={`/edit/${jobOrder.id}`}>
                            <Pencil className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon">
                        <Link href={`/print/${jobOrder.id}`} target="_blank">
                            <Printer className="h-4 w-4" />
                        </Link>
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
                                This action cannot be undone. This will permanently delete this job order.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(jobOrder.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TableCell>
            </TableRow>
            {isOpen && (
                <TableRow>
                    <TableCell colSpan={11} className="p-0">
                        <div className="p-4 bg-muted/50">
                            <h4 className="font-semibold mb-2 ml-4">Job Order Items:</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-center">Qty</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Remarks</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {jobOrder.items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.description}</TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.quantity * item.amount)}</TableCell>
                                            <TableCell className="text-right">{item.remarks}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    )
}

export function DashboardClient() {
  const { jobOrders, expenses, addExpense, updateExpense, deleteExpense, deleteJobOrder } = useJobOrders();
  const [timeFilter, setTimeFilter] = React.useState("today");
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);
  const [jobOrderSearchQuery, setJobOrderSearchQuery] = React.useState("");
  const [expenseSearchQuery, setExpenseSearchQuery] = React.useState("");
  const [jobOrderSortConfig, setJobOrderSortConfig] = React.useState<{ key: SortableJobOrderKeys; direction: 'ascending' | 'descending' } | null>({ key: 'startDate', direction: 'descending' });
  const [expenseSortConfig, setExpenseSortConfig] = React.useState<{ key: SortableExpenseKeys; direction: 'ascending' | 'descending' } | null>({ key: 'date', direction: 'descending' });
  const { toast } = useToast();


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

  const { filteredJobOrders, filteredExpenses, totalSales, totalExpenses, netProfit, totalCustomers, totalUnpaid } = React.useMemo(() => {
    const now = new Date();
    let interval: Interval | null = null;

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
      case "today":
      default:
        interval = { start: startOfToday(), end: endOfToday() };
        break;
    }
    
    const dateFilteredJobOrders = interval 
        ? jobOrders.filter(jo => isWithinInterval(parseISO(jo.startDate), interval as Interval))
        : jobOrders;
    
    let sortedAndFilteredJobOrders = dateFilteredJobOrders.filter(jobOrder => 
      jobOrder.clientName.toLowerCase().includes(jobOrderSearchQuery.toLowerCase()) ||
      jobOrder.jobOrderNumber.toLowerCase().includes(jobOrderSearchQuery.toLowerCase())
    );

    if (jobOrderSortConfig !== null) {
        sortedAndFilteredJobOrders.sort((a, b) => {
            if (jobOrderSortConfig.key === 'balance') {
                const aSubtotal = a.totalAmount;
                const aDiscountValue = a.discount || 0;
                const aDiscountAmount = a.discountType === 'percent' ? aSubtotal * (aDiscountValue / 100) : aDiscountValue;
                const aPaidAmount = a.paidAmount || 0;
                const aValue = aSubtotal - aDiscountAmount - aPaidAmount;

                const bSubtotal = b.totalAmount;
                const bDiscountValue = b.discount || 0;
                const bDiscountAmount = b.discountType === 'percent' ? bSubtotal * (bDiscountValue / 100) : bDiscountValue;
                const bPaidAmount = b.paidAmount || 0;
                const bValue = bSubtotal - bDiscountAmount - bPaidAmount;

                const comparison = aValue - bValue;
                return jobOrderSortConfig.direction === 'ascending' ? comparison : -comparison;
            }


            const aValue = a[jobOrderSortConfig.key as keyof JobOrder];
            const bValue = b[jobOrderSortConfig.key as keyof JobOrder];

            if (jobOrderSortConfig.key === 'items') {
                const aText = a.items.map(i => i.description).join(', ');
                const bText = b.items.map(i => i.description).join(', ');
                const comparison = aText.localeCompare(bText);
                return jobOrderSortConfig.direction === 'ascending' ? comparison : -comparison;
            }

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

    const dateFilteredExpenses = interval
        ? expenses.filter(ex => isWithinInterval(parseISO(ex.date), interval as Interval))
        : expenses;

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
            } else if (typeof bValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            }
            
            return expenseSortConfig.direction === 'ascending' ? comparison : -comparison;
        });
    }


    const totalSales = sortedAndFilteredJobOrders.reduce((sum, jo) => sum + jo.totalAmount, 0);
    const totalExpenses = sortedAndFilteredExpenses.reduce((sum, ex) => sum + ex.totalAmount, 0);
    const totalPaid = sortedAndFilteredJobOrders.reduce((sum, jo) => sum + (jo.paidAmount || 0), 0);
    const totalDiscount = sortedAndFilteredJobOrders.reduce((sum, jo) => {
        const discountValue = jo.discount || 0;
        const discountAmount = jo.discountType === 'percent' ? jo.totalAmount * (discountValue / 100) : discountValue;
        return sum + discountAmount;
    }, 0);
    
    const totalUnpaid = totalSales - totalPaid - totalDiscount;
    const uniqueClients = new Set(sortedAndFilteredJobOrders.map(jo => jo.clientName));

    return {
      filteredJobOrders: sortedAndFilteredJobOrders,
      filteredExpenses: sortedAndFilteredExpenses,
      totalSales,
      totalExpenses,
      netProfit: totalPaid - totalExpenses,
      totalCustomers: uniqueClients.size,
      totalUnpaid
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
       toast({ title: "Success", description: "Expense updated successfully." });
    } else {
      addExpense(values);
       toast({ title: "Success", description: "Expense added successfully." });
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
    toast({ title: "Success", description: "Expense deleted successfully." });
  }

  const handleDeleteJobOrder = (jobOrderId: string) => {
    deleteJobOrder(jobOrderId);
    toast({ title: "Success", description: "Job order deleted successfully." });
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard 
            title="Total Sales" 
            value={formatCurrency(totalSales)} 
            icon={TrendingUp} 
            description="Total revenue from all orders"
            className="bg-green-600/20 border-green-600"
        />
        <StatCard 
            title="Total Expenses" 
            value={formatCurrency(totalExpenses)} 
            icon={TrendingDown} 
            description="Total operational costs"
            className="bg-red-600/20 border-red-600"
        />
        <StatCard 
            title="Collectibles" 
            value={formatCurrency(totalUnpaid)} 
            icon={AlertCircle} 
            description="Total outstanding balance"
            className="bg-yellow-600/20 border-yellow-600"
        />
        <StatCard 
            title="Net Profit" 
            value={formatCurrency(netProfit)} 
            icon={DollarSign} 
            description={`Total paid minus expenses`}
            className="bg-blue-600/20 border-blue-600"
        />
         <StatCard 
            title="Total Customers" 
            value={totalCustomers.toString()} 
            icon={Users} 
            description={`Unique clients for the period`}
            className="bg-purple-600/20 border-purple-600"
        />
      </div>
      <Tabs defaultValue="job-orders" className="space-y-4">
        <TabsList>
            <TabsTrigger value="job-orders">Job Orders ({filteredJobOrders.length})</TabsTrigger>
            <TabsTrigger value="expenses">Expenses ({filteredExpenses.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="job-orders">
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
                              placeholder="Search by client or JO #" 
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
                      <TableHead className="w-12"></TableHead>
                      <SortableJobOrderHeader title="JO #" sortKey="jobOrderNumber" />
                      <SortableJobOrderHeader title="Client Name" sortKey="clientName" />
                      <SortableJobOrderHeader title="Description" sortKey="items" />
                      <SortableJobOrderHeader title="Start Date" sortKey="startDate" />
                      <SortableJobOrderHeader title="Due Date" sortKey="dueDate" />
                      <SortableJobOrderHeader title="Total Amount" sortKey="totalAmount" />
                      <SortableJobOrderHeader title="Paid" sortKey="paidAmount" />
                      <SortableJobOrderHeader title="Balance" sortKey="balance" />
                      <SortableJobOrderHeader title="Status" sortKey="status" />
                      <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                  </TableHeader>
                  
                  <TableBody>
                    {filteredJobOrders.length > 0 ? (
                        filteredJobOrders.map((jobOrder) => <JobOrderRow key={jobOrder.id} jobOrder={jobOrder} onDelete={handleDeleteJobOrder} />)
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="h-24 text-center">
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
                        <div className="flex items-center gap-2">
                           <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search expenses..." 
                                    className="pl-10 w-full sm:w-64"
                                    value={expenseSearchQuery}
                                    onChange={(e) => setExpenseSearchQuery(e.target.value)}
                                />
                            </div>
                            <Dialog open={isExpenseDialogOpen} onOpenChange={(isOpen) => {
                                if (!isOpen) {
                                    setEditingExpense(null);
                                    expenseForm.reset();
                                }
                                setIsExpenseDialogOpen(isOpen);
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
