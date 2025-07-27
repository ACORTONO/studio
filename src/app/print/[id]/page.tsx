
"use client";

import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useJobOrders } from '@/contexts/JobOrderContext';
import { JobOrder } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PrintPage() {
  const { id } = useParams();
  const { jobOrders, getJobOrderById } = useJobOrders();
  const [jobOrder, setJobOrder] = useState<JobOrder | undefined>(undefined);
  const [printerAvailable, setPrinterAvailable] = useState<boolean>(true);
  
  useEffect(() => {
    async function checkPrinter() {
      if (typeof window !== 'undefined' && 'getPrinters' in navigator) {
        try {
          const printers = await (navigator as any).getPrinters();
          setPrinterAvailable(printers.length > 0);
        } catch (error) {
          console.warn('Could not detect printers.', error);
          // Assume a printer is available if the API fails, to not block users.
          setPrinterAvailable(true);
        }
      }
    }
    checkPrinter();
  }, []);

  useLayoutEffect(() => {
    const foundJobOrder = getJobOrderById(id as string);
    setJobOrder(foundJobOrder);
  }, [id, jobOrders, getJobOrderById]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
        window.print();
    }
  }

  if (!jobOrder) {
    return (
        <div className="p-4 space-y-4 bg-white text-black text-xs">
            <Skeleton className="h-8 w-1/2 bg-gray-300" />
            <Skeleton className="h-6 w-1/3 bg-gray-300" />
            <Skeleton className="h-24 w-full bg-gray-300" />
            <Skeleton className="h-32 w-full bg-gray-300" />
        </div>
    );
  }
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  
  const subtotal = jobOrder.totalAmount;
  const discountValue = jobOrder.discount || 0;
  const discountAmount = jobOrder.discountType === 'percent'
    ? subtotal * (discountValue / 100)
    : discountValue;

  const paidAmount = jobOrder.paidAmount || 0;
  const amountDue = subtotal - discountAmount - paidAmount;


  const renderPaymentDetails = () => {
    switch (jobOrder.paymentMethod) {
        case 'Cheque':
            return (
                <div className="text-xxs">
                    <h3 className="font-semibold text-gray-600 uppercase tracking-wider mb-1">Payment Details</h3>
                    <p><span className="font-semibold">Method:</span> Cheque</p>
                    {jobOrder.bankName && <p><span className="font-semibold">Bank:</span> {jobOrder.bankName}</p>}
                    {jobOrder.chequeNumber && <p><span className="font-semibold">Cheque No:</span> {jobOrder.chequeNumber}</p>}
                    {jobOrder.chequeDate && <p><span className="font-semibold">Cheque Date:</span> {new Date(jobOrder.chequeDate).toLocaleDateString()}</p>}
                </div>
            );
        case 'E-Wallet':
             return (
                <div className="text-xxs">
                    <h3 className="font-semibold text-gray-600 uppercase tracking-wider mb-1">Payment Details</h3>
                    <p><span className="font-semibold">Method:</span> E-Wallet</p>
                    {jobOrder.eWalletReference && <p><span className="font-semibold">Reference:</span> {jobOrder.eWalletReference}</p>}
                </div>
            );
        case 'Bank Transfer':
            return (
                <div className="text-xxs">
                    <h3 className="font-semibold text-gray-600 uppercase tracking-wider mb-1">Payment Details</h3>
                    <p><span className="font-semibold">Method:</span> Bank Transfer</p>
                    {jobOrder.bankTransferReference && <p><span className="font-semibold">Reference:</span> {jobOrder.bankTransferReference}</p>}
                </div>
            );
        default:
            return null;
    }
  }

  return (
    <div className='bg-gray-100 p-4 sm:p-6 lg:p-8 min-h-screen'>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex justify-between items-center no-print text-gray-800">
            <div>
                <h1 className="text-2xl font-bold">Print Preview</h1>
                <p className="text-gray-500">Review the job order before printing.</p>
            </div>
            <Button onClick={handlePrint} variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Printer className="mr-2 h-4 w-4"/>
                Print Now
            </Button>
        </div>

        {!printerAvailable && (
            <Alert variant="destructive" className="mb-4 no-print">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Printer Detected</AlertTitle>
                <AlertDescription>
                    Your browser could not detect any available printers. Please ensure a printer is connected and configured.
                </AlertDescription>
            </Alert>
        )}
        
        <Card className="print-area shadow-lg">
            <CardContent className="p-0">
                <div className="p-2 font-sans text-gray-800 bg-white text-[8px] leading-tight print-content">
                    <header className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-lg font-headline font-bold text-gray-900">JOB ORDER</h1>
                            <p className="text-gray-500 text-xs">{jobOrder.jobOrderNumber}</p>
                        </div>
                        <div className="text-right">
                            <Image src="https://storage.googleapis.com/stedi-dev-screenshots/adslab-logo.png" alt="Company Logo" width={80} height={80} className="w-16 h-auto ml-auto mb-1"/>
                            <p className="text-xxs text-gray-600">123 Business Rd, City, State 12345</p>
                            <p className="text-xxs text-gray-600">contact@yourcompany.com</p>
                        </div>
                    </header>
                    
                    <Separator className="my-2 bg-gray-200" />

                    <section className="grid grid-cols-3 gap-4 mb-4 text-xxs">
                        <div>
                            <h3 className="font-semibold text-gray-600 uppercase tracking-wider mb-1">Bill To</h3>
                            <p className="font-bold text-xs">{jobOrder.clientName}</p>
                            <p>{jobOrder.contactMethod}: {jobOrder.contactDetail}</p>
                        </div>
                        <div className="text-right col-span-2">
                            <p><span className="font-semibold text-gray-600">Start Date:</span> {new Date(jobOrder.startDate).toLocaleDateString()}</p>
                            <p><span className="font-semibold text-gray-600">Due Date:</span> {new Date(jobOrder.dueDate).toLocaleDateString()}</p>
                        </div>
                    </section>

                    <section>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-100">
                                    <TableHead className="w-2/5 font-bold text-gray-700 p-1 h-auto">Description</TableHead>
                                    <TableHead className="text-center font-bold text-gray-700 p-1 h-auto">Qty</TableHead>
                                    <TableHead className="text-right font-bold text-gray-700 p-1 h-auto">Price</TableHead>
                                    <TableHead className="text-right font-bold text-gray-700 p-1 h-auto">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jobOrder.items.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="p-1">
                                            <p className="font-medium">{item.description}</p>
                                            {item.remarks && <p className="text-xxs text-gray-500">{item.remarks}</p>}
                                        </TableCell>
                                        <TableCell className="text-center p-1">{item.quantity}</TableCell>
                                        <TableCell className="text-right p-1">{formatCurrency(item.amount)}</TableCell>
                                        <TableCell className="text-right p-1">{formatCurrency(item.quantity * item.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right text-gray-800 p-1 h-auto">Subtotal</TableCell>
                                    <TableCell className="text-right text-gray-800 p-1 h-auto">{formatCurrency(subtotal)}</TableCell>
                                </TableRow>
                                {discountValue > 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-right text-gray-800 p-1 h-auto">
                                            Discount {jobOrder.discountType === 'percent' ? `(${jobOrder.discount}%)` : ''}
                                        </TableCell>
                                        <TableCell className="text-right text-gray-800 p-1 h-auto">{formatCurrency(discountAmount)}</TableCell>
                                    </TableRow>
                                )}
                                 {paidAmount > 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-right text-gray-800 p-1 h-auto">Total Paid</TableCell>
                                        <TableCell className="text-right text-gray-800 p-1 h-auto">{formatCurrency(paidAmount)}</TableCell>
                                    </TableRow>
                                 )}
                                <TableRow className="font-bold text-xs bg-gray-50">
                                    <TableCell colSpan={3} className="text-right text-gray-800 p-1 h-auto">Amount Due</TableCell>
                                    <TableCell className="text-right text-purple-600 p-1 h-auto">{formatCurrency(amountDue)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </section>

                    <section className="mt-4 grid grid-cols-2 gap-4 text-xxs">
                        {jobOrder.notes && (
                                <div>
                                <h3 className="font-semibold text-gray-600 uppercase tracking-wider mb-1">Notes</h3>
                                <p className="text-gray-700 whitespace-pre-wrap">{jobOrder.notes}</p>
                                </div>
                        )}
                        {renderPaymentDetails()}
                    </section>

                    <footer className="mt-8 pt-4 border-t border-gray-200 text-gray-500 grid grid-cols-2 text-xxs">
                        <div>
                            <p>Prepared by: _________________</p>
                        </div>
                        <div className="text-right">
                            <p>Signature: _________________</p>
                        </div>
                    </footer>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
