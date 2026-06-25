"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, calculateCommission, getCurrentMonth, getMonthRange } from "@/lib/utils";
import { Staff, Salary, CommissionRule } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, RefreshCw, Pencil, Trophy, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface SalaryRow {
  staff: Staff;
  monthlySales: number;
  commission: number;
  salary: Salary | null;
}

export default function SalaryPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [editRow, setEditRow] = useState<SalaryRow | null>(null);
  const [editData, setEditData] = useState({ bonus: 0, deductions: 0, notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSalaryData(); }, [selectedMonth]);

  async function loadSalaryData() {
    setLoading(true);
    const { start, end } = getMonthRange(selectedMonth);

    const [staffRes, salesRes, salariesRes, rulesRes] = await Promise.all([
      supabase.from("staff").select("*,commission_rules(*)").eq("is_active", true).order("name"),
      supabase.from("daily_sales").select("staff_id,total_sales").gte("sale_date", start).lte("sale_date", end),
      supabase.from("salaries").select("*").eq("month", selectedMonth),
      supabase.from("commission_rules").select("*").eq("is_active", true).limit(1).single(),
    ]);

    const defaultRule = rulesRes.data as CommissionRule | null;
    const salesByStaff = new Map<string, number>();
    (salesRes.data ?? []).forEach((s) => {
      salesByStaff.set(s.staff_id, (salesByStaff.get(s.staff_id) ?? 0) + s.total_sales);
    });

    const salaryMap = new Map((salariesRes.data ?? []).map((s) => [s.staff_id, s]));

    const newRows: SalaryRow[] = (staffRes.data ?? []).map((staff) => {
      const monthlySales = salesByStaff.get(staff.id) ?? 0;
      const rule = (staff as { commission_rules?: CommissionRule }).commission_rules ?? defaultRule;
      const commission = rule ? calculateCommission(monthlySales, rule) : 0;
      return {
        staff,
        monthlySales,
        commission,
        salary: (salaryMap.get(staff.id) as Salary | null) ?? null,
      };
    });

    setRows(newRows);
    setLoading(false);
  }

  async function generatePayroll() {
    setGenerating(true);
    const records = rows.map((r) => ({
      staff_id: r.staff.id,
      month: selectedMonth,
      basic_salary: r.staff.basic_salary,
      commission_earned: r.commission,
      bonus: r.salary?.bonus ?? 0,
      deductions: r.salary?.deductions ?? 0,
      notes: r.salary?.notes ?? null,
    }));

    const { error } = await supabase.from("salaries").upsert(records, { onConflict: "staff_id,month" });
    if (error) { toast.error(error.message); } else { toast.success("Payroll generated!"); }
    setGenerating(false);
    loadSalaryData();
  }

  async function saveEdit() {
    if (!editRow) return;
    setSaving(true);
    const total = editRow.staff.basic_salary + editRow.commission + editData.bonus - editData.deductions;
    const { error } = await supabase.from("salaries").upsert(
      {
        staff_id: editRow.staff.id,
        month: selectedMonth,
        basic_salary: editRow.staff.basic_salary,
        commission_earned: editRow.commission,
        bonus: editData.bonus,
        deductions: editData.deductions,
        notes: editData.notes || null,
      },
      { onConflict: "staff_id,month" }
    );
    if (error) { toast.error(error.message); } else { toast.success("Salary updated"); }
    setSaving(false);
    setEditRow(null);
    loadSalaryData();
  }

  const totalPayable = rows.reduce((s, r) => {
    const sal = r.salary;
    return s + (sal ? sal.total_salary : r.staff.basic_salary + r.commission);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={generatePayroll} disabled={generating} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Generating..." : "Generate Payroll"}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Payable</p>
            <p className="text-xl font-bold mt-1 text-primary">{formatCurrency(totalPayable)}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Commissions</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(rows.reduce((s, r) => s + r.commission, 0))}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Base Salaries</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(rows.reduce((s, r) => s + r.staff.basic_salary, 0))}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Staff Count</p>
            <p className="text-xl font-bold mt-1">{rows.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Salary Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, idx) => {
            const sal = row.salary;
            const bonus = sal?.bonus ?? 0;
            const deductions = sal?.deductions ?? 0;
            const total = row.staff.basic_salary + row.commission + bonus - deductions;

            return (
              <Card key={row.staff.id} className="border-border hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 text-sm font-bold ${
                        idx === 0 ? "bg-amber-500 text-white" : idx === 1 ? "bg-slate-400 text-white" : idx === 2 ? "bg-amber-700 text-white" : "bg-muted"
                      }`}>
                        {idx < 3 ? <Trophy className="h-4 w-4" /> : idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{row.staff.name}</p>
                        <p className="text-xs text-muted-foreground">{row.staff.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{formatCurrency(total)}</p>
                        <Badge variant={sal ? "default" : "secondary"} className="text-[10px]">
                          {sal ? "Generated" : "Pending"}
                        </Badge>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 cursor-pointer" onClick={() => {
                        setEditRow(row);
                        setEditData({ bonus: sal?.bonus ?? 0, deductions: sal?.deductions ?? 0, notes: sal?.notes ?? "" });
                      }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Basic</p>
                      <p className="text-xs font-semibold">{formatCurrency(row.staff.basic_salary)}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Commission</p>
                      <p className="text-xs font-semibold text-primary">{formatCurrency(row.commission)}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Bonus</p>
                      <p className="text-xs font-semibold text-emerald-500">{formatCurrency(bonus)}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Deductions</p>
                      <p className="text-xs font-semibold text-destructive">{formatCurrency(deductions)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Monthly Sales:</span>
                    <span className="text-xs font-semibold">{formatCurrency(row.monthlySales)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Salary — {editRow?.staff.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Basic Salary</Label>
                <div className="h-10 flex items-center px-3 rounded-lg bg-muted text-sm font-semibold">
                  {formatCurrency(editRow?.staff.basic_salary ?? 0)}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Commission Earned</Label>
                <div className="h-10 flex items-center px-3 rounded-lg bg-muted text-sm font-semibold text-primary">
                  {formatCurrency(editRow?.commission ?? 0)}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Bonus (QAR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editData.bonus}
                  onChange={(e) => setEditData((p) => ({ ...p, bonus: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Deductions (QAR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editData.deductions}
                  onChange={(e) => setEditData((p) => ({ ...p, deductions: Number(e.target.value) }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={editData.notes}
                  onChange={(e) => setEditData((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
            <div className="rounded-xl bg-primary/10 p-3 flex justify-between items-center">
              <span className="font-medium">Total Salary</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency((editRow?.staff.basic_salary ?? 0) + (editRow?.commission ?? 0) + editData.bonus - editData.deductions)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditRow(null)} className="flex-1">Cancel</Button>
              <Button onClick={saveEdit} disabled={saving} className="flex-1">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
