
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
import { format, getMonth, getYear, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, startOfToday, endOfToday, eachHourOfInterval, set, startOfMonth, endOfMonth, endOfYear, startOfYear } from "date-fns";
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

const ReportTabContent = React.forwardRef<HTMLDivElement, { title: string, jobOrders: JobOrder[] }>(({ title, jobOrders }, ref) => {
    
    const renderJobOrderTable = (jobOrders: JobOrder[]) => {
        if (jobOrders.length === 0) {
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
                    <TableHead>JO #</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {jobOrders.map((jobOrder) => {
                    const discountValue = jobOrder.discount || 0;
                    const discountAmount = jobOrder.discountType === 'percent'
                        ? jobOrder.totalAmount * (discountValue / 100)
                        : discountValue;
                    const balance = jobOrder.totalAmount - (jobOrder.downpayment || 0) - discountAmount;
                    return (
                        <TableRow key={jobOrder.id}>
                            <TableCell>
                                <Badge variant="outline">{jobOrder.jobOrderNumber}</Badge>
                            </TableCell>
                            <TableCell>
                                {new Date(jobOrder.startDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                                <span className="font-medium">{jobOrder.clientName}</span>
                                {jobOrder.notes && <p className="text-xs text-muted-foreground truncate max-w-xs">{jobOrder.notes}</p>}
                            </TableCell>
                            <TableCell className="text-right">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(jobOrder.totalAmount)}</TableCell>
                            <TableCell className="text-right">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(jobOrder.downpayment || 0)}</TableCell>
                            <TableCell className="text-right font-semibold">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(balance)}</TableCell>
                            <TableCell className="text-center">
                                {getStatusBadge(jobOrder.status)}
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
        <div ref={ref}>
            <Card className="print-area">
                <div className="print-only text-center mb-4">
                    <h1 className="text-2xl font-bold">{title}</h1>
                    <p className="text-sm text-gray-500">As of {new Date().toLocaleDateString()}</p>
                </div>
                <CardHeader className="no-print">
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>A list of job orders for the selected period.</CardDescription>
                </CardHeader>
                <CardContent>
                   {renderJobOrderTable(jobOrders)}
                </CardContent>
            </Card>
        </div>
    )
});
ReportTabContent.displayName = 'ReportTabContent';

export function ReportsClient() {
  const { jobOrders, expenses } = useJobOrders();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortableJobOrderKeys; direction: 'ascending' | 'descending' } | null>({ key: 'startDate', direction: 'descending' });
  const [activeTab, setActiveTab] = useState("overall");

  const overallPrintRef = useRef<HTMLDivElement>(null);
  const todayPrintRef = useRef<HTMLDivElement>(null);
  const weeklyPrintRef = useRef<HTMLDivElement>(null);
  const monthlyPrintRef = useRef<HTMLDivElement>(null);
  const yearlyPrintRef = useRef<HTMLDivElement>(null);

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
    sortedAndFilteredJobOrders,
    todaySales
   } = useMemo(() => {
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const todayJobOrders = jobOrders.filter(jobOrder => {
        const jobOrderDate = parseISO(jobOrder.startDate);
        return jobOrderDate >= todayStart && jobOrderDate <= todayEnd;
    });
    const todaySales = todayJobOrders.reduce((sum, jobOrder) => sum + jobOrder.totalAmount, 0);

    const grandTotalSales = jobOrders.reduce((sum, jobOrder) => sum + jobOrder.totalAmount, 0);
    const totalCollectibles = jobOrders.reduce((sum, jobOrder) => sum + (jobOrder.downpayment || 0), 0);
    
    const totalDiscountAmount = jobOrders.reduce((sum, jobOrder) => {
        const discountValue = jobOrder.discount || 0;
        const discountAmount = jobOrder.discountType === 'percent'
            ? jobOrder.totalAmount * (discountValue / 100)
            : discountValue;
        return sum + discountAmount;
    }, 0);
    
    const totalUnpaid = grandTotalSales - totalCollectibles - totalDiscountAmount;
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
    const cashOnHand = totalCollectibles - totalExpenses;
    
    let filtered = [...jobOrders].filter(jobOrder => 
      jobOrder.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jobOrder.jobOrderNumber.toLowerCase().includes(searchQuery.toLowerCase())
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


    return { grandTotalSales, totalCollectibles, totalUnpaid, totalExpenses, cashOnHand, sortedAndFilteredJobOrders: filtered, todaySales };
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

  const {
    todayJobOrders,
    weeklyJobOrders,
    monthlyJobOrders,
    yearlyJobOrders,
  } = useMemo(() => {
      const now = new Date();
      const todayStart = startOfToday();
      const todayEnd = endOfToday();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const yearStart = startOfYear(now);
      const yearEnd = endOfYear(now);

      const todayJobOrders = jobOrders.filter(jobOrder => {
          const jobOrderDate = parseISO(jobOrder.startDate);
          return jobOrderDate >= todayStart && jobOrderDate <= todayEnd;
      });

      const weeklyJobOrders = jobOrders.filter(jobOrder => {
        const jobOrderDate = parseISO(jobOrder.startDate);
        return jobOrderDate >= weekStart && jobOrderDate <= weekEnd;
      });

      const monthlyJobOrders = jobOrders.filter(jobOrder => {
        const jobOrderDate = parseISO(jobOrder.startDate);
        return jobOrderDate >= monthStart && jobOrderDate <= monthEnd;
      });
      
      const yearlyJobOrders = jobOrders.filter(jobOrder => {
        const jobOrderDate = parseISO(jobOrder.startDate);
        return jobOrderDate >= yearStart && jobOrderDate <= yearEnd;
      });

      return { todayJobOrders, weeklyJobOrders, monthlyJobOrders, yearlyJobOrders };
  }, [jobOrders]);

  const renderJobOrderTable = (jobOrders: JobOrder[]) => {
     if (jobOrders.length === 0) {
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
                <SortableHeader title="JO #" sortKey="jobOrderNumber" />
                <SortableHeader title="Start Date" sortKey="startDate" />
                <SortableHeader title="Client Name" sortKey="clientName" />
                <SortableHeader title="Total Amount" sortKey="totalAmount" />
                <SortableHeader title="Paid" sortKey="downpayment" />
                <TableHead className="text-right">Balance</TableHead>
                <SortableHeader title="Status" sortKey="status" />
            </TableRow>
            </TableHeader>
            <TableBody>
            {jobOrders.map((jobOrder) => {
                const discountValue = jobOrder.discount || 0;
                const discountAmount = jobOrder.discountType === 'percent'
                    ? jobOrder.totalAmount * (discountValue / 100)
                    : discountValue;
                const balance = jobOrder.totalAmount - (jobOrder.downpayment || 0) - discountAmount;
                return (
                    <TableRow key={jobOrder.id}>
                        <TableCell>
                            <Badge variant="outline">{jobOrder.jobOrderNumber}</Badge>
                        </TableCell>
                        <TableCell>
                            {new Date(jobOrder.startDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                            <span className="font-medium">{jobOrder.clientName}</span>
                            {jobOrder.notes && <p className="text-xs text-muted-foreground truncate max-w-xs">{jobOrder.notes}</p>}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(jobOrder.totalAmount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(jobOrder.downpayment || 0)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(balance)}</TableCell>
                        <TableCell className="text-center">
                            {getStatusBadge(jobOrder.status)}
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
             <StatCard title="Today's Sales" value={formatCurrency(todaySales)} icon={TrendingUp} description="Total revenue from today's job orders"/>
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
            <TabsContent value="overall" className="mt-4">
                <div ref={overallPrintRef}>
                    <Card className="print-area">
                        <div className="print-only text-center mb-4">
                            <h1 className="text-2xl font-bold">Overall Job Orders Report</h1>
                            <p className="text-sm text-gray-500">As of {new Date().toLocaleDateString()}</p>
                        </div>
                        <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 no-print">
                            <div>
                                <CardTitle>All Job Orders</CardTitle>
                                <CardDescription>A detailed list of all job orders and their payment status.</CardDescription>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by client or JO #" 
                                    className="pl-10 w-full sm:w-64"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {renderJobOrderTable(sortedAndFilteredJobOrders)}
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            <TabsContent value="today" className="mt-4">
                <ReportTabContent ref={todayPrintRef} title="Today's Sales Report" jobOrders={todayJobOrders} />
            </TabsContent>
            <TabsContent value="weekly" className="mt-4">
                <ReportTabContent ref={weeklyPrintRef} title="Weekly Sales Report" jobOrders={weeklyJobOrders} />
            </TabsContent>
            <TabsContent value="monthly" className="mt-4">
                 <ReportTabContent ref={monthlyPrintRef} title="Monthly Sales Report" jobOrders={monthlyJobOrders} />
            </TabsContent>
            <TabsContent value="yearly" className="mt-4">
                 <ReportTabContent ref={yearlyPrintRef} title="Yearly Sales Report" jobOrders={yearlyJobOrders} />
            </TabsContent>
        </Tabs>
    </div>
  );
}
