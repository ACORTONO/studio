
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JobOrder } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getStatusBadge } from '@/components/ReportsClient';
import { Printer, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PrintReportPage() {
    const router = useRouter();
    const [reportData, setReportData] = useState<{data: JobOrder[], title: string} | null>(null);
    const [currentDate, setCurrentDate] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedData = localStorage.getItem('reportData');
        if (storedData) {
            setReportData(JSON.parse(storedData));
        }
        setCurrentDate(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
        setIsLoading(false);
    }, []);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

    const handlePrint = () => {
        window.print();
    }

    if (isLoading) {
        return (
            <div className="p-8">
                <Skeleton className="h-10 w-1/4 mb-4" />
                <Skeleton className="h-8 w-1/2 mb-8" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!reportData) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
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
        <div className="min-h-screen">
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 no-print">
                <div className="flex justify-between items-center text-gray-800">
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
             <div className="report-print-area bg-white">
                 <div className="p-6">
                    <header>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold">{reportTitle}</h1>
                            <p className="text-sm text-muted-foreground">As of {currentDate}</p>
                        </div>
                    </header>
                    <div className="mt-6">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>JO #</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>Client Name</TableHead>
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
                                        <TableCell>
                                            <Badge variant="outline">{jobOrder.jobOrderNumber}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(jobOrder.startDate).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium">{jobOrder.clientName}</span>
                                            {jobOrder.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{jobOrder.notes}</p>}
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(jobOrder.totalAmount)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(jobOrder.paidAmount || 0)}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(balance)}</TableCell>
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
                    </div>
                 </div>
             </div>
        </div>
    )
}
