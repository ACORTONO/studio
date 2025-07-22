
"use client";

import React, { useState, useMemo } from "react";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Users, Wallet } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  startOfToday,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfToday,
  endOfWeek,
  endOfMonth,
  endOfYear,
  isWithinInterval,
  parseISO,
} from "date-fns";

const salarySchema = z.object({
    employeeName: z.string().min(1, 'Employee name is required'),
    amount: z.coerce.number().min(0.01, 'Amount must be positive')
});

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


export function SalariesClient() {
    const { salaries, addSalaryPayment } = useJobOrders();
    const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);
    const [timeFilter, setTimeFilter] = useState("all");

    const form = useForm<z.infer<typeof salarySchema>>({
        resolver: zodResolver(salarySchema),
        defaultValues: {
            employeeName: '',
            amount: 0,
        }
    });

    const { filteredSalaries, totalSalaryPaid } = useMemo(() => {
        const now = new Date();
        let interval: Interval | null = null;
    
        switch (timeFilter) {
          case "weekly":
            interval = { start: startOfWeek(now), end: endOfWeek(now) };
            break;
          case "monthly":
            interval = { start: startOfMonth(now), end: endOfMonth(now) };
            break;
          case "yearly":
            interval = { start: startOfYear(now), end: endOfYear(now) };
            break;
          default:
            interval = null; // 'all'
        }
    
        const filtered = interval 
            ? salaries.filter(s => isWithinInterval(parseISO(s.date), interval!))
            : salaries;
        
        const total = filtered.reduce((sum, s) => sum + s.amount, 0);
    
        return { filteredSalaries: filtered.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()), totalSalaryPaid: total };
    }, [salaries, timeFilter]);
    

    const handleAddSalary = (values: z.infer<typeof salarySchema>) => {
        addSalaryPayment(values);
        form.reset();
        setIsSalaryDialogOpen(false);
    }
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

    return (
         <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-headline font-bold">Salaries</h1>
                <Dialog open={isSalaryDialogOpen} onOpenChange={setIsSalaryDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Salary Payment
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <form onSubmit={form.handleSubmit(handleAddSalary)}>
                            <DialogHeader>
                                <DialogTitle>New Salary Payment</DialogTitle>
                                <DialogDescription>Record a new salary payment for an employee.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="employeeName" className="text-right">Name</Label>
                                    <Input id="employeeName" {...form.register('employeeName')} className="col-span-3" placeholder="e.g., John Doe"/>
                                    {form.formState.errors.employeeName && <p className="text-red-500 text-xs col-span-4 text-right">{form.formState.errors.employeeName.message}</p>}
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="amount" className="text-right">Amount</Label>
                                    <Input id="amount" type="number" {...form.register('amount')} className="col-span-3" placeholder="0.00"/>
                                    {form.formState.errors.amount && <p className="text-red-500 text-xs col-span-4 text-right">{form.formState.errors.amount.message}</p>}
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">Cancel</Button>
                                </DialogClose>
                                <Button type="submit">Save Payment</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
            
            <Tabs defaultValue="all" onValueChange={setTimeFilter} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="all">All Time</TabsTrigger>
                    <TabsTrigger value="weekly">This Week</TabsTrigger>
                    <TabsTrigger value="monthly">This Month</TabsTrigger>
                    <TabsTrigger value="yearly">This Year</TabsTrigger>
                </TabsList>

                <StatCard 
                    title="Total Salary Paid" 
                    value={formatCurrency(totalSalaryPaid)} 
                    icon={Wallet} 
                    description={`For the selected period`} 
                />

                <Card>
                    <CardHeader>
                        <CardTitle>Salary Payment History</CardTitle>
                        <CardDescription>A list of all salary payments for the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Employee Name</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {filteredSalaries.length > 0 ? (
                                filteredSalaries.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                                    <TableCell className="font-medium">{payment.employeeName}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    No salary payments for this period.
                                </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </Tabs>
        </div>
    )
}
