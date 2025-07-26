
export interface JobOrderItem {
  id: string;
  description: string;
  quantity: number;
  amount: number;
  remarks?: string;
  status: 'Unpaid' | 'Paid' | 'Balance';
}

export interface JobOrder {
  id: string;
  jobOrderNumber: string;
  clientName: string;
  contactNumber: string;
  startDate: string;
  dueDate: string;
  items: JobOrderItem[];
  totalAmount: number;
  discount?: number;
  discountType?: 'amount' | 'percent';
  downpayment?: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  notes?: string;
  paymentMethod?: 'Cash' | 'Cheque' | 'E-Wallet' | 'Bank Transfer';
  bankName?: string;
  chequeNumber?: string;
  chequeDate?: string; // Using string to be serializable
  eWalletReference?: string;
  bankTransferReference?: string;
}

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
}

export type ExpenseCategory = 'General' | 'Cash Advance' | 'Salary' | 'Fixed Expense';

export interface Expense {
  id: string;
  date: string; // Using string to be serializable
  description: string;
  category: ExpenseCategory;
  items: ExpenseItem[];
  totalAmount: number;
}

    