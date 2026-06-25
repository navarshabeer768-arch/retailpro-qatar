export type UserRole = "owner" | "staff";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  staff_id?: string;
}

export interface Staff {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  basic_salary: number;
  commission_rule_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  current_stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailySale {
  id: string;
  staff_id: string;
  sale_date: string;
  cash_sales: number;
  card_sales: number;
  credit_sales: number;
  total_sales: number;
  customers_served: number;
  notes?: string;
  submitted_at: string;
  staff?: Staff;
}

export interface OpeningStock {
  id: string;
  product_id: string;
  stock_date: string;
  quantity: number;
  recorded_by: string;
  created_at: string;
  product?: Product;
}

export interface ClosingStock {
  id: string;
  product_id: string;
  stock_date: string;
  opening_quantity: number;
  closing_quantity: number;
  sold_quantity: number;
  variance: number;
  recorded_by: string;
  notes?: string;
  created_at: string;
  product?: Product;
}

export type ExpenseCategory =
  | "rent"
  | "electricity"
  | "water"
  | "internet"
  | "transportation"
  | "miscellaneous";

export interface Expense {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface CommissionRule {
  id: string;
  name: string;
  type: "fixed" | "tiered";
  fixed_rate?: number;
  tiers?: CommissionTier[];
  is_active: boolean;
  created_at: string;
}

export interface CommissionTier {
  min_sales: number;
  max_sales?: number;
  rate: number;
}

export interface Commission {
  id: string;
  staff_id: string;
  month: string;
  total_sales: number;
  commission_amount: number;
  rule_id: string;
  calculated_at: string;
  staff?: Staff;
}

export interface Salary {
  id: string;
  staff_id: string;
  month: string;
  basic_salary: number;
  commission_earned: number;
  bonus: number;
  deductions: number;
  total_salary: number;
  notes?: string;
  generated_at: string;
  staff?: Staff;
}

export interface Notification {
  id: string;
  type: "sales_submitted" | "low_stock" | "target_achieved";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface Settings {
  id: string;
  store_name: string;
  store_name_ar?: string;
  currency: string;
  monthly_target?: number;
  low_stock_threshold: number;
  timezone: string;
  language: "en" | "ar";
  dark_mode: boolean;
}

export interface DashboardStats {
  today_total_sales: number;
  today_cash_sales: number;
  today_card_sales: number;
  today_credit_sales: number;
  monthly_sales: number;
  monthly_expenses: number;
  current_stock_value: number;
  total_staff_today: number;
  top_performer: Staff | null;
  salary_payable: number;
  low_stock_count: number;
}

export interface StaffLeaderboard {
  staff_id: string;
  staff_name: string;
  total_sales: number;
  rank: number;
}
