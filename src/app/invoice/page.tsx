
"use client";
import { InvoiceForm } from "@/components/InvoiceForm";
import { useInvoices } from "@/contexts/InvoiceContext";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Printer, Pencil } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function InvoicePage() {
    const { invoices, deleteInvoice } = useInvoices();
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();

    const filteredInvoices = invoices.filter(invoice =>
        invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

    const handleDelete = (id: string) => {
        deleteInvoice(id);
        toast({
            title: "Success",
            description: "Invoice deleted successfully.",
        });
    }

    return (
        <div className="space-y-8">
             <div className="flex items-center justify-between">
                <h1 className="text-3xl font-headline font-bold">Invoices</h1>
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by client or invoice #"
                        className="pl-10 w-full sm:w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <InvoiceForm />

            <Card>
                <CardHeader>
                    <CardTitle>Existing Invoices</CardTitle>
                     <CardDescription>
                        A list of all your existing invoices.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Client Name</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInvoices.length > 0 ? (
                                filteredInvoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell>
                                            <Badge variant="outline">{invoice.invoiceNumber}</Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{invoice.clientName}</TableCell>
                                        <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                                        <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                                        <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                                        <TableCell>
                                            <Badge variant={invoice.status === 'Paid' ? 'success' : 'warning'}>{invoice.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button asChild variant="ghost" size="icon">
                                                <Link href={`/invoice/edit/${invoice.id}`}>
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button asChild variant="ghost" size="icon">
                                                <Link href={`/invoice/print/${invoice.id}`} target="_blank">
                                                    <Printer className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete this invoice.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(invoice.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No invoices found.
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
