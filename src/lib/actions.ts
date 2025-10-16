

"use server";

import { generateJobOrderNumber } from "@/ai/flows/generate-job-order-number";
import { generateInvoiceNumber } from "@/ai/flows/generate-invoice-number";
import type { JobOrder, Payment, Invoice } from "@/lib/types";
import { z } from "zod";

const jobOrderItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required."),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0."),
  amount: z.coerce.number().min(0, "Amount is required."),
  status: z.enum(['Unpaid', 'Paid', 'Downpayment', 'Cheque']).default('Unpaid'),
});

const jobOrderSchema = z.object({
  clientName: z.string().min(1, "Client name is required."),
  contactMethod: z.enum(['Contact No.', 'FB Messenger', 'Email']).default('Contact No.'),
  contactDetail: z.string().min(1, "Contact detail is required."),
  startDate: z.date({ required_error: "A start date is required." }),
  dueDate: z.date({ required_error: "A due date is required." }),
  notes: z.string().optional(),
  paidAmount: z.coerce.number().min(0).optional().default(0),
  discount: z.coerce.number().min(0).optional().default(0),
  discountType: z.enum(['amount', 'percent']).default('amount'),
  paymentMethod: z.enum(['Cash', 'E-Wallet (GCASH, MAYA)', 'Cheque', 'Bank Transfer']).default('Cash'),
  paymentReference: z.string().optional(),
  chequeBankName: z.string().optional(),
  chequeNumber: z.string().optional(),
  chequeDate: z.date().optional(),
  items: z.array(jobOrderItemSchema).min(1, "At least one item is required."),
});

const updateJobOrderSchema = jobOrderSchema.extend({
    id: z.string(),
    jobOrderNumber: z.string(),
});


export async function createJobOrderAction(
  formData: z.infer<typeof jobOrderSchema>,
  existingJobOrderNumbers: string[]
): Promise<{ success: boolean; data?: Omit<JobOrder, 'id'|'userId'>; error?: any }> {
  const validation = jobOrderSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: validation.error.format() };
  }

  try {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { jobOrderNumber } = await generateJobOrderNumber({ existingJobOrderNumbers, currentDate });
    if (!jobOrderNumber) {
      throw new Error("Failed to generate job order number.");
    }

    const validatedData = validation.data;
    
    const totalAmount = validatedData.items.reduce(
      (acc, item) => acc + item.quantity * item.amount,
      0
    );
    
    const newJobOrder: Omit<JobOrder, 'id'|'userId'> = {
      jobOrderNumber,
      clientName: validatedData.clientName,
      contactMethod: validatedData.contactMethod,
      contactDetail: validatedData.contactDetail,
      startDate: validatedData.startDate.toISOString(),
      dueDate: validatedData.dueDate.toISOString(),
      notes: validatedData.notes,
      paidAmount: validatedData.paidAmount || 0,
      discount: validatedData.discount,
      discountType: validatedData.discountType,
      items: validatedData.items.map((item) => ({
        ...item,
        id: item.id || crypto.randomUUID(),
      })),
      totalAmount,
      status: 'Pending',
      paymentMethod: validatedData.paymentMethod,
      paymentReference: validatedData.paymentReference,
      chequeBankName: validatedData.chequeBankName,
      chequeNumber: validatedData.chequeNumber,
      chequeDate: validatedData.chequeDate?.toISOString(),
    };

    return { success: true, data: newJobOrder };
  } catch (error) {
    console.error(error);
    return { success: false, error: "An unexpected error occurred." };
  }
}


export async function updateJobOrderAction(
  formData: z.infer<typeof updateJobOrderSchema>
): Promise<{ success: boolean; data?: JobOrder; error?: any }> {
    const validation = updateJobOrderSchema.safeParse(formData);
    if (!validation.success) {
        return { success: false, error: validation.error.format() };
    }

    try {
        const validatedData = validation.data;

        const totalAmount = validatedData.items.reduce(
            (acc, item) => acc + item.quantity * item.amount,
            0
        );

        const updatedJobOrder: JobOrder = {
            id: validatedData.id,
            userId: '', // This will be set in the context
            jobOrderNumber: validatedData.jobOrderNumber,
            clientName: validatedData.clientName,
            contactMethod: validatedData.contactMethod,
            contactDetail: validatedData.contactDetail,
            startDate: validatedData.startDate.toISOString(),
            dueDate: validatedData.dueDate.toISOString(),
            notes: validatedData.notes,
            paidAmount: validatedData.paidAmount || 0,
            discount: validatedData.discount,
            discountType: validatedData.discountType,
            items: validatedData.items.map((item) => ({
                ...item,
                id: item.id || crypto.randomUUID(),
            })),
            totalAmount,
            status: 'Pending',
            paymentMethod: validatedData.paymentMethod,
            paymentReference: validatedData.paymentReference,
            chequeBankName: validatedData.chequeBankName,
            chequeNumber: validatedData.chequeNumber,
            chequeDate: validatedData.chequeDate?.toISOString(),
        };
        
        return { success: true, data: updatedJobOrder };
    } catch (error) {
        console.error(error);
        return { success: false, error: "An unexpected error occurred." };
    }
}


