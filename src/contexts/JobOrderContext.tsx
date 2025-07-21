"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import type { JobOrder, Expense } from "@/lib/types";

// Mock data for initial state
const mockJobOrders: JobOrder[] = [
  {
    id: "1",
    jobOrderNumber: "JO-20230115-0001",
    clientName: "Alice Johnson",
    contactNumber: "123-456-7890",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ id: "i1", description: "Logo Design", quantity: 1, amount: 500, remarks: "Initial concept" }],
    totalAmount: 500,
  },
  {
    id: "2",
    jobOrderNumber: "JO-20230116-0002",
    clientName: "Bob Williams",
    contactNumber: "098-765-4321",
    date: new Date().toISOString(),
    items: [{ id: "i2", description: "Website Development", quantity: 1, amount: 2500, remarks: "5 pages" }, { id: 'i3', description: 'Hosting (1 year)', quantity: 1, amount: 150, remarks: ''}],
    totalAmount: 2650,
  },
];

const mockExpenses: Expense[] = [
    { id: 'e1', date: new Date().toISOString(), description: 'Software Subscription', amount: 50 },
    { id: 'e2', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), description: 'Office Supplies', amount: 120 },
];


interface JobOrderContextType {
  jobOrders: JobOrder[];
  expenses: Expense[];
  addJobOrder: (order: JobOrder) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => void;
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

  const addExpense = (expense: Omit<Expense, 'id'|'date'>) => {
    const newExpense: Expense = {
        ...expense,
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
    }
    setExpenses(prev => [...prev, newExpense]);
  }

  return (
    <JobOrderContext.Provider value={{ jobOrders, expenses, addJobOrder, addExpense }}>
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
