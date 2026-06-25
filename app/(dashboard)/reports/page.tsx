"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, getCurrentMonth, getMonthRange, EXPENSE_CATEGORIES } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart2, Download, FileText, Table2, TrendingUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type ReportType = "daily" | "monthly" | "staff" | "expenses" | "salary" | "stock";

interface ReportData {
  type: ReportType;
  title: string;
  data: Record<string, unknown>[];
  columns: string[];
  totals?: Record<string, number>;
}

export default function ReportsPage() {
  const supabase = createClient();
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateReport() {
    setLoading(true);
    setReportData(null);
    try {
      switch (reportType) {
        case "daily": await generateDailyReport(); break;
        case "monthly": await generateMonthlyReport(); break;
        case "staff": await generateStaffReport(); break;
        case "expenses": await generateExpensesReport(); break;
        case "salary": await generateSalaryReport(); break;
        case "stock": await generateStockReport(); break;
      }
    } catch {
      toast.error("Failed to generate report");
    }
    setLoading(false);
  }

  async function generateDailyReport() {
    const { data } = await supabase
      .from("daily_sales")
      .select("*,staff(name,position)")
      .eq("sale_date", selectedDate)
      .order("submitted_at");

    const rows = (data ?? []).map((r) => {
      const staff = r.staff as unknown as { name: string; position: string } | null;
      return {
        "Staff Name": staff?.name ?? "—",
        "Position": staff?.position ?? "—",
        "Cash (QAR)": r.cash_sales,
        "Card (QAR)": r.card_sales,
        "Credit (QAR)": r.credit_sales,
        "Total (QAR)": r.total_sales,
        "Customers": r.customers_served,
        "Notes": r.notes ?? "",
      };
    });

    setReportData({
      type: "daily",
      title: `Daily Sales Report — ${formatDate(selectedDate)}`,
      data: rows,
      columns: ["Staff Name", "Position", "Cash (QAR)", "Card (QAR)", "Credit (QAR)", "Total (QAR)", "Customers"],
      totals: {
        "Cash (QAR)": rows.reduce((s, r) => s + Number(r["Cash (QAR)"]), 0),
        "Card (QAR)": rows.reduce((s, r) => s + Number(r["Card (QAR)"]), 0),
        "Credit (QAR)": rows.reduce((s, r) => s + Number(r["Credit (QAR)"]), 0),
        "Total (QAR)": rows.reduce((s, r) => s + Number(r["Total (QAR)"]), 0),
      },
    });
  }

  async function generateMonthlyReport() {
    const { start, end } = getMonthRange(selectedMonth);
    const { data } = await supabase
      .from("daily_sales")
      .select("sale_date,cash_sales,card_sales,credit_sales,total_sales,customers_served,staff(name)")
      .gte("sale_date", start)
      .lte("sale_date", end)
      .order("sale_date");

    const rows = (data ?? []).map((r) => ({
      "Date": formatDate(r.sale_date),
      "Staff": (r.staff as unknown as { name: string } | null)?.name ?? "—",
      "Cash (QAR)": r.cash_sales,
      "Card (QAR)": r.card_sales,
      "Credit (QAR)": r.credit_sales,
      "Total (QAR)": r.total_sales,
      "Customers": r.customers_served,
    }));

    setReportData({
      type: "monthly",
      title: `Monthly Sales Report — ${selectedMonth}`,
      data: rows,
      columns: ["Date", "Staff", "Cash (QAR)", "Card (QAR)", "Credit (QAR)", "Total (QAR)", "Customers"],
      totals: { "Total (QAR)": rows.reduce((s, r) => s + Number(r["Total (QAR)"]), 0) },
    });
  }

  async function generateStaffReport() {
    const { start, end } = getMonthRange(selectedMonth);
    const { data } = await supabase
      .from("daily_sales")
      .select("staff_id,cash_sales,card_sales,credit_sales,total_sales,staff(name,position)")
      .gte("sale_date", start)
      .lte("sale_date", end);

    const map = new Map<string, { name: string; position: string; cash: number; card: number; credit: number; total: number; days: number }>();
    (data ?? []).forEach((r) => {
      const cur = map.get(r.staff_id) ?? {
        name: (r.staff as unknown as { name: string; position: string } | null)?.name ?? "—",
        position: (r.staff as unknown as { name: string; position: string } | null)?.position ?? "—",
        cash: 0, card: 0, credit: 0, total: 0, days: 0,
      };
      cur.cash += r.cash_sales;
      cur.card += r.card_sales;
      cur.credit += r.credit_sales;
      cur.total += r.total_sales;
      cur.days += 1;
      map.set(r.staff_id, cur);
    });

    const rows = [...map.values()]
      .sort((a, b) => b.total - a.total)
      .map((s, i) => ({
        "Rank": i + 1,
        "Name": s.name,
        "Position": s.position,
        "Cash (QAR)": s.cash,
        "Card (QAR)": s.card,
        "Credit (QAR)": s.credit,
        "Total (QAR)": s.total,
        "Days Active": s.days,
      }));

    setReportData({
      type: "staff",
      title: `Staff Sales Report — ${selectedMonth}`,
      data: rows,
      columns: ["Rank", "Name", "Position", "Cash (QAR)", "Card (QAR)", "Credit (QAR)", "Total (QAR)", "Days Active"],
      totals: { "Total (QAR)": rows.reduce((s, r) => s + Number(r["Total (QAR)"]), 0) },
    });
  }

  async function generateExpensesReport() {
    const { start, end } = getMonthRange(selectedMonth);
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .gte("expense_date", start)
      .lte("expense_date", end)
      .order("expense_date");

    const rows = (data ?? []).map((e) => ({
      "Date": formatDate(e.expense_date),
      "Category": e.category.charAt(0).toUpperCase() + e.category.slice(1),
      "Amount (QAR)": e.amount,
      "Notes": e.notes ?? "",
    }));

    setReportData({
      type: "expenses",
      title: `Expense Report — ${selectedMonth}`,
      data: rows,
      columns: ["Date", "Category", "Amount (QAR)", "Notes"],
      totals: { "Amount (QAR)": rows.reduce((s, r) => s + Number(r["Amount (QAR)"]), 0) },
    });
  }

  async function generateSalaryReport() {
    const { data } = await supabase
      .from("salaries")
      .select("*,staff(name,position)")
      .eq("month", selectedMonth)
      .order("total_salary", { ascending: false });

    const rows = (data ?? []).map((s) => {
      const staff = s.staff as unknown as { name: string; position: string } | null;
      return {
      "Staff": staff?.name ?? "—",
      "Position": staff?.position ?? "—",
      "Basic (QAR)": s.basic_salary,
      "Commission (QAR)": s.commission_earned,
      "Bonus (QAR)": s.bonus,
      "Deductions (QAR)": s.deductions,
      "Total (QAR)": s.total_salary,
      "Notes": s.notes ?? "",
      };
    });

    setReportData({
      type: "salary",
      title: `Salary Report — ${selectedMonth}`,
      data: rows,
      columns: ["Staff", "Position", "Basic (QAR)", "Commission (QAR)", "Bonus (QAR)", "Deductions (QAR)", "Total (QAR)"],
      totals: {
        "Basic (QAR)": rows.reduce((s, r) => s + Number(r["Basic (QAR)"]), 0),
        "Commission (QAR)": rows.reduce((s, r) => s + Number(r["Commission (QAR)"]), 0),
        "Total (QAR)": rows.reduce((s, r) => s + Number(r["Total (QAR)"]), 0),
      },
    });
  }

  async function generateStockReport() {
    const { data } = await supabase
      .from("closing_stock")
      .select("*,product:products(name,sku,unit,low_stock_threshold)")
      .eq("stock_date", selectedDate)
      .order("created_at");

    const rows = (data ?? []).map((s) => {
      const product = s.product as unknown as { name: string; sku: string; unit: string } | null;
      return {
        "Product": product?.name ?? "—",
        "SKU": product?.sku ?? "—",
        "Opening": s.opening_quantity,
        "Closing": s.closing_quantity,
        "Sold": s.sold_quantity,
        "Unit": product?.unit ?? "pcs",
        "Notes": s.notes ?? "",
      };
    });

    setReportData({
      type: "stock",
      title: `Stock Report — ${formatDate(selectedDate)}`,
      data: rows,
      columns: ["Product", "SKU", "Opening", "Closing", "Sold", "Unit"],
      totals: { "Sold": rows.reduce((s, r) => s + Number(r["Sold"]), 0) },
    });
  }

  async function exportPDF() {
    if (!reportData) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(reportData.title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 22);

    const head = [reportData.columns];
    const body = reportData.data.map((row) => reportData.columns.map((col) => row[col] ?? ""));

    autoTable(doc, {
      head,
      body,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94] },
    });

    if (reportData.totals) {
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
      doc.setFontSize(9);
      doc.text("Totals:", 14, finalY);
      let yOffset = finalY + 5;
      Object.entries(reportData.totals).forEach(([k, v]) => {
        doc.text(`${k}: ${formatCurrency(v)}`, 14, yOffset);
        yOffset += 5;
      });
    }

    doc.save(`${reportData.title.replace(/\s+/g, "_")}.pdf`);
    toast.success("PDF exported!");
  }

  async function exportExcel() {
    if (!reportData) return;
    const XLSX = await import("xlsx");

    const ws = XLSX.utils.json_to_sheet(reportData.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${reportData.title.replace(/\s+/g, "_")}.xlsx`);
    toast.success("Excel exported!");
  }

  const REPORTS = [
    { value: "daily", label: "Daily Sales", icon: "📅" },
    { value: "monthly", label: "Monthly Sales", icon: "📊" },
    { value: "staff", label: "Staff Performance", icon: "👥" },
    { value: "expenses", label: "Expenses", icon: "💰" },
    { value: "salary", label: "Salary", icon: "💵" },
    { value: "stock", label: "Stock", icon: "📦" },
  ] as const;

  const needsDate = reportType === "daily" || reportType === "stock";

  return (
    <div className="space-y-4">
      {/* Report Controls */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            Generate Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {REPORTS.map((r) => (
              <button
                key={r.value}
                onClick={() => setReportType(r.value as ReportType)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                  reportType === r.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/30 text-muted-foreground"
                }`}
              >
                <span className="text-xl">{r.icon}</span>
                <span className="text-xs">{r.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {needsDate ? (
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-40" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Month</Label>
                <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-40" />
              </div>
            )}
            <Button onClick={generateReport} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Generating..." : "Generate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Output */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 rounded-xl" />
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
        </div>
      ) : reportData ? (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-sm font-semibold">{reportData.title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{reportData.data.length} records</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5 cursor-pointer">
                  <FileText className="h-3.5 w-3.5" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5 cursor-pointer">
                  <Table2 className="h-3.5 w-3.5" />
                  Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {reportData.columns.map((col) => (
                      <th key={col} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.data.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      {reportData.columns.map((col) => (
                        <td key={col} className="py-2.5 px-3 text-xs whitespace-nowrap">
                          {typeof row[col] === "number" && col.includes("QAR")
                            ? formatCurrency(Number(row[col]))
                            : String(row[col] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                {reportData.totals && (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30">
                      {reportData.columns.map((col, i) => (
                        <td key={col} className="py-2.5 px-3 text-xs font-bold whitespace-nowrap">
                          {i === 0 ? "TOTAL" : reportData.totals?.[col] !== undefined
                            ? col.includes("QAR") ? formatCurrency(reportData.totals[col]) : reportData.totals[col]
                            : ""}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
          <TrendingUp className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">Select a report type and click Generate</p>
        </div>
      )}
    </div>
  );
}
