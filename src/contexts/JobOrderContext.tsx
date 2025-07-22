
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import type { JobOrder, Expense, SalaryPayment, ExpenseCategory } from "@/lib/types";

// Mock data for initial state, used only if localStorage is empty
const mockJobOrders: JobOrder[] = [
  {
    id: "1",
    jobOrderNumber: "JO-20230115-0001",
    clientName: "Alice Johnson",
    contactNumber: "123-456-7890",
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: "i1", description: "Logo Design", quantity: 1, amount: 500, remarks: "Initial concept" }],
    totalAmount: 500,
    discount: 50,
    discountType: 'amount',
    downpayment: 200,
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
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: "i2", description: "Website Development", quantity: 1, amount: 2500, remarks: "5 pages" }, { id: 'i3', description: 'Hosting (1 year)', quantity: 1, amount: 150, remarks: ''}],
    totalAmount: 2650,
    discount: 0,
    discountType: 'amount',
    downpayment: 1000,
    paymentMethod: 'Cash',
    status: 'In Progress',
    notes: ""
  },
   {
    id: "3",
    jobOrderNumber: "JO-20230117-0003",
    clientName: "Charlie Brown",
    contactNumber: "555-555-5555",
    startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: "i4", description: "Business Cards", quantity: 200, amount: 50, remarks: "Matte finish" }],
    totalAmount: 50,
    discount: 0,
    discountType: 'amount',
    downpayment: 0,
    paymentMethod: 'Cash',
    status: 'Pending',
    notes: "Awaiting payment before printing."
  },
  {
    id: "4",
    jobOrderNumber: "JO-20230118-0004",
    clientName: "Diana Prince",
    contactNumber: "111-222-3333",
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: 'i5', description: 'Social Media Campaign', quantity: 1, amount: 1200, remarks: '1 month management' }],
    totalAmount: 1200,
    discount: 100,
    discountType: 'amount',
    downpayment: 1100,
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
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: 'i6', description: 'Video Production', quantity: 1, amount: 5000, remarks: '3-minute corporate video' }],
    totalAmount: 5000,
    discount: 10,
    discountType: 'percent',
    downpayment: 2500,
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
    { id: 'e3', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), description: 'Salary for John Doe', category: 'Salary', items: [{id: 'ei4', description: 'Salary Payment', amount: 1200}], totalAmount: 1200 },
    { id: 'e4', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), description: 'Salary for Jane Smith', category: 'Salary', items: [{id: 'ei5', description: 'Salary Payment', amount: 1250}], totalAmount: 1250 },
];

interface JobOrderContextType {
  jobOrders: JobOrder[];
  expenses: Expense[];
  addJobOrder: (order: JobOrder) => void;
  updateJobOrder: (order: JobOrder) => void;
  getJobOrderById: (id: string) => JobOrder | undefined;
  addExpense: (expense: Omit<Expense, 'id' | 'date' | 'totalAmount'>) => void;
  updateExpense: (expense: Omit<Expense, 'date' | 'totalAmount'>) => void;
  deleteExpense: (expenseId: string) => void;
}

const JobOrderContext = createContext<JobOrderContextType | undefined>(
  undefined
);

export const JobOrderProvider = ({ children }: { children: ReactNode }) => {
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        try {
            const storedJobOrders = localStorage.getItem('jobOrders');
            const storedExpenses = localStorage.getItem('expenses');

            if (storedJobOrders) {
                setJobOrders(JSON.parse(storedJobOrders));
            } else {
                setJobOrders(mockJobOrders);
            }

            if (storedExpenses) {
                setExpenses(JSON.parse(storedExpenses));
            } else {
                setExpenses(mockExpenses);
            }
        } catch (error) {
            console.error("Failed to parse data from localStorage", error);
            setJobOrders(mockJobOrders);
            setExpenses(mockExpenses);
        }
        setIsDataLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isDataLoaded && typeof window !== 'undefined') {
        try {
            localStorage.setItem('jobOrders', JSON.stringify(jobOrders));
        } catch (error) {
            console.error("Failed to save job orders to localStorage", error);
        }
    }
  }, [jobOrders, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded && typeof window !== 'undefined') {
        try {
            localStorage.setItem('expenses', JSON.stringify(expenses));
        } catch (error) {
            console.error("Failed to save expenses to localStorage", error);
        }
    }
  }, [expenses, isDataLoaded]);

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

  const updateExpense = (expense: Omit<Expense, 'date' | 'totalAmount'>) => {
    const totalAmount = expense.items.reduce((sum, item) => sum + item.amount, 0);
    setExpenses(prev => prev.map(e => {
        if (e.id === expense.id) {
            return {
                ...e, // keep original date
                ...expense,
                items: expense.items.map(item => ({...item, id: item.id || crypto.randomUUID() })),
                totalAmount
            };
        }
        return e;
    }));
  }

  const deleteExpense = (expenseId: string) => {
    setExpenses(prev => prev.filter(e => e.id !== expenseId));
  }

  return (
    <JobOrderContext.Provider value={{ jobOrders, expenses, addJobOrder, updateJobOrder, getJobOrderById, addExpense, updateExpense, deleteExpense }}>
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

    