export interface RevenueEntry {
  id: string;
  date: Date;
  amount: number;
  description: string;
}

export interface ExpenseEntry {
  id: string;
  date: Date;
  amount: number;
  category: string;
  description:string;
}

export interface Appointment {
  id: string;
  date: Date; // Represents the specific day of the appointment
  time: string; // e.g., "10:00 AM" or "14:30"
  title: string; // Could be client name or service
  description?: string;
}
