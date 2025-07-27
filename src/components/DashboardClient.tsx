
"use client";

import React, { useState, useMemo } from "react";
import Link from 'next/link';
import { useInvoices } from "@/contexts/InvoiceContext";
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
  TableFooter
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Printer, PlusCircle, TrendingUp, TrendingDown, DollarSign, Pencil, Trash2, Search, ArrowUpDown, Users, ChevronDown, Activity, Hourglass, CheckCircle, CircleX, Wallet } from "lucide-react";
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
import { Expense, ExpenseCategory, Invoice, Payment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";


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

const paymentSchema = z.object({
    amount: z.coerce.number().min(0.01, "Amount must be positive."),
    notes: z.string().optional()
});

type SortableInvoiceKeys = keyof Invoice | 'items';
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

const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
        case 'Completed':
            return <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3"/> Completed</Badge>;
        case 'In Progress':
            return <Badge variant="info"><Activity className="mr-1 h-3 w-3"/> In Progress</Badge>;
        case 'Pending':
            return <Badge variant="warning"><Hourglass className="mr-1 h-3 w-3"/> Pending</Badge>;
        case 'Cancelled':
            return <Badge variant="destructive"><CircleX className="mr-1 h-3 w-3"/> Cancelled</Badge>;
        default:
            return <Badge>{status}</Badge>;
    }
}

