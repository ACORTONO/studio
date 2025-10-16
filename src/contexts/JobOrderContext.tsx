
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from "react";
import type { JobOrder, Expense, PettyCash } from "@/lib/types";
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";


interface JobOrderContextType {
  jobOrders: JobOrder[];
  expenses: Expense[];
  pettyCash: PettyCash[];
  addJobOrder: (order: Omit<JobOrder, 'id' | 'userId'>) => void;
  updateJobOrder: (order: JobOrder) => void;
  deleteJobOrder: (id: string) => void;
  getJobOrderById: (id: string) => JobOrder | undefined;
  addExpense: (expense: Omit<Expense, 'id' | 'date' | 'totalAmount' | 'userId'>) => void;
  updateExpense: (expense: Omit<Expense, 'date' | 'totalAmount' | 'userId'> & { id: string }) => void;
  deleteExpense: (expenseId: string) => void;
  addPettyCash: (entry: Omit<PettyCash, 'id' | 'date' | 'userId'>) => void;
  updatePettyCash: (entry: PettyCash) => void;
  deletePettyCash: (id: string) => void;
}

const JobOrderContext = createContext<JobOrderContextType | undefined>(
  undefined
);

export const JobOrderProvider = ({ children }: { children: ReactNode }) => {
  const firestore = useFirestore();
  const { user } = useUser();

  const jobOrdersRef = user ? collection(firestore, `users/${user.uid}/jobOrders`) : null;
  const expensesRef = user ? collection(firestore, `users/${user.uid}/expenses`) : null;
  const pettyCashRef = user ? collection(firestore, `users/${user.uid}/pettyCash`) : null;

  const { data: jobOrders, isLoading: jobOrdersLoading } = useCollection<JobOrder>(jobOrdersRef);
  const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesRef);
  const { data: pettyCash, isLoading: pettyCashLoading } = useCollection<PettyCash>(pettyCashRef);

  const addJobOrder = (order: Omit<JobOrder, 'id' | 'userId'>) => {
    if (!user || !jobOrdersRef) return;
    const newOrder = { ...order, userId: user.uid };
    addDocumentNonBlocking(jobOrdersRef, newOrder);
  };

  const updateJobOrder = (updatedOrder: JobOrder) => {
    if (!user) return;
    const docRef = doc(firestore, `users/${user.uid}/jobOrders`, updatedOrder.id);
    setDocumentNonBlocking(docRef, updatedOrder, { merge: true });
  };
  
  const deleteJobOrder = (id: string) => {
    if (!user) return;
    const docRef = doc(firestore, `users/${user.uid}/jobOrders`, id);
    deleteDocumentNonBlocking(docRef);
  };

  const getJobOrderById = useCallback((id: string) => {
    return jobOrders?.find(order => order.id === id);
  }, [jobOrders]);

  const addExpense = (expense: Omit<Expense, 'id'|'date'|'totalAmount' | 'userId'>) => {
    if (!user || !expensesRef) return;
    const totalAmount = expense.items.reduce((sum, item) => sum + item.amount, 0);
    const newExpense: Omit<Expense, 'id' | 'userId'> = {
        ...expense,
        date: new Date().toISOString(),
        items: expense.items.map(item => ({...item, id: item.id || crypto.randomUUID() })),
        totalAmount
    }
    addDocumentNonBlocking(expensesRef, newExpense);
  }

  const updateExpense = (expense: Omit<Expense, 'date' | 'totalAmount' | 'userId'> & { id: string }) => {
    if (!user) return;
    const totalAmount = expense.items.reduce((sum, item) => sum + item.amount, 0);
    const docRef = doc(firestore, `users/${user.uid}/expenses`, expense.id);
    const originalExpense = expenses?.find(e => e.id === expense.id);

    if (originalExpense) {
      const updatedData = {
          ...originalExpense,
          ...expense,
          items: expense.items.map(item => ({...item, id: item.id || crypto.randomUUID() })),
          totalAmount
      };
      setDocumentNonBlocking(docRef, updatedData, { merge: true });
    }
  }

  const deleteExpense = (expenseId: string) => {
    if (!user) return;
    const docRef = doc(firestore, `users/${user.uid}/expenses`, expenseId);
    deleteDocumentNonBlocking(docRef);
  }

  const addPettyCash = (entry: Omit<PettyCash, 'id' | 'date' | 'userId'>) => {
    if (!user || !pettyCashRef) return;
    const newEntry: Omit<PettyCash, 'id'> = {
      ...entry,
      userId: user.uid,
      date: new Date().toISOString(),
    };
    addDocumentNonBlocking(pettyCashRef, newEntry);
  };

  const updatePettyCash = (updatedEntry: PettyCash) => {
    if (!user) return;
    const docRef = doc(firestore, `users/${user.uid}/pettyCash`, updatedEntry.id);
    setDocumentNonBlocking(docRef, updatedEntry, { merge: true });
  };

  const deletePettyCash = (id: string) => {
    if (!user) return;
    const docRef = doc(firestore, `users/${user.uid}/pettyCash`, id);
    deleteDocumentNonBlocking(docRef);
  };

  const isLoading = jobOrdersLoading || expensesLoading || pettyCashLoading;

  const value = useMemo(() => ({
    jobOrders: jobOrders || [],
    expenses: expenses || [],
    pettyCash: pettyCash || [],
    addJobOrder,
    updateJobOrder,
    deleteJobOrder,
    getJobOrderById,
    addExpense,
    updateExpense,
    deleteExpense,
    addPettyCash,
    updatePettyCash,
    deletePettyCash,
  }), [jobOrders, expenses, pettyCash, user, getJobOrderById]);

  return (
    <JobOrderContext.Provider value={value}>
      {isLoading ? <div>Loading...</div> : children}
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
