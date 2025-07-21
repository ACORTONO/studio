"use server";

import { generateJobOrderNumber } from "@/ai/flows/generate-job-order-number";
import type { JobOrder } from "@/lib/types";
import { z } from "zod";

const jobOrderItemSchema = z.object({
  description: z.string().min(1, "Description is required."),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0."),
  amount: z.coerce.number().min(0, "Amount is required."),
  remarks: z.string().optional(),
});

const jobOrderSchema = z.object({
  clientName: z.string().min(1, "Client name is required."),
  contactNumber: z.string().min(1, "Contact number is required."),
  date: z.date({ required_error: "An order date is required." }),
  startDate: z.date({ required_error: "A start date is required." }),
  dueDate: z.date({ required_error: "A due date is required." }),
  items: z.array(jobOrderItemSchema).min(1, "At least one item is required."),
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
    const { output } = await generateJobOrderNumber({ existingJobOrderNumbers, currentDate });
    if (!output?.jobOrderNumber) {
      throw new Error("Failed to generate job order number.");
    }
    const jobOrderNumber = output.jobOrderNumber;

    const totalAmount = validation.data.items.reduce(
      (acc, item) => acc + item.quantity * item.amount,
      0
    );

    const newOrder: JobOrder = {
      id: crypto.randomUUID(),
      jobOrderNumber,
      clientName: validation.data.clientName,
      contactNumber: validation.data.contactNumber,
      date: validation.data.date.toISOString(),
      startDate: validation.data.startDate.toISOString(),
      dueDate: validation.data.dueDate.toISOString(),
      items: validation.data.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      })),
      totalAmount,
    };

    return { success: true, data: newOrder };
  } catch (error) {
    console.error(error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
