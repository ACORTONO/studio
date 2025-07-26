
"use client";

import React, { useMemo, useState, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Banknote, AlertCircle, CheckCircle, Search, ArrowUpDown, CircleX, Hourglass, Activity, Printer } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { format, getMonth, getYear, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, startOfToday, endOfToday, eachHourOfInterval, set } from 'date-fns';
import { JobOrder } from "@/lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useReactToPrint } from "react-to-print";

type SortableJobOrderKeys = keyof JobOrder;

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

const getStatusBadge = (status: JobOrder['status']) => {
    switch (status) {
        case 'Completed':
            return <Badge className="bg-green-600/80 text-white"><CheckCircle className="mr-1 h-3 w-3"/> Completed</Badge>;
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
  const { jobOrders, expenses } = useJobOrders();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortableJobOrderKeys; direction: 'ascending' | 'descending' } | null>({ key: 'startDate', direction: 'descending' });
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
    sortedAndFilteredJobOrders
   } = useMemo(() => {
    const grandTotalSales = jobOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalCollectibles = jobOrders.reduce((sum, order) => sum + (order.downpayment || 0), 0);
    
    const totalDiscountAmount = jobOrders.reduce((sum, order) => {
        const discountValue = order.discount || 0;
        const discountAmount = order.discountType === 'percent'
            ? order.totalAmount * (discountValue / 100)
            : discountValue;
        return sum + discountAmount;
    }, 0);
    
    const totalUnpaid = grandTotalSales - totalCollectibles - totalDiscountAmount;
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
    const cashOnHand = totalCollectibles - totalExpenses;
    
    let filtered = [...jobOrders].filter(order => 
      order.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.jobOrderNumber.toLowerCase().includes(searchQuery.toLowerCase())
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


    return { grandTotalSales, totalCollectibles, totalUnpaid, totalExpenses, cashOnHand, sortedAndFilteredJobOrders: filtered };
  }, [jobOrders, expenses, searchQuery, sortConfig]);

  const requestSort = (key: SortableJobOrderKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  }

  const SortableHeader = ({ title, sortKey }: { title: string, sortKey: SortableJobOrderKeys }) => (
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

    jobOrders.forEach(order => {
        const orderDate = parseISO(order.startDate);
        if (orderDate >= todayStart && orderDate <= todayEnd) {
            const hourIndex = orderDate.getHours();
            if(hourIndex > -1 && hourIndex < 24) {
                data[hourIndex].sales += order.totalAmount;
                data[hourIndex].collectibles += order.downpayment || 0;
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
  }, [jobOrders, expenses]);

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

    jobOrders.forEach(order => {
        const orderDate = parseISO(order.startDate);
        if (orderDate >= weekStart && orderDate <= weekEnd) {
            const dayIndex = daysInWeek.findIndex(day => format(day, 'yyyy-MM-dd') === format(orderDate, 'yyyy-MM-dd'));
            if(dayIndex > -1) {
                data[dayIndex].sales += order.totalAmount;
                data[dayIndex].collectibles += order.downpayment || 0;
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
  }, [jobOrders, expenses]);

  const monthlyData = useMemo(() => {
    const data: { [key: string]: { month: string, sales: number; collectibles: number; expenses: number } } = {};

    jobOrders.forEach(order => {
        const date = parseISO(order.startDate);
        const monthKey = format(date, 'yyyy-MM');
        if (!data[monthKey]) {
            data[monthKey] = { month: format(date, 'MMM yyyy'), sales: 0, collectibles: 0, expenses: 0 };
        }
        data[monthKey].sales += order.totalAmount;
        data[monthKey].collectibles += order.downpayment || 0;
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
  }, [jobOrders, expenses]);

  const yearlyData = useMemo(() => {
    const data: { [key: string]: { year: string, sales: number; collectibles: number; expenses: number } } = {};
    
    jobOrders.forEach(order => {
        const year = getYear(parseISO(order.startDate)).toString();
        if(!data[year]) {
            data[year] = { year, sales: 0, collectibles: 0, expenses: 0 };
        }
        data[year].sales += order.totalAmount;
        data[year].collectibles += order.downpayment || 0;
    });

    expenses.forEach(expense => {
        const year = getYear(parseISO(expense.date)).toString();
        if(!data[year]) {
            data[year] = { year, sales: 0, collectibles: 0, expenses: 0 };
        }
        data[year].expenses += expense.totalAmount;
    });

    return Object.values(data).sort((a,b) => a.year.localeCompare(b.year));
  }, [jobOrders, expenses]);

  const renderPrintHeader = (title: string) => (
    <div className="print-only text-center mb-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-gray-500">As of {new Date().toLocaleDateString()}</p>
    </div>
  );

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <StatCard title="Total Sales" value={formatCurrency(grandTotalSales)} icon={TrendingUp} description="Total revenue from all job orders"/>
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
                    {renderPrintHeader("Overall Job Orders Report")}
                    <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 no-print">
                        <div>
                            <CardTitle>All Job Orders</CardTitle>
                            <CardDescription>A detailed list of all job orders and their payment status.</CardDescription>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by client or J.O. #" 
                                className="pl-10 w-full sm:w-64"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <SortableHeader title="Job Order #" sortKey="jobOrderNumber" />
                            <SortableHeader title="Start Date" sortKey="startDate" />
                            <SortableHeader title="Client Name" sortKey="clientName" />
                            <SortableHeader title="Total Amount" sortKey="totalAmount" />
                            <SortableHeader title="Paid" sortKey="downpayment" />
                            <TableHead className="text-right">Balance</TableHead>
                            <SortableHeader title="Status" sortKey="status" />
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {sortedAndFilteredJobOrders.length > 0 ? (
                            sortedAndFilteredJobOrders.map((order) => {
                            const discountValue = order.discount || 0;
                            const discountAmount = order.discountType === 'percent'
                                ? order.totalAmount * (discountValue / 100)
                                : discountValue;
                            const balance = order.totalAmount - (order.downpayment || 0) - discountAmount;
                            return (
                                <TableRow key={order.id}>
                                    <TableCell>
                                        <Badge variant="outline">{order.jobOrderNumber}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(order.startDate).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium">{order.clientName}</span>
                                        {order.notes && <p className="text-xs text-muted-foreground truncate max-w-xs">{order.notes}</p>}
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(order.totalAmount)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(order.downpayment || 0)}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(balance)}</TableCell>
                                    <TableCell className="text-center">
                                        {getStatusBadge(order.status)}
                                    </TableCell>
                                </TableRow>
                            );
                            })
                        ) : (
                            <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                                No sales data available. Create a job order to see reports.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="today" className="mt-4" ref={todayPrintRef}>
                 <Card className="print-area">
                    {renderPrintHeader("Today's Sales Report")}
                    <CardHeader className="no-print">
                        <CardTitle>Today's Sales Report</CardTitle>
                        <CardDescription>A breakdown of sales, collectibles, and expenses for today.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                             <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={todayData}>
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
