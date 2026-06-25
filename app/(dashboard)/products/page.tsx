"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, AlertTriangle, Pencil, Package } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().min(1),
  cost_price: z.coerce.number().min(0),
  sell_price: z.coerce.number().min(0),
  current_stock: z.coerce.number().min(0),
  low_stock_threshold: z.coerce.number().min(0),
});
type ProductForm = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema) as Resolver<ProductForm>,
    defaultValues: { unit: "pcs", category: "General", low_stock_threshold: 10 },
  });

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts(data ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    reset({ name: "", sku: "", category: "General", unit: "pcs", cost_price: 0, sell_price: 0, current_stock: 0, low_stock_threshold: 10 });
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    reset({ name: p.name, sku: p.sku, category: p.category, unit: p.unit, cost_price: p.cost_price, sell_price: p.sell_price, current_stock: p.current_stock, low_stock_threshold: p.low_stock_threshold });
    setDialogOpen(true);
  }

  async function onSubmit(data: ProductForm) {
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("products").update(data).eq("id", editing.id);
      if (error) { toast.error(error.message); } else { toast.success("Product updated"); }
    } else {
      const { error } = await supabase.from("products").insert(data);
      if (error) { toast.error(error.message); } else { toast.success("Product added"); }
    }
    setSaving(false);
    setDialogOpen(false);
    loadProducts();
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );
  const lowStockCount = products.filter((p) => p.current_stock <= p.low_stock_threshold).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Product</span>
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Product Name</Label>
                  <Input {...register("name")} placeholder="Product name" />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>SKU</Label>
                  <Input {...register("sku")} placeholder="SKU-001" />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input {...register("category")} placeholder="Category" />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Input {...register("unit")} placeholder="pcs" />
                </div>
                <div className="space-y-1.5">
                  <Label>Cost Price (QAR)</Label>
                  <Input type="number" step="0.01" {...register("cost_price")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Sell Price (QAR)</Label>
                  <Input type="number" step="0.01" {...register("sell_price")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Current Stock</Label>
                  <Input type="number" {...register("current_stock")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Low Stock Alert</Label>
                  <Input type="number" {...register("low_stock_threshold")} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? "Saving..." : editing ? "Update" : "Add Product"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Products</p>
            <p className="text-2xl font-bold mt-1">{products.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Low Stock</p>
            <p className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? "text-amber-500" : "text-primary"}`}>{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Stock Value</p>
            <p className="text-2xl font-bold mt-1 truncate">
              {formatCurrency(products.reduce((s, p) => s + p.current_stock * p.sell_price, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mb-3 opacity-20" />
          <p>No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const isLow = p.current_stock <= p.low_stock_threshold;
            return (
              <Card key={p.id} className={`border-border hover:border-primary/30 transition-colors ${isLow ? "border-amber-500/40" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku} · {p.category}</p>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      {isLow && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      <Button size="icon" variant="ghost" className="h-7 w-7 cursor-pointer" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Cost</p>
                      <p className="text-sm font-semibold">{formatCurrency(p.cost_price)}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Sell</p>
                      <p className="text-sm font-semibold text-primary">{formatCurrency(p.sell_price)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div>
                      <span className="text-xs text-muted-foreground">Stock: </span>
                      <span className={`text-sm font-bold ${isLow ? "text-amber-500" : ""}`}>{p.current_stock} {p.unit}</span>
                    </div>
                    <Badge variant={isLow ? "destructive" : "secondary"} className="text-[10px]">
                      {isLow ? "Low Stock" : "In Stock"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
