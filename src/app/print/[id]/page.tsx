
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

export default function PrintPage() {
  const params = useParams();
  const id = params.id;
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


  return (
    <div className='p-4 sm:p-6 lg:p-8 min-h-screen'>
      <div className="max-w-xl mx-auto space-y-4 no-print">
        <div className="flex justify-between items-center text-gray-800">
            <div>
                <h1 className="text-2xl font-bold">Print Preview</h1>
                <p className="text-gray-500">Review the job order before printing (4x6 inches).</p>
            </div>
            <Button onClick={handlePrint} variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Printer className="mr-2 h-4 w-4"/>
                Print Now
            </Button>
        </div>

        {!printerAvailable && (
            <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Printer Detected</AlertTitle>
                <AlertDescription>
                    Your browser could not detect any available printers. Please ensure a printer is connected and configured.
                </AlertDescription>
            </Alert>
        )}
      </div>
      
      <div className="print-area w-[4in] h-[6in] p-[0.25in] bg-white shadow-lg mx-auto mt-4">
          <div className="p-2 font-sans text-gray-800 bg-white leading-tight print-content">
              <header className="flex justify-between items-start mb-2">
                  <div>
                      <h1 className="text-base font-headline font-bold text-gray-900">JOB ORDER</h1>
                      <p className="text-gray-500">{jobOrder.jobOrderNumber}</p>
                  </div>
                  <div className="text-right">
                      <Image src="https://storage.googleapis.com/stedi-dev-screenshots/adslab-logo.png" alt="Company Logo" width={60} height={60} className="w-12 h-auto ml-auto mb-1"/>
                  </div>
              </header>
              
              <Separator className="my-2 bg-gray-200" />

              <section className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                      <h3 className="font-semibold text-gray-600 uppercase tracking-wider mb-1">Bill To</h3>
                      <p className="font-bold">{jobOrder.clientName}</p>
                      <p>{jobOrder.contactMethod}: {jobOrder.contactDetail}</p>
                  </div>
                  <div className="text-right">
                      <p><span className="font-semibold text-gray-600">Start:</span> {new Date(jobOrder.startDate).toLocaleDateString()}</p>
                      <p><span className="font-semibold text-gray-600">Due:</span> {new Date(jobOrder.dueDate).toLocaleDateString()}</p>
                  </div>
              </section>

              <section>
                  <Table>
                      <TableHeader>
                          <TableRow className="bg-gray-100">
                              <TableHead className="w-2/5 font-bold text-gray-700 p-1 h-auto">Description</TableHead>
                              <TableHead className="w-2/5 font-bold text-gray-700 p-1 h-auto">Remarks</TableHead>
                              <TableHead className="text-center font-bold text-gray-700 p-1 h-auto">Qty</TableHead>
                              <TableHead className="text-right font-bold text-gray-700 p-1 h-auto">Total</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {jobOrder.items.map(item => (
                              <TableRow key={item.id}>
                                  <TableCell className="p-1 align-top">
                                      <p className="font-medium">{item.description}</p>
                                  </TableCell>
                                  <TableCell className="p-1 align-top">
                                    {item.remarks && <p className="text-gray-500">{item.remarks}</p>}
                                  </TableCell>
                                  <TableCell className="text-center p-1 align-top">{item.quantity}</TableCell>
                                  <TableCell className="text-right p-1 align-top">{formatCurrency(item.quantity * item.amount)}</TableCell>
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
                                  <TableCell className="text-right text-gray-800 p-1 h-auto">- {formatCurrency(discountAmount)}</TableCell>
                              </TableRow>
                          )}
                           {paidAmount > 0 && (
                              <TableRow>
                                  <TableCell colSpan={3} className="text-right text-gray-800 p-1 h-auto">Paid</TableCell>
                                  <TableCell className="text-right text-gray-800 p-1 h-auto">- {formatCurrency(paidAmount)}</TableCell>
                              </TableRow>
                           )}
                          <TableRow className="font-bold bg-gray-50">
                              <TableCell colSpan={3} className="text-right text-gray-800 p-1 h-auto">Total</TableCell>
                              <TableCell className="text-right text-purple-600 p-1 h-auto">{formatCurrency(amountDue)}</TableCell>
                          </TableRow>
                      </TableFooter>
                  </Table>
              </section>

              {jobOrder.notes && (
                  <section className="mt-2">
                      <h3 className="font-semibold text-gray-600 uppercase tracking-wider mb-1">Notes</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{jobOrder.notes}</p>
                  </section>
              )}

              <footer className="mt-4 pt-2 border-t border-gray-200 text-gray-500 absolute bottom-4 left-4 right-4">
                  <p className="text-center">Thank you for your business!</p>
              </footer>
          </div>
      </div>
    </div>
  );
}
