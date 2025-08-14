
"use client";

import React, { useEffect, useLayoutEffect, useState, use } from 'react';
import { useInvoices } from '@/contexts/InvoiceContext';
import { Invoice } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { invoices, getInvoiceById } = useInvoices();
  const [invoice, setInvoice] = useState<Invoice | undefined>(undefined);
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
    const foundInvoice = getInvoiceById(id as string);
    setInvoice(foundInvoice);
  }, [id, invoices, getInvoiceById]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
        window.print();
    }
  }

  if (!invoice) {
    return (
        <div className="p-8 space-y-4 bg-white text-black">
            <Skeleton className="h-12 w-1/2 bg-gray-300" />
            <Skeleton className="h-8 w-1/3 bg-gray-300" />
            <Skeleton className="h-32 w-full bg-gray-300" />
            <Skeleton className="h-48 w-full bg-gray-300" />
        </div>
    );
  }
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  
  const subtotal = invoice.totalAmount;

  return (
    <div className='p-4 sm:p-6 lg:p-8 min-h-screen bg-gray-100'>
      <div className="max-w-4xl mx-auto space-y-4 no-print">
        <div className="flex justify-between items-center text-gray-800">
            <div>
                <h1 className="text-2xl font-bold">Print Preview</h1>
                <p className="text-gray-500">Review the invoice before printing.</p>
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

      <div className="print-area max-w-4xl p-8 bg-white shadow-lg mx-auto mt-4 text-black">
          <div className="p-2 font-sans bg-white leading-normal print-content">
              <header className="flex justify-between items-start mb-8 pb-4 border-b">
                  <div className="flex items-center gap-4">
                      <Image src="https://storage.googleapis.com/stedi-dev-screenshots/adslab-logo.png" alt="Company Logo" width={80} height={80} className="w-20 h-auto"/>
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">ADSLAB ADVERTISING SERVICES</h1>
                        <p className="text-gray-500">123 Printing Press Lane, Imus, Cavite, 4103</p>
                        <p className="text-gray-500">sales@adslab.com</p>
                      </div>
                  </div>
                  <div className="text-right">
                      <h2 className="text-3xl font-headline font-bold text-gray-800 uppercase">Invoice</h2>
                      <p className="text-gray-500">{invoice.invoiceNumber}</p>
                  </div>
              </header>

              <section className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                      <h3 className="font-semibold text-gray-600 uppercase tracking-wider mb-2">Bill To</h3>
                      <p className="font-bold text-lg">{invoice.clientName}</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{invoice.address}</p>
                      {invoice.tinNumber && <p className="text-gray-700">TIN: {invoice.tinNumber}</p>}
                  </div>
                  <div className="text-right">
                      <p className="mb-1"><span className="font-semibold text-gray-600">Invoice Date:</span> {new Date(invoice.date).toLocaleDateString()}</p>
                      <p><span className="font-semibold text-gray-600">Due Date:</span> {new Date(invoice.dueDate).toLocaleDateString()}</p>
                  </div>
              </section>

              <section className="mb-8">
                  <Table>
                      <TableHeader>
                          <TableRow className="bg-gray-100">
                              <TableHead className="w-3/5 font-bold text-gray-700 p-2 h-auto">Item Description</TableHead>
                              <TableHead className="text-center font-bold text-gray-700 p-2 h-auto">Quantity</TableHead>
                              <TableHead className="text-right font-bold text-gray-700 p-2 h-auto">Unit Price</TableHead>
                              <TableHead className="text-right font-bold text-gray-700 p-2 h-auto">Total</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {invoice.items.map(item => (
                              <TableRow key={item.id} className="border-b">
                                  <TableCell className="p-2 align-top">
                                      <p className="font-medium">{item.description}</p>
                                  </TableCell>
                                  <TableCell className="text-center p-2 align-top">{item.quantity}</TableCell>
                                  <TableCell className="text-right p-2 align-top">{formatCurrency(item.amount)}</TableCell>
                                  <TableCell className="text-right p-2 align-top">{formatCurrency(item.quantity * item.amount)}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </section>

               <section className="flex justify-between mb-8">
                {invoice.notes && (
                  <div className="w-1/2">
                      <h3 className="font-semibold text-gray-600 uppercase tracking-wider mb-2">Notes</h3>
                      <p className="text-gray-700 whitespace-pre-wrap p-3 bg-gray-50 rounded-md text-sm">{invoice.notes}</p>
                  </div>
                )}
                <div className="w-full max-w-xs space-y-2 ml-auto">
                    <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Subtotal:</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Taxes (0%):</span>
                        <span>{formatCurrency(0)}</span>
                    </div>
                    <Separator className="my-2"/>
                     <div className="flex justify-between font-bold text-lg text-primary">
                        <span>Total Due:</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                </div>
               </section>
             
              <footer className="mt-12 pt-4 border-t border-gray-200 text-gray-500 text-center text-sm">
                  <p>Thank you for your business! If you have any questions, please contact us at sales@adslab.com</p>
              </footer>
          </div>
      </div>
    </div>
  );
}
