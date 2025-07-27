
"use client";

import React, { useMemo, useState, useRef } from "react";
import { useInvoices } from "@/contexts/InvoiceContext";
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
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Banknote, AlertCircle, CheckCircle, Search, ArrowUpDown, CircleX, Hourglass, Activity, Printer } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { format, getMonth, getYear, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, startOfToday, endOfToday, eachHourOfInterval, set, startOfMonth, endOfMonth, endOfYear, startOfYear } from 'date-fns';
import { Invoice } from "@/lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useReactToPrint } from "react-to-print";

type SortableInvoiceKeys = keyof Invoice;

const StatCard = ({ title, value, icon: Icon, description }: { title: string, value: string, icon: React.ElementType, description: string }) => (
    <Card className="no-print">
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

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--chart-1))",
  },
  collectibles: {
    label: "Collectibles",
    color: "hsl(var(--chart-2))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

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

export function ReportsClient() {
  const { invoices, expenses } = useInvoices();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortableInvoiceKeys; direction: 'ascending' | 'descending' } | null>({ key: 'startDate', direction: 'descending' });
  const [activeTab, setActiveTab] = useState("overall");

  const overallPrintRef = useRef(null);
  const todayPrintRef = useRef(null);
  const weeklyPrintRef = useRef(null);
  const monthlyPrintRef = useRef(null);
  const yearlyPrintRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => {
        switch (activeTab) {
            case 'today': return todayPrintRef.current;
            case 'weekly': return weeklyPrintRef.current;
            case 'monthly': return monthlyPrintRef.current;
            case 'yearly': return yearlyPrintRef.current;
            default: return overallPrintRef.current;
        }
    },
  });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const { 
    grandTotalSales,
    totalCollectibles,
    totalUnpaid,
    cashOnHand,
    sortedAndFilteredInvoices,
    todaySales
   } = useMemo(() => {
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const todayInvoices = invoices.filter(invoice => {
        const invoiceDate = parseISO(invoice.startDate);
        return invoiceDate >= todayStart && invoiceDate <= todayEnd;
    });
    const todaySales = todayInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);

    const grandTotalSales = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    const totalCollectibles = invoices.reduce((sum, invoice) => sum + (invoice.downpayment || 0), 0);
    
    const totalDiscountAmount = invoices.reduce((sum, invoice) => {
        const discountValue = invoice.discount || 0;
        const discountAmount = invoice.discountType === 'percent'
            ? invoice.totalAmount * (discountValue / 100)
            : discountValue;
        return sum + discountAmount;
    }, 0);
    
    const totalUnpaid = grandTotalSales - totalCollectibles - totalDiscountAmount;
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
    const cashOnHand = totalCollectibles - totalExpenses;
    
    let filtered = [...invoices].filter(invoice => 
      invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortConfig !== null) {
        filtered.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === undefined || bValue === undefined) return 0;

            let comparison = 0;
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                 if (sortConfig.key === 'startDate' || sortConfig.key === 'dueDate' || sortConfig.key === 'chequeDate') {
                    const dateA = aValue ? new Date(aValue).getTime() : 0;
                    const dateB = bValue ? new Date(bValue).getTime() : 0;
                    comparison = dateA - dateB;
                } else {
                    comparison = aValue.localeCompare(bValue);
                }
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            }
            
            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });
    }


    return { grandTotalSales, totalCollectibles, totalUnpaid, totalExpenses, cashOnHand, sortedAndFilteredInvoices: filtered, todaySales };
  }, [invoices, expenses, searchQuery, sortConfig]);

  const requestSort = (key: SortableInvoiceKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  }

  const SortableHeader = ({ title, sortKey }: { title: string, sortKey: SortableInvoiceKeys }) => (
     <TableHead>
        <Button variant="ghost" onClick={() => requestSort(sortKey)} className="no-print">
            {title}
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
        <span className="print-only font-bold text-gray-700 p-1 h-auto">{title}</span>
    </TableHead>
  )

  const todayData = useMemo(() => {
    const now = new Date();
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const hoursInDay = eachHourOfInterval({ start: todayStart, end: todayEnd });
    
    const data = hoursInDay.map(hour => ({
        date: format(hour, 'ha'),
        sales: 0,
        collectibles: 0,
        expenses: 0
    }));

    invoices.forEach(invoice => {
        const invoiceDate = parseISO(invoice.startDate);
        if (invoiceDate >= todayStart && invoiceDate <= todayEnd) {
            const hourIndex = invoiceDate.getHours();
            if(hourIndex > -1 && hourIndex < 24) {
                data[hourIndex].sales += invoice.totalAmount;
                data[hourIndex].collectibles += invoice.downpayment || 0;
            }
        }
    });

    expenses.forEach(expense => {
        const expenseDate = parseISO(expense.date);
        if (expenseDate >= todayStart && expenseDate <= todayEnd) {
            const hourIndex = expenseDate.getHours();
            if(hourIndex > -1 && hourIndex < 24) {
                data[hourIndex].expenses += expense.totalAmount;
            }
        }
    });
    
    return data;
  }, [invoices, expenses]);

  const weeklyData = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const data = daysInWeek.map(day => ({
        date: format(day, 'EEE'),
        sales: 0,
        collectibles: 0,
        expenses: 0
    }));

    invoices.forEach(invoice => {
        const invoiceDate = parseISO(invoice.startDate);
        if (invoiceDate >= weekStart && invoiceDate <= weekEnd) {
            const dayIndex = daysInWeek.findIndex(day => format(day, 'yyyy-MM-dd') === format(invoiceDate, 'yyyy-MM-dd'));
            if(dayIndex > -1) {
                data[dayIndex].sales += invoice.totalAmount;
                data[dayIndex].collectibles += invoice.downpayment || 0;
            }
        }
    });

    expenses.forEach(expense => {
        const expenseDate = parseISO(expense.date);
        if (expenseDate >= weekStart && expenseDate <= weekEnd) {
            const dayIndex = daysInWeek.findIndex(day => format(day, 'yyyy-MM-dd') === format(expenseDate, 'yyyy-MM-dd'));
            if(dayIndex > -1) {
                data[dayIndex].expenses += expense.totalAmount;
            }
        }
    });
    
    return data;
  }, [invoices, expenses]);

  const monthlyData = useMemo(() => {
    const data: { [key: string]: { month: string, sales: number; collectibles: number; expenses: number } } = {};

    invoices.forEach(invoice => {
        const date = parseISO(invoice.startDate);
        const monthKey = format(date, 'yyyy-MM');
        if (!data[monthKey]) {
            data[monthKey] = { month: format(date, 'MMM yyyy'), sales: 0, collectibles: 0, expenses: 0 };
        }
        data[monthKey].sales += invoice.totalAmount;
        data[monthKey].collectibles += invoice.downpayment || 0;
    });

    expenses.forEach(expense => {
        const date = parseISO(expense.date);
        const monthKey = format(date, 'yyyy-MM');
        if (!data[monthKey]) {
            data[monthKey] = { month: format(date, 'MMM yyyy'), sales: 0, collectibles: 0, expenses: 0 };
        }
        data[monthKey].expenses += expense.totalAmount;
    });

    return Object.values(data).sort((a,b) => a.month.localeCompare(b.month));
  }, [invoices, expenses]);

  const yearlyData = useMemo(() => {
    const data: { [key: string]: { year: string, sales: number; collectibles: number; expenses: number } } = {};
    
    invoices.forEach(invoice => {
        const year = getYear(parseISO(invoice.startDate)).toString();
        if(!data[year]) {
            data[year] = { year, sales: 0, collectibles: 0, expenses: 0 };
        }
        data[year].sales += invoice.totalAmount;
        data[year].collectibles += invoice.downpayment || 0;
    });

    expenses.forEach(expense => {
        const year = getYear(parseISO(expense.date)).toString();
        if(!data[year]) {
            data[year] = { year, sales: 0, collectibles: 0, expenses: 0 };
        }
        data[year].expenses += expense.totalAmount;
    });

    return Object.values(data).sort((a,b) => a.year.localeCompare(b.year));
  }, [invoices, expenses]);

  const {
    todayInvoices
  } = useMemo(() => {
      const now = new Date();
      const todayStart = startOfToday();
      const todayEnd = endOfToday();

      const todayInvoices = invoices.filter(invoice => {
          const invoiceDate = parseISO(invoice.startDate);
          return invoiceDate >= todayStart && invoiceDate <= todayEnd;
      });
      return { todayInvoices };
  }, [invoices]);

  const renderPrintHeader = (title: string) => (
    <div className="print-only text-center mb-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-gray-500">As of {new Date().toLocaleDateString()}</p>
    </div>
  );

  const renderInvoiceTable = (invoices: Invoice[]) => {
     if (invoices.length === 0) {
        return (
            <Table>
                <TableBody>
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                            No sales data available for this period.
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        );
    }
    
    return (
        <Table>
            <TableHeader>
            <TableRow>
                <SortableHeader title="Invoice #" sortKey="invoiceNumber" />
                <SortableHeader title="Start Date" sortKey="startDate" />
                <SortableHeader title="Client Name" sortKey="clientName" />
                <SortableHeader title="Total Amount" sortKey="totalAmount" />
                <SortableHeader title="Paid" sortKey="downpayment" />
                <TableHead className="text-right">Balance</TableHead>
                <SortableHeader title="Status" sortKey="status" />
            </TableRow>
            </TableHeader>
            <TableBody>
            {invoices.map((invoice) => {
                const discountValue = invoice.discount || 0;
                const discountAmount = invoice.discountType === 'percent'
                    ? invoice.totalAmount * (discountValue / 100)
                    : discountValue;
                const balance = invoice.totalAmount - (invoice.downpayment || 0) - discountAmount;
                return (
                    <TableRow key={invoice.id}>
                        <TableCell>
                            <Badge variant="outline">{invoice.invoiceNumber}</Badge>
                        </TableCell>
                        <TableCell>
                            {new Date(invoice.startDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                            <span className="font-medium">{invoice.clientName}</span>
                            {invoice.notes && <p className="text-xs text-muted-foreground truncate max-w-xs">{invoice.notes}</p>}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.totalAmount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.downpayment || 0)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(balance)}</TableCell>
                        <TableCell className="text-center">
                            {getStatusBadge(invoice.status)}
                        </TableCell>
                    </TableRow>
                );
                })
            }
            </TableBody>
        </Table>
    );
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <StatCard title="Today's Sales" value={formatCurrency(todaySales)} icon={TrendingUp} description="Total revenue from today's invoices"/>
             <StatCard title="Total Collectibles" value={formatCurrency(totalCollectibles)} icon={Banknote} description="Total amount paid by clients"/>
             <StatCard title="Total Unpaid" value={formatCurrency(totalUnpaid)} icon={AlertCircle} description="Total outstanding balance"/>
             <StatCard title="Cash On Hand" value={formatCurrency(cashOnHand)} icon={DollarSign} description="Collectibles minus expenses"/>
        </div>
        
        <Tabs defaultValue="overall" onValueChange={setActiveTab}>
            <div className="flex justify-between items-center no-print">
                <TabsList>
                    <TabsTrigger value="overall">Overall</TabsTrigger>
                    <TabsTrigger value="today">Today</TabsTrigger>
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="yearly">Yearly</TabsTrigger>
                </TabsList>
                <Button onClick={handlePrint} variant="outline">
                    <Printer className="mr-2 h-4 w-4" />
                    Print Report
                </Button>
            </div>
            <TabsContent value="overall" className="mt-4" ref={overallPrintRef}>
                <Card className="print-area">
                    {renderPrintHeader("Overall Invoices Report")}
                    <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 no-print">
                        <div>
                            <CardTitle>All Invoices</CardTitle>
                            <CardDescription>A detailed list of all invoices and their payment status.</CardDescription>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by client or Invoice #" 
                                className="pl-10 w-full sm:w-64"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {renderInvoiceTable(sortedAndFilteredInvoices)}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="today" className="mt-4" ref={todayPrintRef}>
                 <Card className="print-area">
                    {renderPrintHeader("Today's Sales Report")}
                    <CardHeader className="no-print">
                        <CardTitle>Today's Sales</CardTitle>
                        <CardDescription>A list of invoices created today.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {renderInvoiceTable(todayInvoices)}
                    </CardContent>
                 </Card>
            </TabsContent>
            <TabsContent value="weekly" className="mt-4" ref={weeklyPrintRef}>
                 <Card className="print-area">
                    {renderPrintHeader("Weekly Sales Report")}
                    <CardHeader className="no-print">
                        <CardTitle>Weekly Sales Report</CardTitle>
                        <CardDescription>A breakdown of sales, collectibles, and expenses for the current week.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                             <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={weeklyData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                                    <YAxis tickFormatter={(value) => `₱${value / 1000}k`} />
                                    <Tooltip content={<ChartTooltipContent formatter={formatCurrency} />} />
                                    <Legend />
                                    <Bar dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="collectibles" fill="var(--color-collectibles)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                 </Card>
            </TabsContent>
            <TabsContent value="monthly" className="mt-4" ref={monthlyPrintRef}>
                 <Card className="print-area">
                    {renderPrintHeader("Monthly Sales Report")}
                    <CardHeader className="no-print">
                        <CardTitle>Monthly Sales Report</CardTitle>
                        <CardDescription>A breakdown of sales, collectibles, and expenses by month.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                             <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                                    <YAxis tickFormatter={(value) => `₱${value / 1000}k`} />
                                    <Tooltip content={<ChartTooltipContent formatter={formatCurrency} />} />
                                    <Legend />
                                    <Bar dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="collectibles" fill="var(--color-collectibles)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                 </Card>
            </TabsContent>
            <TabsContent value="yearly" className="mt-4" ref={yearlyPrintRef}>
                 <Card className="print-area">
                    {renderPrintHeader("Yearly Sales Report")}
                    <CardHeader className="no-print">
                        <CardTitle>Yearly Sales Report</CardTitle>
                        <CardDescription>A breakdown of sales, collectibles, and expenses by year.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={yearlyData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="year" tickLine={false} tickMargin={10} axisLine={false} />
                                    <YAxis tickFormatter={(value) => `₱${value / 1000}k`} />
                                    <Tooltip content={<ChartTooltipContent formatter={formatCurrency} />} />
                                    <Legend />
                                    <Bar dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="collectibles" fill="var(--color-collectibles)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                 </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
