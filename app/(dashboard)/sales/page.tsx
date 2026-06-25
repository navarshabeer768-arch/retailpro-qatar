"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Staff, DailySale } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, CheckCircle, Clock, Banknote, CreditCard, Receipt } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { z } from "zod";

const salesSchema = z.object({
  staff_id: z.string().min(1, "Select a staff member"),
  sale_date: z.string(),
  cash_sales: z.coerce.number().min(0),
  card_sales: z.coerce.number().min(0),
  credit_sales: z.coerce.number().min(0),
  customers_served: z.coerce.number().min(0),
  notes: z.string().optional(),
});
type SalesForm = z.infer<typeof salesSchema>;

export default function SalesPage() {
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [todaySales, setTodaySales] = useState<(DailySale & { staff?: Staff })[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; staff_id?: string } | null>(null);

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<SalesForm>({
    resolver: zodResolver(salesSchema) as Resolver<SalesForm>,
    defaultValues: { sale_date: today, cash_sales: 0, card_sales: 0, credit_sales: 0, customers_served: 0 },
  });

  const cashSales = watch("cash_sales") ?? 0;
  const cardSales = watch("card_sales") ?? 0;
  const creditSales = watch("credit_sales") ?? 0;
  const totalPreview = Number(cashSales) + Number(cardSales) + Number(creditSales);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: role } = await supabase.from("user_roles").select("role,staff_id").eq("user_id", user.id).single();
      setCurrentUser({ id: user.id, role: role?.role ?? "staff", staff_id: role?.staff_id });

      if (role?.role === "staff" && role?.staff_id) {
        reset((prev) => ({ ...prev, staff_id: role.staff_id! }));
      }
    }

    const [staffRes, salesRes] = await Promise.all([
      supabase.from("staff").select("*").eq("is_active", true).order("name"),
      supabase.from("daily_sales").select("*,staff(name,position)").eq("sale_date", today).order("submitted_at", { ascending: false }),
    ]);
    setStaff(staffRes.data ?? []);
    setTodaySales(salesRes.data as (DailySale & { staff?: Staff })[] ?? []);
    setLoading(false);
  }

  async function onSubmit(data: SalesForm) {
    setSaving(true);
    const { error } = await supabase.from("daily_sales").upsert(
      { ...data, sale_date: data.sale_date },
      { onConflict: "staff_id,sale_date" }
    );
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Sales report submitted!");
      reset({ sale_date: today, staff_id: data.staff_id, cash_sales: 0, card_sales: 0, credit_sales: 0, customers_served: 0, notes: "" });
      loadData();
    }
    setSaving(false);
  }

  const isOwner = currentUser?.role === "owner";
  const dayTotal = todaySales.reduce((s, r) => s + r.total_sales, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Entry Form */}
        <Card className="border-border lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Submit Daily Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {isOwner && (
                <div className="space-y-1.5">
                  <Label>Staff Member</Label>
                  <Controller
                    name="staff_id"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff..." />
                        </SelectTrigger>
                        <SelectContent>
                          {staff.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.staff_id && <p className="text-xs text-destructive">{errors.staff_id.message}</p>}
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" {...register("sale_date")} />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <Banknote className="h-3.5 w-3.5 text-emerald-500" /> Cash Sales (QAR)
                  </Label>
                  <Input type="number" step="0.01" {...register("cash_sales")} className="text-right" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 text-blue-500" /> Card Sales (QAR)
                  </Label>
                  <Input type="number" step="0.01" {...register("card_sales")} className="text-right" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <Receipt className="h-3.5 w-3.5 text-amber-500" /> Credit Sales (QAR)
                  </Label>
                  <Input type="number" step="0.01" {...register("credit_sales")} className="text-right" />
                </div>
              </div>

              {/* Total Preview */}
              <div className="rounded-xl bg-primary/10 p-3 flex justify-between items-center">
                <span className="text-sm font-medium">Total</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(totalPreview)}</span>
              </div>

              <div className="space-y-1.5">
                <Label>Customers Served</Label>
                <Input type="number" {...register("customers_served")} />
              </div>

              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea {...register("notes")} placeholder="Any notes..." rows={2} />
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Submitting..." : "Submit Sales Report"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Today's Reports */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Today&apos;s Reports</h3>
            <Badge variant="secondary">{formatDate(today)}</Badge>
          </div>

          {/* Day Total */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Cash", value: todaySales.reduce((s, r) => s + r.cash_sales, 0), color: "text-emerald-500" },
              { label: "Card", value: todaySales.reduce((s, r) => s + r.card_sales, 0), color: "text-blue-500" },
              { label: "Credit", value: todaySales.reduce((s, r) => s + r.credit_sales, 0), color: "text-amber-500" },
            ].map((item) => (
              <Card key={item.label} className="border-border">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-sm font-bold mt-0.5 ${item.color}`}>{formatCurrency(item.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border">
            <CardContent className="p-3 flex justify-between items-center">
              <span className="font-semibold">Day Total</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(dayTotal)}</span>
            </CardContent>
          </Card>

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          ) : todaySales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-border rounded-2xl">
              <Clock className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No reports submitted yet today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todaySales.map((sale) => (
                <Card key={sale.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{(sale.staff as { name: string } | null)?.name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{(sale.staff as { position: string } | null)?.position}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-primary">{formatCurrency(sale.total_sales)}</p>
                        <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Submitted
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border">
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Cash</p>
                        <p className="text-xs font-semibold text-emerald-500">{formatCurrency(sale.cash_sales)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Card</p>
                        <p className="text-xs font-semibold text-blue-500">{formatCurrency(sale.card_sales)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Credit</p>
                        <p className="text-xs font-semibold text-amber-500">{formatCurrency(sale.credit_sales)}</p>
                      </div>
                    </div>
                    {sale.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">&ldquo;{sale.notes}&rdquo;</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