// Invoice Actions
const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required."),
  quantity: z.coerce.number().min(0.01, "Quantity must be > 0."),
  amount: z.coerce.number().min(0, "Amount must be >= 0."),
});

const invoiceSchemaBase = z.object({
  clientName: z.string().min(1, "Client name is required."),
  address: z.string().min(1, "Address is required."),
  tinNumber: z.string().optional(),
  date: z.date({ required_error: "An invoice date is required." }),
  dueDate: z.date({ required_error: "A due date is required." }),
  termsAndConditions: z.string().optional(),
  status: z.enum(["Unpaid", "Paid"]),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required."),
  discount: z.coerce.number().min(0).optional().default(0),
  discountType: z.enum(['amount', 'percent']).default('amount'),
  tax: z.coerce.number().min(0).optional().default(0),
  taxType: z.enum(['amount', 'percent']).default('amount'),
  paymentMethod: z.enum(['Cash', 'Bank Transfer', 'E-Wallet', 'Cheque']).optional(),
  paymentDetails: z.string().optional(),
});

const invoiceSchema = invoiceSchemaBase;

const updateInvoiceSchema = invoiceSchemaBase.extend({
    id: z.string(),
    invoiceNumber: z.string(),
});

export async function createInvoiceAction(
  formData: z.infer<typeof invoiceSchema>,
  existingInvoiceNumbers: string[]
): Promise<{ success: boolean; data?: Omit<Invoice, 'id' | 'userId'>; error?: any }> {
  const validation = invoiceSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: validation.error.format() };
  }

  try {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { invoiceNumber } = await generateInvoiceNumber({ existingInvoiceNumbers, currentDate });
    if (!invoiceNumber) {
      throw new Error("Failed to generate invoice number.");
    }

    const validatedData = validation.data;
    
    const subtotal = validatedData.items.reduce(
      (acc, item) => acc + item.quantity * item.amount,
      0
    );

    const discountValue = validatedData.discount || 0;
    const discountAmount = validatedData.discountType === 'percent' ? subtotal * (discountValue / 100) : discountValue;
    
    const taxValue = validatedData.tax || 0;
    const taxAmount = validatedData.taxType === 'percent' ? (subtotal - discountAmount) * (taxValue / 100) : taxValue;

    const totalAmount = subtotal - discountAmount + taxAmount;

    const newInvoice: Omit<Invoice, 'id' | 'userId'> = {
      invoiceNumber,
      clientName: validatedData.clientName,
      address: validatedData.address,
      tinNumber: validatedData.tinNumber,
      date: validatedData.date.toISOString(),
      dueDate: validatedData.dueDate.toISOString(),
      termsAndConditions: validatedData.termsAndConditions,
      status: validatedData.status,
      items: validatedData.items.map((item) => ({
        ...item,
        id: item.id || crypto.randomUUID(),
      })),
      discount: validatedData.discount,
      discountType: validatedData.discountType,
      tax: validatedData.tax,
      taxType: validatedData.taxType,
      totalAmount,
      paymentMethod: validatedData.paymentMethod,
      paymentDetails: validatedData.paymentDetails,
    };

    return { success: true, data: newInvoice };
  } catch (error) {
    console.error(error);
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function updateInvoiceAction(
  formData: z.infer<typeof updateInvoiceSchema>
): Promise<{ success: boolean; data?: Invoice; error?: any }> {
    const validation = updateInvoiceSchema.safeParse(formData);
    if (!validation.success) {
        return { success: false, error: validation.error.format() };
    }

    try {
        const validatedData = validation.data;
        
        const subtotal = validatedData.items.reduce(
            (acc, item) => acc + item.quantity * item.amount,
            0
        );

        const discountValue = validatedData.discount || 0;
        const discountAmount = validatedData.discountType === 'percent' ? subtotal * (discountValue / 100) : discountValue;

        const taxValue = validatedData.tax || 0;
        const taxAmount = validatedData.taxType === 'percent' ? (subtotal - discountAmount) * (taxValue / 100) : taxValue;

        const totalAmount = subtotal - discountAmount + taxAmount;

        const updatedInvoice: Invoice = {
            id: validatedData.id,
            userId: '', // This will be set in the context
            invoiceNumber: validatedData.invoiceNumber,
            clientName: validatedData.clientName,
            address: validatedData.address,
            tinNumber: validatedData.tinNumber,
            date: validatedData.date.toISOString(),
            dueDate: validatedData.dueDate.toISOString(),
            termsAndConditions: validatedData.termsAndConditions,
            status: validatedData.status,
            items: validatedData.items.map((item) => ({
                ...item,
                id: item.id || crypto.randomUUID(),
            })),
            discount: validatedData.discount,
            discountType: validatedData.discountType,
            tax: validatedData.tax,
            taxType: validatedData.taxType,
            totalAmount,
            paymentMethod: validatedData.paymentMethod,
            paymentDetails: validatedData.paymentDetails,
        };
        
        return { success: true, data: updatedInvoice };
    } catch (error) {
        console.error(error);
        return { success: false, error: "An unexpected error occurred." };
    }
}
