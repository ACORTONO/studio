

"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import type { JobOrder, Expense, SalaryPayment, ExpenseCategory, PettyCash } from "@/lib/types";

// Mock data for initial state, used only if localStorage is empty
const mockJobOrders: JobOrder[] = [
  {
    id: "1",
    jobOrderNumber: "JO-20230115-0001",
    clientName: "Alice Johnson",
    contactMethod: 'Contact No.',
    contactDetail: "123-456-7890",
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: "i1", description: "Logo Design", quantity: 1, amount: 500, status: 'Paid' }],
    totalAmount: 500,
    paidAmount: 500,
    discount: 50,
    discountType: 'amount',
    paymentMethod: 'Cash',
  },
  {
    id: "2",
    jobOrderNumber: "JO-20230116-0002",
    clientName: "Bob Williams",
    contactMethod: 'Contact No.',
    contactDetail: "098-765-4321",
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: "i2", description: "Website Development", quantity: 1, amount: 2500, status: 'Downpayment' }, { id: 'i3', description: 'Hosting (1 year)', quantity: 1, amount: 150, status: 'Unpaid' }],
    totalAmount: 2650,
    paidAmount: 1000,
    discount: 0,
    discountType: 'amount',
    paymentMethod: 'Cash',
    notes: ""
  },
   {
    id: "3",
    jobOrderNumber: "JO-20230117-0003",
    clientName: "Charlie Brown",
    contactMethod: 'Contact No.',
    contactDetail: "555-555-5555",
    startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: "i4", description: "Business Cards", quantity: 200, amount: 50, status: 'Unpaid' }],
    totalAmount: 50,
    paidAmount: 0,
    discount: 0,
    discountType: 'amount',
    paymentMethod: 'Cash',
    notes: "Awaiting payment before printing."
  },
  {
    id: "4",
    jobOrderNumber: "JO-20230118-0004",
    clientName: "Diana Prince",
    contactMethod: 'FB Messenger',
    contactDetail: "diana.prince",
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: 'i5', description: 'Social Media Campaign', quantity: 1, amount: 1200, status: 'Paid' }],
    totalAmount: 1200,
    paidAmount: 1200,
    discount: 100,
    discountType: 'amount',
    paymentMethod: 'Cash',
    notes: 'Campaign for new product launch'
  },
  {
    id: "5",
    jobOrderNumber: "JO-20230119-0005",
    clientName: "Ethan Hunt",
    contactMethod: 'Contact No.',
    contactDetail: "444-555-6666",
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: 'i6', description: 'Video Production', quantity: 1, amount: 5000, status: 'Downpayment' }],
    totalAmount: 5000,
    paidAmount: 2500,
    discount: 10,
    discountType: 'percent',
    paymentMethod: 'Cash',
    notes: 'First half paid upfront.'
  },
  {
    id: "6",
    jobOrderNumber: "JO-20230120-0006",
    clientName: "Felicity Smoak",
    contactMethod: 'Email',
    contactDetail: "felicity@queen-consolidated.com",
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: 'i7', description: 'Network Security Audit', quantity: 1, amount: 3500, status: 'Unpaid' }],
    totalAmount: 3500,
    paidAmount: 0,
    discount: 0,
    discountType: 'amount',
    paymentMethod: 'Cash',
    notes: 'Requires on-site visit.'
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

const mockPettyCash: PettyCash[] = [
    { id: 'pc1', date: new Date().toISOString(), description: 'Initial float for the day', amount: 1000 },
    { id: 'pc2', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), description: 'Lunch money', amount: 500 },
];

interface JobOrderContextType {
  jobOrders: JobOrder[];
  expenses: Expense[];
  pettyCash: PettyCash[];
  addJobOrder: (order: JobOrder) => void;
  updateJobOrder: (order: JobOrder) => void;
  deleteJobOrder: (id: string) => void;
  getJobOrderById: (id: string) => JobOrder | undefined;
  addExpense: (expense: Omit<Expense, 'id' | 'date' | 'totalAmount'>) => void;
  updateExpense: (expense: Omit<Expense, 'date' | 'totalAmount'>) => void;
  deleteExpense: (expenseId: string) => void;
  addPettyCash: (entry: Omit<PettyCash, 'id' | 'date'>) => void;
  updatePettyCash: (entry: PettyCash) => void;
  deletePettyCash: (id: string) => void;
}

const JobOrderContext = createContext<JobOrderContextType | undefined>(
  undefined
);

export const JobOrderProvider = ({ children }: { children: ReactNode }) => {
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pettyCash, setPettyCash] = useState<PettyCash[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        try {
            const storedJobOrders = localStorage.getItem('jobOrders');
            const storedExpenses = localStorage.getItem('expenses');
            const storedPettyCash = localStorage.getItem('pettyCash');

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
            if (storedPettyCash) {
                setPettyCash(JSON.parse(storedPettyCash));
            } else {
                setPettyCash(mockPettyCash);
            }
        } catch (error) {
            console.error("Failed to parse data from localStorage", error);
            setJobOrders(mockJobOrders);
            setExpenses(mockExpenses);
            setPettyCash(mockPettyCash);
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

  useEffect(() => {
    if (isDataLoaded && typeof window !== 'undefined') {
        try {
            localStorage.setItem('pettyCash', JSON.stringify(pettyCash));
        } catch (error) {
            console.error("Failed to save petty cash to localStorage", error);
        }
    }
    }, [pettyCash, isDataLoaded]);


  const addJobOrder = (order: JobOrder) => {
    setJobOrders((prev) => [...prev, order]);
  };

  const updateJobOrder = (updatedOrder: JobOrder) => {
    setJobOrders(prev => prev.map(order => order.id === updatedOrder.id ? updatedOrder : order));
  };
  
  const deleteJobOrder = (id: string) => {
    setJobOrders(prev => prev.filter(order => order.id !== id));
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
        items: expense.items.map(item => ({...item, id: item.id || crypto.randomUUID() })),
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

  const addPettyCash = (entry: Omit<PettyCash, 'id' | 'date'>) => {
    const newEntry: PettyCash = {
      ...entry,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };
    setPettyCash(prev => [...prev, newEntry]);
  };

  const updatePettyCash = (updatedEntry: PettyCash) => {
    setPettyCash(prev => prev.map(pc => pc.id === updatedEntry.id ? { ...updatedEntry, date: pc.date } : pc));
  };

  const deletePettyCash = (id: string) => {
    setPettyCash(prev => prev.filter(pc => pc.id !== id));
  };

  return (
    <JobOrderContext.Provider value={{ jobOrders, expenses, pettyCash, addJobOrder, updateJobOrder, deleteJobOrder, getJobOrderById, addExpense, updateExpense, deleteExpense, addPettyCash, updatePettyCash, deletePettyCash }}>
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
