
"use client";

import React, { useMemo, useState } from "react";
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
import { DollarSign, TrendingUp, Banknote, AlertCircle, CheckCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { format, getMonth, getYear, parseISO } from 'date-fns';

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

export function ReportsClient() {
  const { jobOrders, expenses } = useJobOrders();
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const { 
    grandTotalSales,
    totalCollectibles,
    totalUnpaid,
    cashOnHand,
    sortedJobOrders
   } = useMemo(() => {
    const grandTotalSales = jobOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalCollectibles = jobOrders.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
    const totalUnpaid = grandTotalSales - totalCollectibles;
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
    const cashOnHand = totalCollectibles - totalExpenses;
    
    const sortedJobOrders = [...jobOrders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { grandTotalSales, totalCollectibles, totalUnpaid, totalExpenses, cashOnHand, sortedJobOrders };
  }, [jobOrders, expenses]);

  const monthlyData = useMemo(() => {
    const data: { [key: string]: { month: string, sales: number; collectibles: number; expenses: number } } = {};

    jobOrders.forEach(order => {
        const date = parseISO(order.date);
        const monthKey = format(date, 'yyyy-MM');
        if (!data[monthKey]) {
            data[monthKey] = { month: format(date, 'MMM yyyy'), sales: 0, collectibles: 0, expenses: 0 };
        }
        data[monthKey].sales += order.totalAmount;
        data[monthKey].collectibles += order.paidAmount || 0;
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
        const year = getYear(parseISO(order.date)).toString();
        if(!data[year]) {
            data[year] = { year, sales: 0, collectibles: 0, expenses: 0 };
        }
        data[year].sales += order.totalAmount;
        data[year].collectibles += order.paidAmount || 0;
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

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <StatCard title="Total Sales" value={formatCurrency(grandTotalSales)} icon={TrendingUp} description="Total revenue from all job orders"/>
             <StatCard title="Total Collectibles" value={formatCurrency(totalCollectibles)} icon={Banknote} description="Total amount paid by clients"/>
             <StatCard title="Total Unpaid" value={formatCurrency(totalUnpaid)} icon={AlertCircle} description="Total outstanding balance"/>
             <StatCard title="Cash On Hand" value={formatCurrency(cashOnHand)} icon={DollarSign} description="Collectibles minus expenses"/>
        </div>
        
        <Tabs defaultValue="overall">
            <TabsList>
                <TabsTrigger value="overall">Overall</TabsTrigger>
                <TabsTrigger value="monthly">Monthly Sales</TabsTrigger>
                <TabsTrigger value="yearly">Yearly Sales</TabsTrigger>
            </TabsList>
            <TabsContent value="overall" className="mt-4">
                <Card>
                    <CardHeader>
                    <CardTitle>All Job Orders</CardTitle>
                    <CardDescription>A detailed list of all job orders and their payment status.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Job Order #</TableHead>
                            <TableHead>Client Name</TableHead>
                            <TableHead className="text-right">Total Amount</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {sortedJobOrders.length > 0 ? (
                            sortedJobOrders.map((order) => {
                            const balance = order.totalAmount - (order.paidAmount || 0);
                            const isPaid = balance <= 0;
                            return (
                                <TableRow key={order.id}>
                                    <TableCell>
                                        <Badge variant="outline">{order.jobOrderNumber}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium">{order.clientName}</span>
                                        {order.notes && <p className="text-xs text-muted-foreground truncate max-w-xs">{order.notes}</p>}
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(order.totalAmount)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(order.paidAmount || 0)}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(balance)}</TableCell>
                                    <TableCell className="text-center">
                                        {isPaid ? (
                                            <Badge className="bg-green-600/80 text-white">
                                                <CheckCircle className="mr-1 h-3 w-3"/> Paid
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive">
                                                <AlertCircle className="mr-1 h-3 w-3"/> Unpaid
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                            })
                        ) : (
                            <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No sales data available. Create a job order to see reports.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="monthly" className="mt-4">
                 <Card>
                    <CardHeader>
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
            <TabsContent value="yearly" className="mt-4">
                 <Card>
                    <CardHeader>
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

    