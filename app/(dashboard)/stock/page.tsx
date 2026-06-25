"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { Product, ClosingStock } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Archive, AlertTriangle, CheckCircle, TrendingDown, Package } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface StockEntry {
  product_id: string;
  opening: number;
  closing: number;
  notes: string;
}

export default function StockPage() {
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<Record<string, StockEntry>>({});
  const [previousClosing, setPreviousClosing] = useState<Record<string, ClosingStock>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stockDate, setStockDate] = useState(today);

  useEffect(() => { loadData(); }, [stockDate]);

  async function loadData() {
    setLoading(true);
    const [prodRes, closingRes, prevRes] = await Promise.all([
      supabase.from("products").select("*").eq("is_active", true).order("name"),
      supabase.from("closing_stock").select("*").eq("stock_date", stockDate),
      supabase.from("opening_stock").select("*").eq("stock_date", stockDate),
    ]);

    const prods = prodRes.data ?? [];
    setProducts(prods);

    const prevMap: Record<string, ClosingStock> = {};
    (closingRes.data ?? []).forEach((c) => { prevMap[c.product_id] = c; });
    setPreviousClosing(prevMap);
    setSubmitted(Object.keys(prevMap).length > 0);

    const initialEntries: Record<string, StockEntry> = {};
    prods.forEach((p) => {
      const existing = prevMap[p.id];
      initialEntries[p.id] = {
        product_id: p.id,
        opening: existing?.opening_quantity ?? p.current_stock,
        closing: existing?.closing_quantity ?? 0,
        notes: existing?.notes ?? "",
      };
    });
    setEntries(initialEntries);
    setLoading(false);
  }

  function updateEntry(productId: string, field: keyof StockEntry, value: string | number) {
    setEntries((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  }

  async function handleSubmit() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const records = Object.values(entries).map((e) => ({
      product_id: e.product_id,
      stock_date: stockDate,
      opening_quantity: e.opening,
      closing_quantity: e.closing,
      variance: e.closing - (previousClosing[e.product_id]?.closing_quantity ?? e.opening),
      recorded_by: user?.id,
      notes: e.notes || null,
    }));

    const { error } = await supabase.from("closing_stock").upsert(records, { onConflict: "product_id,stock_date" });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Closing stock submitted!");
      loadData();
    }
    setSaving(false);
  }

  const totalSold = Object.values(entries).reduce((s, e) => s + Math.max(0, e.opening - e.closing), 0);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <Archive className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Daily Closing Stock</p>
                <p className="text-xs text-muted-foreground">Enter end-of-day physical stock counts</p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <Label className="text-sm shrink-0">Stock Date</Label>
              <Input type="date" value={stockDate} onChange={(e) => setStockDate(e.target.value)} className="w-40" />
            </div>
          </div>
        </CardContent>
      </Card>

      {submitted && (
        <Alert className="border-primary/30 bg-primary/5">
          <CheckCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            Closing stock already submitted for {formatDate(stockDate)}. You can update the entries below.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Products</p>
            <p className="text-2xl font-bold mt-1">{products.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Sold Today</p>
            <p className="text-2xl font-bold mt-1 text-primary">{totalSold}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Low Stock Items</p>
            <p className="text-2xl font-bold mt-1 text-amber-500">
              {products.filter((p) => (entries[p.id]?.closing ?? p.current_stock) <= p.low_stock_threshold).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Entries */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const entry = entries[p.id];
            if (!entry) return null;
            const sold = Math.max(0, entry.opening - entry.closing);
            const isLow = entry.closing <= p.low_stock_threshold;

            return (
              <Card key={p.id} className={`border-border ${isLow ? "border-amber-500/30" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku} · {p.unit}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isLow && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      {sold > 0 && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" /> -{sold}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Opening</Label>
                      <Input
                        type="number"
                        value={entry.opening}
                        onChange={(e) => updateEntry(p.id, "opening", Number(e.target.value))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Closing</Label>
                      <Input
                        type="number"
                        value={entry.closing}
                        onChange={(e) => updateEntry(p.id, "closing", Number(e.target.value))}
                        className={`h-9 text-sm ${isLow ? "border-amber-500 focus-visible:ring-amber-500" : ""}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Sold</Label>
                      <div className="h-9 flex items-center px-3 rounded-lg bg-muted text-sm font-semibold text-primary">
                        {sold}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Textarea
                      placeholder="Notes (optional)"
                      value={entry.notes}
                      onChange={(e) => updateEntry(p.id, "notes", e.target.value)}
                      rows={1}
                      className="text-xs resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {products.length > 0 && (
        <Button onClick={handleSubmit} disabled={saving} className="w-full h-11 font-semibold">
          {saving ? "Saving..." : submitted ? "Update Closing Stock" : "Submit Closing Stock"}
        </Button>
      )}
    </div>
  );
}
