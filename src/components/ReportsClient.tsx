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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DollarSign } from "lucide-react";

interface ClientSales {
  clientName: string;
  totalSales: number;
  jobOrderCount: number;
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
  const { jobOrders } = useJobOrders();

  const { clientSales, grandTotalSales } = useMemo(() => {
    const salesByClient: { [key: string]: { totalSales: number, jobOrderCount: number } } = {};

    jobOrders.forEach(order => {
      if (!salesByClient[order.clientName]) {
        salesByClient[order.clientName] = { totalSales: 0, jobOrderCount: 0 };
      }
      salesByClient[order.clientName].totalSales += order.totalAmount;
      salesByClient[order.clientName].jobOrderCount += 1;
    });

    const clientSales: ClientSales[] = Object.entries(salesByClient).map(([clientName, data]) => ({
      clientName,
      ...data
    })).sort((a, b) => b.totalSales - a.totalSales); // Sort by total sales descending

    const grandTotalSales = clientSales.reduce((sum, client) => sum + client.totalSales, 0);

    return { clientSales, grandTotalSales };
  }, [jobOrders]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
             <StatCard title="Grand Total Sales" value={formatCurrency(grandTotalSales)} icon={DollarSign} description="Total revenue from all job orders"/>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Sales by Client</CardTitle>
          <CardDescription>A summary of total sales from each client.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Rank</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead className="text-center">Job Orders</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientSales.length > 0 ? (
                clientSales.map((client, index) => (
                  <TableRow key={client.clientName}>
                    <TableCell className="font-bold text-lg text-muted-foreground">
                        {index + 1}
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarFallback>{client.clientName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{client.clientName}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-center">{client.jobOrderCount}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(client.totalSales)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
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
