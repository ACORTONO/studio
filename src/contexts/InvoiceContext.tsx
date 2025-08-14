
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import type { Invoice } from "@/lib/types";

// Mock data for initial state, used only if localStorage is empty
const mockInvoices: Invoice[] = [
  {
    id: "inv-1",
    invoiceNumber: "INV-2024-0001",
    clientName: "Creative Solutions Inc.",
    address: "123 Innovation Drive, Suite 100, Tech City, USA 12345",
    tinNumber: "123-456-789-000",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { id: "inv-i1", description: "Web Design Mockup", quantity: 1, amount: 1200 },
      { id: "inv-i2", description: "Logo Concept sketches", quantity: 3, amount: 150 },
    ],
    totalAmount: 1650,
    status: 'Unpaid',
    notes: "Initial project phase billing."
  },
  {
    id: "inv-2",
    invoiceNumber: "INV-2024-0002",
    clientName: "Tech Innovators LLC",
    address: "456 Future Way, Silicon Valley, CA 94043",
    tinNumber: "987-654-321-000",
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { id: "inv-i3", description: "Monthly Retainer - SEO Services", quantity: 1, amount: 2000 },
    ],
    totalAmount: 2000,
    status: 'Paid',
    notes: "Payment received via bank transfer."
  },
];


interface InvoiceContextType {
  invoices: Invoice[];
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
  getInvoiceById: (id: string) => Invoice | undefined;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(
  undefined
);

export const InvoiceProvider = ({ children }: { children: ReactNode }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        try {
            const storedInvoices = localStorage.getItem('invoices');

            if (storedInvoices) {
                setInvoices(JSON.parse(storedInvoices));
            } else {
                setInvoices(mockInvoices);
            }
        } catch (error) {
            console.error("Failed to parse data from localStorage", error);
            setInvoices(mockInvoices);
        }
        setIsDataLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isDataLoaded && typeof window !== 'undefined') {
        try {
            localStorage.setItem('invoices', JSON.stringify(invoices));
        } catch (error) {
            console.error("Failed to save invoices to localStorage", error);
        }
    }
  }, [invoices, isDataLoaded]);

  const addInvoice = (invoice: Invoice) => {
    setInvoices((prev) => [...prev, invoice]);
  };

  const updateInvoice = (updatedInvoice: Invoice) => {
    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
  };

  const deleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  };
  
  const getInvoiceById = useCallback((id: string) => {
    return invoices.find(inv => inv.id === id);
  }, [invoices]);


  return (
    <InvoiceContext.Provider value={{ invoices, addInvoice, updateInvoice, deleteInvoice, getInvoiceById }}>
      {children}
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
