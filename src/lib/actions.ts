

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
  status: z.enum(['Unpaid', 'Paid', 'Balance']).default('Unpaid'),
});

const paymentSchema = z.object({
    id: z.string(),
    date: z.string(),
    amount: z.number(),
    notes: z.string().optional(),
});

const jobOrderSchemaBase = z.object({
  clientName: z.string().min(1, "Client name is required."),
  contactMethod: z.enum(['Contact No.', 'FB Messenger', 'Email']).default('Contact No.'),
  contactDetail: z.string().min(1, "Contact detail is required."),
  startDate: z.date({ required_error: "A start date is required." }),
  dueDate: z.date({ required_error: "A due date is required." }),
  notes: z.string().optional(),
  status: z.enum(["Pending", "Balance", "Completed", "Cancelled"]),
  discount: z.coerce.number().min(0).optional().default(0),
  discountType: z.enum(['amount', 'percent']).default('amount'),
  downpayment: z.coerce.number().min(0).optional().default(0),
  items: z.array(jobOrderItemSchema).min(1, "At least one item is required."),
  payments: z.array(paymentSchema).optional().default([]),
  paymentMethod: z.enum(["Cash", "Cheque", "E-Wallet", "Bank Transfer"]).default("Cash"),
  bankName: z.string().optional(),
  chequeNumber: z.string().optional(),
  chequeDate: z.date().optional(),
  eWalletReference: z.string().optional(),
  bankTransferReference: z.string().optional(),
});

const refinement = (data: z.infer<typeof jobOrderSchemaBase>, ctx: z.RefinementCtx) => {
    if (data.paymentMethod === 'Cheque') {
        if (!data.bankName) {
            ctx.addIssue({ code: 'custom', message: 'Bank name is required for cheque payments.', path: ['bankName']});
        }
        if (!data.chequeNumber) {
            ctx.addIssue({ code: 'custom', message: 'Cheque number is required for cheque payments.', path: ['chequeNumber']});
        }
        if (!data.chequeDate) {
            ctx.addIssue({ code: 'custom', message: 'Cheque date is required for cheque payments.', path: ['chequeDate']});
        }
    }
    if (data.paymentMethod === 'E-Wallet' && !data.eWalletReference) {
        ctx.addIssue({ code: 'custom', message: 'E-Wallet reference is required.', path: ['eWalletReference']});
    }
    if (data.paymentMethod === 'Bank Transfer' && !data.bankTransferReference) {
        ctx.addIssue({ code: 'custom', message: 'Bank transfer reference is required.', path: ['bankTransferReference']});
    }
};

const jobOrderSchema = jobOrderSchemaBase.superRefine(refinement);

const updateJobOrderSchema = jobOrderSchemaBase.extend({
    id: z.string(),
    jobOrderNumber: z.string(),
}).superRefine(refinement);


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

    const totalAmount = validation.data.items.reduce(
      (acc, item) => acc + item.quantity * item.amount,
      0
    );
    
    const validatedData = validation.data;
    const initialDownpayment = validatedData.downpayment || 0;
    const payments: Payment[] = [];

    if (initialDownpayment > 0) {
        payments.push({
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            amount: initialDownpayment,
            notes: "Initial downpayment"
        });
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
      status: validatedData.status,
      discount: validatedData.discount,
      discountType: validatedData.discountType,
      downpayment: validatedData.downpayment,
      paidAmount: initialDownpayment,
      payments: payments,
      items: validatedData.items.map((item) => ({
        ...item,
        id: item.id || crypto.randomUUID(),
      })),
      totalAmount,
      paymentMethod: validatedData.paymentMethod,
      bankName: validatedData.bankName,
      chequeNumber: validatedData.chequeNumber,
      chequeDate: validatedData.chequeDate?.toISOString(),
      eWalletReference: validatedData.eWalletReference,
      bankTransferReference: validatedData.bankTransferReference,
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
        const existingJobOrder = validation.data;
        const totalAmount = existingJobOrder.items.reduce(
            (acc, item) => acc + item.quantity * item.amount,
            0
        );
        
        const validatedData = validation.data;
        const paidAmount = validatedData.payments.reduce((sum, p) => sum + p.amount, 0);

        const updatedJobOrder: JobOrder = {
            id: existingJobOrder.id,
            jobOrderNumber: existingJobOrder.jobOrderNumber,
            clientName: existingJobOrder.clientName,
            contactMethod: validatedData.contactMethod,
            contactDetail: validatedData.contactDetail,
            startDate: existingJobOrder.startDate.toISOString(),
            dueDate: existingJobOrder.dueDate.toISOString(),
            notes: existingJobOrder.notes,
            status: existingJobOrder.status,
            discount: validatedData.discount,
            discountType: validatedData.discountType,
            downpayment: validatedData.downpayment,
            paidAmount: paidAmount,
            payments: validatedData.payments,
            items: existingJobOrder.items.map((item) => ({
                ...item,
                id: item.id || crypto.randomUUID(),
            })),
            totalAmount,
            paymentMethod: validatedData.paymentMethod,
            bankName: validatedData.bankName,
            chequeNumber: validatedData.chequeNumber,
            chequeDate: validatedData.chequeDate?.toISOString(),
            eWalletReference: validatedData.eWalletReference,
            bankTransferReference: validatedData.bankTransferReference,
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
