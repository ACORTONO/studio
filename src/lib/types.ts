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
  paidAmount?: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  notes?: string;
  paymentMethod?: 'Cash' | 'Cheque';
  bankName?: string;
  chequeNumber?: string;
  chequeDate?: string; // Using string to be serializable
}

export interface Expense {
  id: string;
  date: string; // Using string to be serializable
  amount: number;
  description: string;
}
