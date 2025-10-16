
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from "react";
import type { Invoice } from "@/lib/types";
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

interface InvoiceContextType {
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id' | 'userId'>) => void;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
  getInvoiceById: (id: string) => Invoice | undefined;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(
  undefined
);

export const InvoiceProvider = ({ children }: { children: ReactNode }) => {
  const firestore = useFirestore();
  const { user } = useUser();
  const invoicesRef = user ? collection(firestore, `users/${user.uid}/invoices`) : null;
  const { data: invoices, isLoading } = useCollection<Invoice>(invoicesRef);

  const addInvoice = (invoice: Omit<Invoice, 'id' | 'userId'>) => {
    if (!user || !invoicesRef) return;
    const newInvoice = { ...invoice };
    addDocumentNonBlocking(invoicesRef, newInvoice);
  };

  const updateInvoice = (updatedInvoice: Invoice) => {
    if (!user) return;
    const docRef = doc(firestore, `users/${user.uid}/invoices`, updatedInvoice.id);
    setDocumentNonBlocking(docRef, updatedInvoice, { merge: true });
  };

  const deleteInvoice = (id: string) => {
    if (!user) return;
    const docRef = doc(firestore, `users/${user.uid}/invoices`, id);
    deleteDocumentNonBlocking(docRef);
  };
  
  const getInvoiceById = useCallback((id: string) => {
    return invoices?.find(inv => inv.id === id);
  }, [invoices]);


  const value = useMemo(() => ({
    invoices: invoices || [],
    addInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceById
  }), [invoices, getInvoiceById, user]);


  return (
    <InvoiceContext.Provider value={value}>
      {isLoading ? <div>Loading...</div> : children}
    </InvoiceContext.Provider>
  );
};

export const useInvoices = () => {
  const context = useContext(InvoiceContext);
  if (context === undefined) {
    throw new Error("useInvoices must be used within an InvoiceProvider");
  }
  return context;
};
