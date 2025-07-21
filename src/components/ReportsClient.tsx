"use client";

import React, { useMemo } from "react";
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
import { DollarSign, TrendingUp, TrendingDown, Package, Banknote, AlertCircle, CheckCircle } from "lucide-react";

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

  const { 
    grandTotalSales,
    totalCollectibles,
    totalUnpaid,
    totalExpenses,
    cashOnHand,
    sortedJobOrders
   } = useMemo(() => {
    const grandTotalSales = jobOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalCollectibles = jobOrders.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
    const totalUnpaid = grandTotalSales - totalCollectibles;
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const cashOnHand = totalCollectibles - totalExpenses;
    
    // Sort by date descending
    const sortedJobOrders = [...jobOrders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { grandTotalSales, totalCollectibles, totalUnpaid, totalExpenses, cashOnHand, sortedJobOrders };
  }, [jobOrders, expenses]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <StatCard title="Total Sales" value={formatCurrency(grandTotalSales)} icon={TrendingUp} description="Total revenue from all job orders"/>
             <StatCard title="Total Collectibles" value={formatCurrency(totalCollectibles)} icon={Banknote} description="Total amount paid by clients"/>
             <StatCard title="Total Unpaid" value={formatCurrency(totalUnpaid)} icon={AlertCircle} description="Total outstanding balance"/>
             <StatCard title="Cash On Hand" value={formatCurrency(cashOnHand)} icon={DollarSign} description="Collectibles minus expenses"/>
        </div>
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
    </div>
  );
}