const InvoiceRow = ({ invoice }: { invoice: Invoice }) => {
    const { updateInvoice } = useInvoices();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

    const paymentForm = useForm<z.infer<typeof paymentSchema>>({
        resolver: zodResolver(paymentSchema),
        defaultValues: { amount: 0, notes: "" }
    });

    const handleAddPayment = (values: z.infer<typeof paymentSchema>) => {
        const newPayment: Payment = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            amount: values.amount,
            notes: values.notes
        };

        const existingPayments = invoice.payments || [];
        const updatedPayments = [...existingPayments, newPayment];
        const newPaidAmount = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        
        const discountValue = invoice.discount || 0;
        const discountAmount = invoice.discountType === 'percent'
            ? invoice.totalAmount * (discountValue / 100)
            : discountValue;

        const amountDue = invoice.totalAmount - discountAmount;
        const newStatus = newPaidAmount >= amountDue ? 'Completed' : 'In Progress';
        
        const updatedInvoice: Invoice = {
            ...invoice,
            payments: updatedPayments,
            paidAmount: newPaidAmount,
            status: newStatus
        };
        
        updateInvoice(updatedInvoice);
        toast({ title: "Success", description: "Payment added successfully." });
        paymentForm.reset();
        setIsPaymentDialogOpen(false);
    }
    
    const balance = invoice.totalAmount - (invoice.paidAmount || 0) - (invoice.discountType === 'percent' ? invoice.totalAmount * ((invoice.discount || 0) / 100) : (invoice.discount || 0));

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
                    <Badge variant="outline">{invoice.invoiceNumber}</Badge>
                </TableCell>
                <TableCell className="font-medium">{invoice.clientName}</TableCell>
                <TableCell>
                    <ul className="list-disc list-inside text-xs">
                        {invoice.items.slice(0, 2).map(item => (
                            <li key={item.id} className="truncate">{item.description}</li>
                        ))}
                        {invoice.items.length > 2 && <li className="text-muted-foreground">...and {invoice.items.length - 2} more</li>}
                    </ul>
                </TableCell>
                <TableCell>{new Date(invoice.startDate).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                <TableCell className="text-right space-x-2">
                    <Button asChild variant="ghost" size="icon">
                        <Link href={`/edit/${invoice.id}`}>
                            <Pencil className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon">
                        <Link href={`/print/${invoice.id}`} target="_blank">
                            <Printer className="h-4 w-4" />
                        </Link>
                    </Button>
                </TableCell>
            </TableRow>
            {isOpen && (
                <TableRow>
                    <TableCell colSpan={9} className="p-0">
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50">
                           <div>
                                <h4 className="font-semibold mb-2 ml-4">Invoice Items:</h4>
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
                                        {invoice.items.map(item => (
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
                           <div>
                               <div className="flex justify-between items-center mb-2 ml-4">
                                    <h4 className="font-semibold">Payment History:</h4>
                                     <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm" disabled={balance <= 0}>
                                                <PlusCircle className="mr-2 h-4 w-4"/> Add Payment
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <form onSubmit={paymentForm.handleSubmit(handleAddPayment)}>
                                                <DialogHeader>
                                                    <DialogTitle>Add Payment for {invoice.invoiceNumber}</DialogTitle>
                                                    <DialogDescription>
                                                        Record a new payment. The current balance is <span className="font-bold">{formatCurrency(balance)}</span>.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="amount" className="text-right">Amount</Label>
                                                        <Input id="amount" type="number" {...paymentForm.register('amount')} className="col-span-3" placeholder="0.00" />
                                                        {paymentForm.formState.errors.amount && <p className="text-red-500 text-xs col-span-4 text-right">{paymentForm.formState.errors.amount.message}</p>}
                                                    </div>
                                                     <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="notes" className="text-right">Notes</Label>
                                                        <Textarea id="notes" {...paymentForm.register('notes')} className="col-span-3" placeholder="Optional notes for the payment"/>
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button type="button" variant="secondary">Cancel</Button>
                                                    </DialogClose>
                                                    <Button type="submit">Save Payment</Button>
                                                </DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                               </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Notes</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoice.payments && invoice.payments.length > 0 ? (
                                             invoice.payments.map(payment => (
                                                <TableRow key={payment.id}>
                                                    <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                                                    <TableCell>{payment.notes}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center h-24">No payments recorded.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-right font-bold">Total Paid</TableCell>
                                            <TableCell className="text-right font-bold">{formatCurrency(invoice.paidAmount)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-right font-bold">Balance Due</TableCell>
                                            <TableCell className="text-right font-bold text-destructive">{formatCurrency(balance)}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                           </div>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    )
}

export function DashboardClient() {
  const { invoices, expenses, addExpense, updateExpense, deleteExpense } = useInvoices();
  const [timeFilter, setTimeFilter] = useState("today");
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [expenseSearchQuery, setExpenseSearchQuery] = useState("");
  const [invoiceSortConfig, setInvoiceSortConfig] = useState<{ key: SortableInvoiceKeys; direction: 'ascending' | 'descending' } | null>({ key: 'startDate', direction: 'descending' });
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

  const { filteredInvoices, filteredExpenses, totalSales, totalExpenses, netProfit, totalCustomers, dailySales } = useMemo(() => {
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
    
    const todayInterval = { start: startOfToday(), end: endOfToday() };
    const todayInvoices = invoices.filter(invoice => isWithinInterval(parseISO(invoice.startDate), todayInterval));
    const dailySales = todayInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);

    const dateFilteredInvoices = invoices.filter(invoice => isWithinInterval(parseISO(invoice.startDate), interval));
    
    let sortedAndFilteredInvoices = dateFilteredInvoices.filter(invoice => 
      invoice.clientName.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(invoiceSearchQuery.toLowerCase())
    );

    if (invoiceSortConfig !== null) {
        sortedAndFilteredInvoices.sort((a, b) => {
            const aValue = a[invoiceSortConfig.key as keyof Invoice];
            const bValue = b[invoiceSortConfig.key as keyof Invoice];

            if (invoiceSortConfig.key === 'items') {
                const aText = a.items.map(i => i.description).join(', ');
                const bText = b.items.map(i => i.description).join(', ');
                const comparison = aText.localeCompare(bText);
                return invoiceSortConfig.direction === 'ascending' ? comparison : -comparison;
            }

            if (aValue === undefined || bValue === undefined) return 0;

            let comparison = 0;
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                if (invoiceSortConfig.key === 'startDate' || invoiceSortConfig.key === 'dueDate') {
                    comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
                } else {
                    comparison = aValue.localeCompare(bValue);
                }
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            }
            
            return invoiceSortConfig.direction === 'ascending' ? comparison : -comparison;
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


    const totalSales = sortedAndFilteredInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    const totalExpenses = sortedAndFilteredExpenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
    const uniqueClients = new Set(sortedAndFilteredInvoices.map(invoice => invoice.clientName));

    return {
      filteredInvoices: sortedAndFilteredInvoices,
      filteredExpenses: sortedAndFilteredExpenses,
      totalSales,
      totalExpenses,
      netProfit: totalSales - totalExpenses,
      totalCustomers: uniqueClients.size,
      dailySales
    };
  }, [invoices, expenses, timeFilter, invoiceSearchQuery, expenseSearchQuery, invoiceSortConfig, expenseSortConfig]);

  const requestInvoiceSort = (key: SortableInvoiceKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (invoiceSortConfig && invoiceSortConfig.key === key && invoiceSortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setInvoiceSortConfig({ key, direction });
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
  
  const SortableInvoiceHeader = ({ title, sortKey }: { title: string, sortKey: SortableInvoiceKeys }) => (
     <TableHead>
        <Button variant="ghost" onClick={() => requestInvoiceSort(sortKey)}>
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
            title="Daily Sales" 
            value={formatCurrency(dailySales)} 
            icon={TrendingUp} 
            description="Total sales for today"
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
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
            <TabsTrigger value="invoices">Invoices ({filteredInvoices.length})</TabsTrigger>
            <TabsTrigger value="expenses">Expenses ({filteredExpenses.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices">
          <Card>
              <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                          <CardTitle>Invoices</CardTitle>
                          <CardDescription>A list of invoices for the selected period.</CardDescription>
                      </div>
                       <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                              placeholder="Search by client or Invoice #" 
                              className="pl-10 w-full sm:w-64"
                              value={invoiceSearchQuery}
                              onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                          />
                      </div>
                  </div>
              </CardHeader>
              <CardContent>
              <Table>
                  <TableHeader>
                  <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <SortableInvoiceHeader title="Invoice #" sortKey="invoiceNumber" />
                      <SortableInvoiceHeader title="Client Name" sortKey="clientName" />
                      <SortableInvoiceHeader title="Items" sortKey="items" />
                      <SortableInvoiceHeader title="Start Date" sortKey="startDate" />
                      <SortableInvoiceHeader title="Due Date" sortKey="dueDate" />
                      <SortableInvoiceHeader title="Amount" sortKey="totalAmount" />
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                  </TableHeader>
                  
                  <TableBody>
                    {filteredInvoices.length > 0 ? (
                        filteredInvoices.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} />)
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                          No invoices for this period.
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
