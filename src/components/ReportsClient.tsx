
"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
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
import { DollarSign, TrendingUp, TrendingDown, Banknote, AlertCircle, CheckCircle, Search, ArrowUpDown, CircleX, Hourglass, FileDown, Wallet } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { format, parseISO, startOfWeek, endOfWeek, startOfToday, endOfToday, startOfMonth, endOfMonth, endOfYear, startOfYear } from "date-fns";
import { JobOrder } from "@/lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { cn } from "@/lib/utils";

type SortableJobOrderKeys = keyof JobOrder | 'balance';

export const getStatusBadge = (status: JobOrder['status'], items: JobOrder['items'] = []) => {
    
    const itemStatusCounts = items.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
    }, {} as Record<JobOrder['items'][0]['status'], number>);

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

const StatCard = ({ title, value, icon: Icon, description, className }: { title: string, value: string, icon: React.ElementType, description: string, className?: string }) => (
    <Card className={cn("text-white", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white">{title}</CardTitle>
        <Icon className="h-4 w-4 text-white/80" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        <p className="text-xs text-white/80">{description}</p>
      </CardContent>
    </Card>
);

export function ReportsClient() {
  const { jobOrders, expenses } = useJobOrders();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortableJobOrderKeys; direction: 'ascending' | 'descending' } | null>({ key: 'startDate', direction: 'descending' });
  const [activeTab, setActiveTab] = useState("today");
  const router = useRouter();


  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const { 
    totalCollectibles,
    totalUnpaid,
    cashOnHand,
    sortedAndFilteredJobOrders,
    todaySales,
    todayJobOrders,
    weeklyJobOrders,
    monthlyJobOrders,
    yearlyJobOrders,
    totalExpenses,
    netProfit,
    totalPaid,
   } = useMemo(() => {
    const now = new Date();
    const grandTotalSales = jobOrders.reduce((sum, jobOrder) => sum + jobOrder.totalAmount, 0);
    const totalPaid = jobOrders.reduce((sum, jobOrder) => sum + (jobOrder.paidAmount || 0), 0);
    
    const totalDiscountAmount = jobOrders.reduce((sum, jobOrder) => {
        const discountValue = jobOrder.discount || 0;
        const discountAmount = jobOrder.discountType === 'percent'
            ? jobOrder.totalAmount * (discountValue / 100)
            : discountValue;
        return sum + discountAmount;
    }, 0);
    
    const totalUnpaid = grandTotalSales - totalPaid - totalDiscountAmount;
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
    const cashOnHand = totalPaid - totalExpenses;
    const netProfit = totalPaid - totalExpenses;
    
    let filtered = [...jobOrders].filter(jobOrder => 
      jobOrder.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jobOrder.jobOrderNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortConfig !== null) {
        filtered.sort((a, b) => {
            if (sortConfig.key === 'balance') {
                 const aDiscountValue = a.discount || 0;
                 const aDiscountAmount = a.discountType === 'percent' ? a.totalAmount * (aDiscountValue / 100) : aDiscountValue;
                 const aBalance = a.totalAmount - (a.paidAmount || 0) - aDiscountAmount;
                 const bDiscountValue = b.discount || 0;
                 const bDiscountAmount = b.discountType === 'percent' ? b.totalAmount * (bDiscountValue / 100) : bDiscountValue;
                 const bBalance = b.totalAmount - (b.paidAmount || 0) - bDiscountAmount;
                 return sortConfig.direction === 'ascending' ? aBalance - bBalance : bBalance - aBalance;
            }

            const aValue = a[sortConfig.key as keyof JobOrder];
            const bValue = b[sortConfig.key as keyof JobOrder];

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
      const todaySalesValue = todayJobOrders.reduce((sum, jobOrder) => sum + jobOrder.totalAmount, 0);

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


    return { totalCollectibles: totalPaid, totalUnpaid, cashOnHand, sortedAndFilteredJobOrders: filtered, todaySales: todaySalesValue, todayJobOrders, weeklyJobOrders, monthlyJobOrders, yearlyJobOrders, totalExpenses, netProfit, totalPaid };
  }, [jobOrders, expenses, searchQuery, sortConfig]);

  const requestSort = (key: SortableJobOrderKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  }

  const handlePrintPreview = (data: JobOrder[], title: string) => {
    localStorage.setItem('reportData', JSON.stringify({ data, title }));
    
    const reportTotalSales = data.reduce((sum, jo) => sum + jo.totalAmount, 0);
    const reportTotalPaid = data.reduce((sum, jo) => sum + (jo.paidAmount || 0), 0);
    const reportDiscount = data.reduce((sum, jo) => {
         const discountValue = jo.discount || 0;
         const discountAmount = jo.discountType === 'percent' ? jo.totalAmount * (discountValue / 100) : discountValue;
         return sum + discountAmount;
    }, 0);
    const reportTotalUnpaid = reportTotalSales - reportTotalPaid - reportDiscount;

    const summary = {
        totalSales: reportTotalSales,
        totalCollectibles: reportTotalUnpaid,
        totalExpenses,
        netProfit,
        cashOnHand: reportTotalPaid,
    };
    localStorage.setItem('reportSummary', JSON.stringify(summary));

    router.push('/reports/print');
  }

  const SortableHeader = ({ title, sortKey }: { title: string, sortKey: SortableJobOrderKeys }) => (
    <TableHead className="text-center p-2">
      <Button variant="ghost" onClick={() => requestSort(sortKey)} className="justify-center w-full">
        {title}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );
  
  const renderJobOrderTable = (title: string, data: JobOrder[]) => {
    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 no-print">
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>A detailed list of all job orders and their payment status.</CardDescription>
                </div>
                 <div className="flex items-center gap-2">
                    { activeTab === "today" && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by client or JO #" 
                                className="pl-10 w-full sm:w-64"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                     )}
                     <Button onClick={() => handlePrintPreview(data, title)} variant="outline" disabled={data.length === 0}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Print / Save Report
                    </Button>
                 </div>
            </CardHeader>

            <CardContent className="pt-6">
                <Table className="text-xs">
                    <TableHeader>
                    <TableRow>
                        <SortableHeader title="Start Date" sortKey="startDate" />
                        <SortableHeader title="JO #" sortKey="jobOrderNumber" />
                        <SortableHeader title="Client Name" sortKey="clientName" />
                        <SortableHeader title="Description" sortKey="items" />
                        <SortableHeader title="Total Amount" sortKey="totalAmount" />
                        <SortableHeader title="Paid" sortKey="paidAmount" />
                        <SortableHeader title="Balance" sortKey="balance" />
                        <SortableHeader title="Status" sortKey="status" />
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {data.map((jobOrder) => {
                         const discountValue = jobOrder.discount || 0;
                         const discountAmount = jobOrder.discountType === 'percent'
                             ? jobOrder.totalAmount * (discountValue / 100)
                             : discountValue;
                         const balance = jobOrder.totalAmount - (jobOrder.paidAmount || 0) - discountAmount;
                        return (
                            <TableRow key={jobOrder.id}>
                                <TableCell className="text-center p-2">
                                    {new Date(jobOrder.startDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-center p-2">
                                    <Badge variant="outline">{jobOrder.jobOrderNumber}</Badge>
                                </TableCell>
                                <TableCell className="text-center p-2">
                                    <span className="font-medium">{jobOrder.clientName}</span>
                                </TableCell>
                                <TableCell className="p-2">
                                    <ul className="list-disc list-inside text-xs whitespace-normal">
                                        {jobOrder.items.map(item => (
                                            <li key={item.id} className="truncate">{item.description}</li>
                                        ))}
                                    </ul>
                                </TableCell>
                                <TableCell className="text-center p-2">{formatCurrency(jobOrder.totalAmount)}</TableCell>
                                <TableCell className="text-center p-2">{formatCurrency(jobOrder.paidAmount || 0)}</TableCell>
                                <TableCell className="text-center font-semibold p-2">{formatCurrency(balance)}</TableCell>
                                <TableCell className="text-center p-2">
                                    {getStatusBadge(jobOrder.status, jobOrder.items)}
                                </TableCell>
                            </TableRow>
                        );
                        })
                    }
                    {data.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">
                                No job orders found for this period.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
  }

  const renderActiveTabContent = () => {
    let data;
    let title;
    switch (activeTab) {
        case 'today':
            data = todayJobOrders;
            title = "Today's Sales";
            break;
        case 'weekly':
            data = weeklyJobOrders;
            title = "This Week's Sales";
            break;
        case 'monthly':
            data = monthlyJobOrders;
            title = "This Month's Sales";
            break;
        case 'yearly':
            data = yearlyJobOrders;
            title = "This Year's Sales";
            break;
        default:
            data = todayJobOrders;
            title = "Today's Sales";
    }
    
    return renderJobOrderTable(title, data);
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 no-print">
             <StatCard title="Today's Sales" value={formatCurrency(todaySales)} icon={TrendingUp} description="Total revenue from today's job orders" className="bg-green-600 border-green-500"/>
             <StatCard title="Total Expenses" value={formatCurrency(totalExpenses)} icon={TrendingDown} description="Total operational costs" className="bg-red-600 border-red-500" />
             <StatCard title="Cash on Hand" value={formatCurrency(totalPaid)} icon={Banknote} description="Total amount paid by clients" className="bg-blue-600 border-blue-500"/>
             <StatCard title="Collectibles" value={formatCurrency(totalUnpaid)} icon={AlertCircle} description="Total outstanding balance" className="bg-yellow-500 border-yellow-400"/>
             <StatCard title="Net Profit" value={formatCurrency(netProfit)} icon={DollarSign} description="Cash on Hand - Expenses" className="bg-purple-600 border-purple-500"/>
        </div>
        
        <div className="printable-area">
            <Tabs defaultValue="today" onValueChange={setActiveTab} value={activeTab}>
                <div className="flex justify-between items-center no-print">
                    <TabsList>
                        <TabsTrigger value="today">Today</TabsTrigger>
                        <TabsTrigger value="weekly">Weekly</TabsTrigger>
                        <TabsTrigger value="monthly">Monthly</TabsTrigger>
                        <TabsTrigger value="yearly">Yearly</TabsTrigger>
                    </TabsList>
                </div>
                <div className="mt-4">
                    {renderActiveTabContent()}
                </div>
            </Tabs>
        </div>
    </div>
  );
}
