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
import { DollarSign, TrendingUp, Banknote, AlertCircle, CheckCircle, Search, ArrowUpDown, CircleX, Hourglass, FileDown, Wallet } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { format, parseISO, startOfWeek, endOfWeek, startOfToday, endOfToday, startOfMonth, endOfMonth, endOfYear, startOfYear } from "date-fns";
import { JobOrder } from "@/lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type SortableJobOrderKeys = keyof JobOrder | 'balance';

export const getStatusBadge = (status: JobOrder['status']) => {
    switch (status) {
        case 'Completed':
            return <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3"/> Completed</Badge>;
        case 'Balance':
            return <Badge variant="info"><Wallet className="mr-1 h-3 w-3"/> Balance</Badge>;
        case 'Pending':
            return <Badge variant="warning"><Hourglass className="mr-1 h-3 w-3"/> Pending</Badge>;
        case 'Cancelled':
            return <Badge variant="destructive"><CircleX className="mr-1 h-3 w-3"/> Cancelled</Badge>;
        default:
            return <Badge>{status}</Badge>;
    }
}

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
   } = useMemo(() => {
    const now = new Date();
    const grandTotalSales = jobOrders.reduce((sum, jobOrder) => sum + jobOrder.totalAmount, 0);
    const totalCollectibles = jobOrders.reduce((sum, jobOrder) => sum + (jobOrder.paidAmount || 0), 0);
    
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
            if (sortConfig.key === 'balance') {
                 const aDiscountValue = a.discount || 0;
                 const aDiscountAmount = a.discountType === 'percent' ? a.totalAmount * (aDiscountValue / 100) : aDiscountValue;
                 const aBalance = a.totalAmount - (a.paidAmount || 0) - aDiscountAmount;
                 const bDiscountValue = b.discount || 0;
                 const bDiscountAmount = b.discountType === 'percent' ? b.totalAmount * (bDiscountValue / 100) : bDiscountValue;
                 const bBalance = b.totalAmount - (b.paidAmount || 0) - bDiscountAmount;
                 return sortConfig.direction === 'ascending' ? aBalance - bBalance : bBalance - aBalance;
            }

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


    return { totalCollectibles, totalUnpaid, cashOnHand, sortedAndFilteredJobOrders: filtered, todaySales: todaySalesValue, todayJobOrders, weeklyJobOrders, monthlyJobOrders, yearlyJobOrders };
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
    router.push('/reports/print');
  }

  const SortableHeader = ({ title, sortKey }: { title: string, sortKey: SortableJobOrderKeys }) => (
    <TableHead className="text-center">
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
                <Table>
                    <TableHeader>
                    <TableRow>
                        <SortableHeader title="JO #" sortKey="jobOrderNumber" />
                        <SortableHeader title="Start Date" sortKey="startDate" />
                        <SortableHeader title="Client Name" sortKey="clientName" />
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
                                <TableCell className="text-center">
                                    <Badge variant="outline">{jobOrder.jobOrderNumber}</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    {new Date(jobOrder.startDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="font-medium">{jobOrder.clientName}</span>
                                    {jobOrder.notes && <p className="text-xs text-muted-foreground truncate max-w-xs">{jobOrder.notes}</p>}
                                </TableCell>
                                <TableCell className="text-center">{formatCurrency(jobOrder.totalAmount)}</TableCell>
                                <TableCell className="text-center">{formatCurrency(jobOrder.paidAmount || 0)}</TableCell>
                                <TableCell className="text-center font-semibold">{formatCurrency(balance)}</TableCell>
                                <TableCell className="text-center">
                                    {getStatusBadge(jobOrder.status)}
                                </TableCell>
                            </TableRow>
                        );
                        })
                    }
                    {data.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 no-print">
             <StatCard title="Today's Sales" value={formatCurrency(todaySales)} icon={TrendingUp} description="Total revenue from today's job orders"/>
             <StatCard title="Total Collectibles" value={formatCurrency(totalCollectibles)} icon={Banknote} description="Total amount paid by clients"/>
             <StatCard title="Total Unpaid" value={formatCurrency(totalUnpaid)} icon={AlertCircle} description="Total outstanding balance"/>
             <StatCard title="Cash On Hand" value={formatCurrency(cashOnHand)} icon={DollarSign} description="Collectibles minus expenses"/>
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
