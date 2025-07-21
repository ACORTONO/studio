export interface JobOrderItem {
  id: string;
  description: string;
  quantity: number;
  amount: number;
  remarks?: string;
}

export interface JobOrder {
  id: string;
  jobOrderNumber: string;
  clientName: string;
  contactNumber: string;
  date: string; // Using string to be serializable
  startDate: string;
  dueDate: string;
  items: JobOrderItem[];
  totalAmount: number;
  notes?: string;
}

export interface Expense {
  id: string;
  date: string; // Using string to be serializable
  amount: number;
  description: string;
}
