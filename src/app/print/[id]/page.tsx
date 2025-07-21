"use client";

import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useJobOrders } from '@/contexts/JobOrderContext';
import { JobOrder } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export default function PrintPage() {
  const { id } = useParams();
  const { jobOrders, getJobOrderById } = useJobOrders();
  const [order, setOrder] = useState<JobOrder | undefined>(undefined);
  
  const printCalled = React.useRef(false);

  useLayoutEffect(() => {
    const foundOrder = getJobOrderById(id as string);
    setOrder(foundOrder);
  }, [id, jobOrders, getJobOrderById]);

  useEffect(() => {
    if (order && !printCalled.current) {
        if (typeof window !== 'undefined') {
            printCalled.current = true;
            setTimeout(() => window.print(), 500);
        }
    }
  }, [order]);

  if (!order) {
    return (
        <div className="p-12 space-y-8 bg-white text-black">
            <Skeleton className="h-12 w-1/2 bg-gray-300" />
            <Skeleton className="h-8 w-1/3 bg-gray-300" />
            <Skeleton className="h-32 w-full bg-gray-300" />
            <Skeleton className="h-48 w-full bg-gray-300" />
        </div>
    );
  }
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  return (
    <div className="p-8 sm:p-12 font-sans text-gray-800 bg-white">
        <header className="flex justify-between items-start mb-10">
            <div>
                <h1 className="text-4xl font-headline font-bold text-gray-900">JOB ORDER</h1>
                <p className="text-gray-500">{order.jobOrderNumber}</p>
            </div>
            <div className="text-right">
                <h2 className="text-2xl font-headline font-semibold">Your Company Name</h2>
                <p className="text-sm text-gray-600">123 Business Rd, City, State 12345</p>
                <p className="text-sm text-gray-600">contact@yourcompany.com</p>
            </div>
        </header>
        
        <Separator className="my-8 bg-gray-200" />

        <section className="grid grid-cols-3 gap-8 mb-10">
            <div>
                <h3 className="font-semibold text-gray-600 uppercase tracking-wider text-sm mb-2">Bill To</h3>
                <p className="font-bold text-lg">{order.clientName}</p>
                <p>{order.contactNumber}</p>
            </div>
            <div className="text-right col-span-2">
                 <p><span className="font-semibold text-gray-600">Order Date:</span> {new Date(order.date).toLocaleDateString()}</p>
                 <p><span className="font-semibold text-gray-600">Start Date:</span> {new Date(order.startDate).toLocaleDateString()}</p>
                 <p><span className="font-semibold text-gray-600">Due Date:</span> {new Date(order.dueDate).toLocaleDateString()}</p>
            </div>
        </section>

        <section>
            <Table>
                <TableHeader>
                    <TableRow className="bg-gray-100">
                        <TableHead className="w-2/5 font-bold text-gray-700">Description</TableHead>
                        <TableHead className="text-center font-bold text-gray-700">Quantity</TableHead>
                        <TableHead className="text-right font-bold text-gray-700">Unit Price</TableHead>
                        <TableHead className="text-right font-bold text-gray-700">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {order.items.map(item => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <p className="font-medium">{item.description}</p>
                                {item.remarks && <p className="text-sm text-gray-500">{item.remarks}</p>}
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.quantity * item.amount)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow className="font-bold text-lg">
                        <TableCell colSpan={3} className="text-right text-gray-800">Grand Total</TableCell>
                        <TableCell className="text-right text-purple-600">{formatCurrency(order.totalAmount)}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </section>
        
        {order.notes && (
             <section className="mt-10">
                <h3 className="font-semibold text-gray-600 uppercase tracking-wider text-sm mb-2">Additional Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
             </section>
        )}

        <footer className="mt-20 pt-8 border-t border-gray-200 text-gray-500 grid grid-cols-2">
            <div>
                 <p>Prepared by: _________________________</p>
            </div>
            <div className="text-right">
                <p>Customer Signature: _________________________</p>
            </div>
        </footer>
    </div>
  );
}
