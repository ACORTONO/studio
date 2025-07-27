
"use server";

import { generateJobOrderNumber } from "@/ai/flows/generate-job-order-number";
import type { JobOrder } from "@/lib/types";
import { z } from "zod";

const jobOrderItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required."),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0."),
  amount: z.coerce.number().min(0, "Amount is required."),
  remarks: z.string().optional(),
  status: z.enum(['Unpaid', 'Paid', 'Balance']).default('Unpaid'),
});

const jobOrderSchemaBase = z.object({
  clientName: z.string().min(1, "Client name is required."),
  contactMethod: z.enum(['Contact No.', 'FB Messenger', 'Email']).default('Contact No.'),
  contactDetail: z.string().min(1, "Contact detail is required."),
  startDate: z.date({ required_error: "A start date is required." }),
  dueDate: z.date({ required_error: "A due date is required." }),
  notes: z.string().optional(),
  status: z.enum(["Pending", "In Progress", "Completed", "Cancelled"]),
  discount: z.coerce.number().min(0).optional().default(0),
  discountType: z.enum(['amount', 'percent']).default('amount'),
  downpayment: z.coerce.number().min(0).optional().default(0),
  items: z.array(jobOrderItemSchema).min(1, "At least one item is required."),
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

    const newOrder: JobOrder = {
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
      paidAmount: validatedData.downpayment || 0,
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

    return { success: true, data: newOrder };
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
        const existingOrder = validation.data;
        const totalAmount = existingOrder.items.reduce(
            (acc, item) => acc + item.quantity * item.amount,
            0
        );
        
        const validatedData = validation.data;

        const updatedOrder: JobOrder = {
            id: existingOrder.id,
            jobOrderNumber: existingOrder.jobOrderNumber,
            clientName: existingOrder.clientName,
            contactMethod: validatedData.contactMethod,
            contactDetail: validatedData.contactDetail,
            startDate: existingOrder.startDate.toISOString(),
            dueDate: existingOrder.dueDate.toISOString(),
            notes: existingOrder.notes,
            status: existingOrder.status,
            discount: validatedData.discount,
            discountType: validatedData.discountType,
            downpayment: validatedData.downpayment,
            paidAmount: validatedData.downpayment || 0,
            items: existingOrder.items.map((item) => ({
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
        
        return { success: true, data: updatedOrder };
    } catch (error) {
        console.error(error);
        return { success: false, error: "An unexpected error occurred." };
    }
}
