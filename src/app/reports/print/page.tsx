
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JobOrder, PettyCash } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getStatusBadge } from '@/components/ReportsClient';
import { Printer, ArrowLeft, TrendingUp, TrendingDown, DollarSign, Banknote, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ReportSummary {
    totalSales: number;
    totalCollectibles: number;
    totalExpenses: number;
    netProfit: number;
    cashOnHand: number;
    totalPettyCash?: number;
}

const SummaryCard = ({ title, value, icon: Icon, className }: { title: string, value: string, icon: React.ElementType, className?: string }) => (
    <Card className={cn("border-black/20", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
        <CardTitle className="text-xs font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="text-lg font-bold">{value}</div>
      </CardContent>
    </Card>
);


export default function PrintReportPage() {
    const router = useRouter();
    const [reportData, setReportData] = useState<{data: JobOrder[], title: string} | null>(null);
    const [summaryData, setSummaryData] = useState<ReportSummary | null>(null);
    const [currentDate, setCurrentDate] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedReportData = localStorage.getItem('reportData');
        const storedSummaryData = localStorage.getItem('reportSummary');
        if (storedReportData) {
            setReportData(JSON.parse(storedReportData));
        }
        if (storedSummaryData) {
            setSummaryData(JSON.parse(storedSummaryData));
        }
        setCurrentDate(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
        setIsLoading(false);
         document.body.classList.add('print-preview-page');
        return () => {
            document.body.classList.remove('print-preview-page');
        };
    }, []);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

    const handlePrint = () => {
        window.print();
    }

    if (isLoading) {
        return (
            <div className="p-8 bg-white">
                <Skeleton className="h-10 w-1/4 mb-4" />
                <Skeleton className="h-8 w-1/2 mb-8" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!reportData) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-white">
                <p>No report data found.</p>
                <Button onClick={() => router.push('/reports')} className="mt-4">
                    Go Back
                </Button>
            </div>
        );
    }
    
    const { data, title } = reportData;
    
    const reportTitle = title === "Today's Sales" ? "Daily Sales Report" : `${title} Report`;


    return (
        <div className="min-h-screen bg-gray-100 text-black">
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 no-print">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Print Preview</h1>
                        <p className="text-gray-500">Review the report before printing.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => router.push('/reports')} variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4"/>
                            Back to Reports
                        </Button>
                        <Button onClick={handlePrint} variant="default">
                            <Printer className="mr-2 h-4 w-4"/>
                            Print Now
                        </Button>
                    </div>
                </div>
             </div>
             <div className="report-print-area bg-white p-6">
                <header className="mb-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold">{reportTitle}</h1>
                        <p className="text-sm text-muted-foreground">As of {currentDate}</p>
                    </div>
                </header>

                {summaryData && (
                    <section className="mb-6">
                         <h2 className="text-lg font-semibold mb-2 text-center">Summary</h2>
                         <div className="grid grid-cols-5 gap-2">
                             <SummaryCard title="Total Sales" value={formatCurrency(summaryData.totalSales)} icon={TrendingUp} className="bg-green-100" />
                             <SummaryCard title="Expenses" value={formatCurrency(summaryData.totalExpenses)} icon={TrendingDown} className="bg-red-100" />
                             <SummaryCard title="Collectibles" value={formatCurrency(summaryData.totalCollectibles)} icon={AlertCircle} className="bg-yellow-100"/>
                             <SummaryCard title="Net Profit" value={formatCurrency(summaryData.netProfit)} icon={Banknote} className="bg-blue-100"/>
                             <SummaryCard title="Cash on Hand" value={formatCurrency(summaryData.cashOnHand)} icon={DollarSign} className="bg-purple-100"/>
                         </div>
                    </section>
                )}

                <div className="mt-6">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>JO #</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>Client Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Total Amount</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="text-center">Status</TableHead>
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
                                    <TableCell className="text-left">
                                        <Badge variant="outline">{jobOrder.jobOrderNumber}</Badge>
                                    </TableCell>
                                    <TableCell className="text-left">
                                        {new Date(jobOrder.startDate).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-left">
                                        <span className="font-medium">{jobOrder.clientName}</span>
                                        {jobOrder.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{jobOrder.notes}</p>}
                                    </TableCell>
                                    <TableCell>
                                        <ul className="list-disc list-inside text-xs">
                                            {jobOrder.items.slice(0, 2).map(item => (
                                                <li key={item.id} className="truncate">{item.description}</li>
                                            ))}
                                            {jobOrder.items.length > 2 && <li className="text-muted-foreground">...and {jobOrder.items.length - 2} more</li>}
                                        </ul>
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(jobOrder.totalAmount)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(jobOrder.paidAmount || 0)}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(balance)}</TableCell>
                                    <TableCell className="text-center">
                                        {getStatusBadge(jobOrder.items[0]?.status, jobOrder.items)}
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
                </div>
             </div>
        </div>
    )
}

    
