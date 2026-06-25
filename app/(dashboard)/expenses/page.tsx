"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, EXPENSE_CATEGORIES, getCurrentMonth, getMonthRange } from "@/lib/utils";
import { Expense, ExpenseCategory } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { z } from "zod";

const expenseSchema = z.object({
  expense_date: z.string(),
  category: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  notes: z.string().optional(),
});
type ExpenseForm = z.infer<typeof expenseSchema>;

const CATEGORY_COLORS: Record<string, string> = {
  rent: "bg-blue-500/10 text-blue-500",
  electricity: "bg-amber-500/10 text-amber-500",
  water: "bg-cyan-500/10 text-cyan-500",
  internet: "bg-violet-500/10 text-violet-500",
  transportation: "bg-orange-500/10 text-orange-500",
  miscellaneous: "bg-slate-500/10 text-slate-400",
};

export default function ExpensesPage() {
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema) as Resolver<ExpenseForm>,
    defaultValues: { expense_date: today, category: "miscellaneous" },
  });

  useEffect(() => { loadExpenses(); }, [selectedMonth]);

  async function loadExpenses() {
    setLoading(true);
    const { start, end } = getMonthRange(selectedMonth);
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .gte("expense_date", start)
      .lte("expense_date", end)
      .order("expense_date", { ascending: false });
    setExpenses(data ?? []);
    setLoading(false);
  }

  async function onSubmit(data: ExpenseForm) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("expenses").insert({ ...data, created_by: user?.id });
    if (error) { toast.error(error.message); } else { toast.success("Expense added"); }
    setSaving(false);
    setDialogOpen(false);
    reset({ expense_date: today, category: "miscellaneous" });
    loadExpenses();
  }

  async function deleteExpense(id: string) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Expense deleted");
    loadExpenses();
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = EXPENSE_CATEGORIES.map((cat) => ({
    ...cat,
    total: expenses.filter((e) => e.category === cat.value).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" {...register("expense_date")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Amount (QAR)</Label>
                  <Input type="number" step="0.01" {...register("amount")} />
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea {...register("notes")} rows={2} placeholder="Description..." />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? "Adding..." : "Add Expense"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border lg:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Monthly Total</p>
            <p className="text-xl font-bold mt-1 text-destructive">{formatCurrency(total)}</p>
          </CardContent>
        </Card>
        {byCategory.slice(0, 3).map((c) => (
          <Card key={c.value} className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-bold mt-1">{formatCurrency(c.total)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category Breakdown */}
      {byCategory.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byCategory.map((c) => (
              <div key={c.value} className="flex items-center gap-3">
                <Badge className={`${CATEGORY_COLORS[c.value]} border-0 text-xs w-28 justify-center`}>{c.label}</Badge>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${total > 0 ? (c.total / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-semibold w-24 text-right">{formatCurrency(c.total)}</span>
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {total > 0 ? `${((c.total / total) * 100).toFixed(0)}%` : "0%"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Expense List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl">
          <Receipt className="h-10 w-10 mb-2 opacity-20" />
          <p>No expenses recorded this month</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <Card key={e.id} className="border-border hover:border-primary/20 transition-colors">
              <CardContent className="p-3 flex items-center gap-3">
                <Badge className={`${CATEGORY_COLORS[e.category]} border-0 text-xs shrink-0 capitalize`}>
                  {e.category}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{e.notes || e.category}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(e.expense_date)}</p>
                </div>
                <p className="text-base font-bold text-destructive shrink-0">{formatCurrency(e.amount)}</p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => deleteExpense(e.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
