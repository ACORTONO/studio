

export interface Payment {
  id: string;
  date: string;
  amount: number;
  notes?: string;
}

export interface JobOrderItem {
  id:string;
  description: string;
  quantity: number;
  amount: number;
  remarks?: string;
  status: 'Unpaid' | 'Paid' | 'Downpayment' | 'Cheque';
}

export interface JobOrder {
  id: string;
  jobOrderNumber: string;
  clientName: string;
  contactMethod: 'Contact No.' | 'FB Messenger' | 'Email';
  contactDetail: string;
  startDate: string;
  dueDate: string;
  items: JobOrderItem[];
  totalAmount: number;
  paidAmount: number;
  status: 'Pending' | 'Downpayment' | 'Completed' | 'Cancelled';
  notes?: string;
  discount?: number;
  discountType?: 'amount' | 'percent';
  paymentMethod?: 'Cash' | 'E-Wallet (GCASH, MAYA)' | 'Cheque' | 'Bank Transfer';
  paymentReference?: string;
  chequeBankName?: string;
  chequeNumber?: string;
  chequeDate?: string;
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


export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  address: string;
  tinNumber?: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  totalAmount: number;
  status: 'Unpaid' | 'Paid';
  termsAndConditions?: string;
  discount?: number;
  discountType?: 'amount' | 'percent';
  tax?: number;
  taxType?: 'amount' | 'percent';
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'E-Wallet' | 'Cheque';
  paymentDetails?: string;
}

export interface SalaryPayment {
    id: string;
    employeeName: string;
    paymentDate: string;
    amount: number;
    notes?: string;
}

export interface CompanyProfile {
    name: string;
    logoUrl: string;
    address: string;
    email: string;
    contactNumber: string;
    tinNumber?: string;
    facebookPage?: string;
}
    

    
