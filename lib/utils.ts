import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "QAR"): string {
  return new Intl.NumberFormat("en-QA", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date, fmt = "dd MMM yyyy"): string {
  return format(new Date(date), fmt);
}

export function getCurrentMonth(): string {
  return format(new Date(), "yyyy-MM");
}

export function getMonthRange(month: string) {
  const date = new Date(`${month}-01`);
  return {
    start: format(startOfMonth(date), "yyyy-MM-dd"),
    end: format(endOfMonth(date), "yyyy-MM-dd"),
  };
}

export function getWeekRange() {
  return {
    start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
    end: format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  };
}

export function getYearRange() {
  return {
    start: format(startOfYear(new Date()), "yyyy-MM-dd"),
    end: format(endOfYear(new Date()), "yyyy-MM-dd"),
  };
}

export function calculateCommission(
  totalSales: number,
  rule: {
    type: string;
    fixed_rate?: number;
    tiers?: Array<{ min_sales: number; max_sales?: number; rate: number }>;
  }
): number {
  if (rule.type === "fixed" && rule.fixed_rate) {
    return (totalSales * rule.fixed_rate) / 100;
  }
  if (rule.type === "tiered" && rule.tiers) {
    for (const tier of [...rule.tiers].sort((a, b) => b.min_sales - a.min_sales)) {
      if (totalSales >= tier.min_sales) {
        return (totalSales * tier.rate) / 100;
      }
    }
  }
  return 0;
}

export const EXPENSE_CATEGORIES = [
  { value: "rent", label: "Rent" },
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "internet", label: "Internet" },
  { value: "transportation", label: "Transportation" },
  { value: "miscellaneous", label: "Miscellaneous" },
] as const;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
