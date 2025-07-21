export interface JobOrderItem {
  id: string;
  description: string;
  quantity: number;
  amount: number;
  remarks: string;
}

export interface JobOrder {
  id: string;
  jobOrderNumber: string;
  clientName: string;
  contactNumber: string;
  date: string; // Using string to be serializable
  items: JobOrderItem[];
  totalAmount: number;
}

export interface Expense {
  id: string;
  date: string; // Using string to be serializable
  amount: number;
  description: string;
}
