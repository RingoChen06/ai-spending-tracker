// Transaction types
export interface Transaction {
  id: string;
  icon: React.ReactNode;
  name: string;
  category: string;
  amount: number;
  date: string;
  note?: string;
}

// Spending categories
export type SpendingCategory =
  | "Food & Dining"
  | "Shopping"
  | "Transportation"
  | "Health & Fitness"
  | "Entertainment"
  | "Utilities"
  | "Travel"
  | "Other";

export const SPENDING_CATEGORIES: SpendingCategory[] = [
  "Food & Dining",
  "Shopping",
  "Transportation",
  "Health & Fitness",
  "Entertainment",
  "Utilities",
  "Travel",
  "Other",
];

// Spending summary types
export interface CategorySpending {
  category: string;
  total_amount: number;
}

export interface SpendingSummary {
  period: string;
  totalSpent: number;
  topCategories: CategorySpending[];
  insights: string;
}
