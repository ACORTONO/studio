
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import type { JobOrder, Expense, ExpenseItem, ExpenseCategory } from "@/lib/types";

// Mock data for initial state
const mockJobOrders: JobOrder[] = [
  {
    id: "1",
    jobOrderNumber: "JO-20230115-0001",
    clientName: "Alice Johnson",
    contactNumber: "123-456-7890",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: "i1", description: "Logo Design", quantity: 1, amount: 500, remarks: "Initial concept" }],
    totalAmount: 500,
    paidAmount: 500,
    paymentMethod: 'Cheque',
    bankName: 'BPI',
    chequeNumber: '123456',
    chequeDate: new Date().toISOString(),
    status: 'Completed',
    notes: "Client wants a modern, minimalist logo. Prefers blue and silver."
  },
  {
    id: "2",
    jobOrderNumber: "JO-20230116-0002",
    clientName: "Bob Williams",
    contactNumber: "098-765-4321",
    date: new Date().toISOString(),
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: "i2", description: "Website Development", quantity: 1, amount: 2500, remarks: "5 pages" }, { id: 'i3', description: 'Hosting (1 year)', quantity: 1, amount: 150, remarks: ''}],
    totalAmount: 2650,
    paidAmount: 1000,
    paymentMethod: 'Cash',
    status: 'In Progress',
    notes: ""
  },
   {
    id: "3",
    jobOrderNumber: "JO-20230117-0003",
    clientName: "Charlie Brown",
    contactNumber: "555-555-5555",
    date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: "i4", description: "Business Cards", quantity: 200, amount: 50, remarks: "Matte finish" }],
    totalAmount: 50,
    paidAmount: 0,
    paymentMethod: 'Cash',
    status: 'Pending',
    notes: "Awaiting payment before printing."
  },
  {
    id: "4",
    jobOrderNumber: "JO-20230118-0004",
    clientName: "Diana Prince",
    contactNumber: "111-222-3333",
    date: new Date().toISOString(),
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: 'i5', description: 'Social Media Campaign', quantity: 1, amount: 1200, remarks: '1 month management' }],
    totalAmount: 1200,
    paidAmount: 1200,
    paymentMethod: 'E-Wallet',
    eWalletReference: 'GCash Ref: 987654321',
    status: 'Completed',
    notes: 'Campaign for new product launch'
  },
  {
    id: "5",
    jobOrderNumber: "JO-20230119-0005",
    clientName: "Ethan Hunt",
    contactNumber: "444-555-6666",
    date: new Date().toISOString(),
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: 'i6', description: 'Video Production', quantity: 1, amount: 5000, remarks: '3-minute corporate video' }],
    totalAmount: 5000,
    paidAmount: 2500,
    paymentMethod: 'Bank Transfer',
    bankTransferReference: 'BDO Ref: ABC12345',
    status: 'In Progress',
    notes: 'First half paid upfront.'
  },
];

const mockExpenses: Expense[] = [
    { 
        id: 'e1', 
        date: new Date().toISOString(), 
        description: 'Software Subscription', 
        category: 'Fixed Expense',
        items: [{ id: 'ei1', description: 'Genkit AI Plan', amount: 50 }],
        totalAmount: 50 
    },
    { 
        id: 'e2', 
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), 
        description: 'Office Supplies', 
        category: 'General',
        items: [
            { id: 'ei2', description: 'Bond Paper Ream', amount: 5 },
            { id: 'ei3', description: 'Printer Ink', amount: 115 },
        ],
        totalAmount: 120
    },
];


interface JobOrderContextType {
  jobOrders: JobOrder[];
  expenses: Expense[];
  addJobOrder: (order: JobOrder) => void;
  updateJobOrder: (order: JobOrder) => void;
  getJobOrderById: (id: string) => JobOrder | undefined;
  addExpense: (expense: Omit<Expense, 'id' | 'date' | 'totalAmount'>) => void;
}

const JobOrderContext = createContext<JobOrderContextType | undefined>(
  undefined
);

export const JobOrderProvider = ({ children }: { children: ReactNode }) => {
  const [jobOrders, setJobOrders] = useState<JobOrder[]>(mockJobOrders);
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);

  const addJobOrder = (order: JobOrder) => {
    setJobOrders((prev) => [...prev, order]);
  };

  const updateJobOrder = (updatedOrder: JobOrder) => {
    setJobOrders(prev => prev.map(order => order.id === updatedOrder.id ? updatedOrder : order));
  };
  
  const getJobOrderById = useCallback((id: string) => {
    return jobOrders.find(order => order.id === id);
  }, [jobOrders]);

  const addExpense = (expense: Omit<Expense, 'id'|'date'|'totalAmount'>) => {
    const totalAmount = expense.items.reduce((sum, item) => sum + item.amount, 0);
    const newExpense: Expense = {
        ...expense,
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        items: expense.items.map(item => ({...item, id: crypto.randomUUID() })),
        totalAmount
    }
    setExpenses(prev => [...prev, newExpense]);
  }

  return (
    <JobOrderContext.Provider value={{ jobOrders, expenses, addJobOrder, updateJobOrder, getJobOrderById, addExpense }}>
      {children}
    </JobOrderContext.Provider>
  );
};

export const useJobOrders = () => {
  const context = useContext(JobOrderContext);
  if (context === undefined) {
    throw new Error("useJobOrders must be used within a JobOrderProvider");
  }
  return context;
};
