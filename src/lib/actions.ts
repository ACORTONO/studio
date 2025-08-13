

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
  remarks: z.string().optional(),
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
): Promise<{ success: boolean; data?: JobOrder; error?: any }> {
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
    
    const itemStatuses = validatedData.items.map(item => item.status);
    let derivedStatus: JobOrder['status'] = 'Pending';
    if (itemStatuses.every(s => s === 'Paid')) {
        derivedStatus = 'Completed';
    } else if (itemStatuses.some(s => s === 'Paid' || s === 'Downpayment' || s === 'Cheque') || (validatedData.paidAmount || 0) > 0) {
        derivedStatus = 'Downpayment';
    }


    const newJobOrder: JobOrder = {
      id: crypto.randomUUID(),
      jobOrderNumber,
      clientName: validatedData.clientName,
      contactMethod: validatedData.contactMethod,
      contactDetail: validatedData.contactDetail,
      startDate: validatedData.startDate.toISOString(),
      dueDate: validatedData.dueDate.toISOString(),
      notes: validatedData.notes,
      status: derivedStatus,
      paidAmount: validatedData.paidAmount || 0,
      discount: validatedData.discount,
      discountType: validatedData.discountType,
      items: validatedData.items.map((item) => ({
        ...item,
        id: item.id || crypto.randomUUID(),
      })),
      totalAmount,
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
    
        const itemStatuses = validatedData.items.map(item => item.status);
        let derivedStatus: JobOrder['status'] = 'Pending';
        if (itemStatuses.every(s => s === 'Paid')) {
            derivedStatus = 'Completed';
        } else if (itemStatuses.some(s => s === 'Paid' || s === 'Downpayment' || s === 'Cheque') || (validatedData.paidAmount || 0) > 0) {
            derivedStatus = 'Downpayment';
        }


        const updatedJobOrder: JobOrder = {
            id: validatedData.id,
            jobOrderNumber: validatedData.jobOrderNumber,
            clientName: validatedData.clientName,
            contactMethod: validatedData.contactMethod,
            contactDetail: validatedData.contactDetail,
            startDate: validatedData.startDate.toISOString(),
            dueDate: validatedData.dueDate.toISOString(),
            notes: validatedData.notes,
            status: derivedStatus,
            paidAmount: validatedData.paidAmount || 0,
            discount: validatedData.discount,
            discountType: validatedData.discountType,
            items: validatedData.items.map((item) => ({
                ...item,
                id: item.id || crypto.randomUUID(),
            })),
            totalAmount,
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
  date: z.date({ required_error: "An invoice date is required." }),
  dueDate: z.date({ required_error: "A due date is required." }),
  notes: z.string().optional(),
  status: z.enum(["Unpaid", "Paid"]),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required."),
});

const invoiceSchema = invoiceSchemaBase;

const updateInvoiceSchema = invoiceSchemaBase.extend({
    id: z.string(),
    invoiceNumber: z.string(),
});

export async function createInvoiceAction(
  formData: z.infer<typeof invoiceSchema>,
  existingInvoiceNumbers: string[]
): Promise<{ success: boolean; data?: Invoice; error?: any }> {
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

    const totalAmount = validation.data.items.reduce(
      (acc, item) => acc + item.quantity * item.amount,
      0
    );

    const validatedData = validation.data;

    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
      invoiceNumber,
      clientName: validatedData.clientName,
      date: validatedData.date.toISOString(),
      dueDate: validatedData.dueDate.toISOString(),
      notes: validatedData.notes,
      status: validatedData.status,
      items: validatedData.items.map((item) => ({
        ...item,
        id: item.id || crypto.randomUUID(),
      })),
      totalAmount,
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
        const existingInvoice = validation.data;
        const totalAmount = existingInvoice.items.reduce(
            (acc, item) => acc + item.quantity * item.amount,
            0
        );

        const updatedInvoice: Invoice = {
            id: existingInvoice.id,
            invoiceNumber: existingInvoice.invoiceNumber,
            clientName: existingInvoice.clientName,
            date: existingInvoice.date.toISOString(),
            dueDate: existingInvoice.dueDate.toISOString(),
            notes: existingInvoice.notes,
            status: existingInvoice.status,
            items: existingInvoice.items.map((item) => ({
                ...item,
                id: item.id || crypto.randomUUID(),
            })),
            totalAmount,
        };
        
        return { success: true, data: updatedInvoice };
    } catch (error) {
        console.error(error);
        return { success: false, error: "An unexpected error occurred." };
    }
}

    
