"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { Staff } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, UserCheck, UserX, Pencil, Users } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";

const staffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  position: z.string().min(1),
  basic_salary: z.coerce.number().min(0),
});
type StaffForm = z.infer<typeof staffSchema>;

export default function StaffPage() {
  const supabase = createClient();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StaffForm>({
    resolver: zodResolver(staffSchema) as Resolver<StaffForm>,
    defaultValues: { basic_salary: 0, position: "Sales Staff" },
  });

  useEffect(() => { loadStaff(); }, []);

  async function loadStaff() {
    setLoading(true);
    const { data } = await supabase.from("staff").select("*").order("name");
    setStaff(data ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    reset({ name: "", email: "", phone: "", position: "Sales Staff", basic_salary: 0 });
    setDialogOpen(true);
  }

  function openEdit(s: Staff) {
    setEditing(s);
    reset({ name: s.name, email: s.email, phone: s.phone ?? "", position: s.position, basic_salary: s.basic_salary });
    setDialogOpen(true);
  }

  async function onSubmit(data: StaffForm) {
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("staff").update(data).eq("id", editing.id);
      if (error) { toast.error(error.message); } else { toast.success("Staff updated"); }
    } else {
      const { error } = await supabase.from("staff").insert(data);
      if (error) { toast.error(error.message); } else { toast.success("Staff added"); }
    }
    setSaving(false);
    setDialogOpen(false);
    loadStaff();
  }

  async function toggleActive(s: Staff) {
    const { error } = await supabase.from("staff").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success(s.is_active ? "Staff deactivated" : "Staff activated");
    loadStaff();
  }

  const filtered = staff.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Staff</span>
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Staff" : "Add New Staff"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...register("name")} placeholder="Ahmed Al-Rashid" />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register("email")} placeholder="ahmed@store.com" />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...register("phone")} placeholder="+974 5555 0000" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="position">Position</Label>
                  <Input id="position" {...register("position")} placeholder="Sales Staff" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="basic_salary">Basic Salary (QAR)</Label>
                  <Input id="basic_salary" type="number" {...register("basic_salary")} />
                  {errors.basic_salary && <p className="text-xs text-destructive">{errors.basic_salary.message}</p>}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? "Saving..." : editing ? "Update" : "Add Staff"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Staff</p>
            <p className="text-2xl font-bold mt-1">{staff.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold mt-1 text-primary">{staff.filter((s) => s.is_active).length}</p>
          </CardContent>
        </Card>
        <Card className="border-border hidden sm:block">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Salary</p>
            <p className="text-2xl font-bold mt-1">
              {staff.length ? formatCurrency(staff.reduce((s, r) => s + r.basic_salary, 0) / staff.length) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-20" />
          <p>No staff found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <Card key={s.id} className={`border-border transition-colors hover:border-primary/30 ${!s.is_active ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                      {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.position}</p>
                    </div>
                  </div>
                  <Badge variant={s.is_active ? "default" : "secondary"} className="shrink-0 ml-1 text-xs">
                    {s.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-3">{s.email}</p>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm font-semibold text-primary">{formatCurrency(s.basic_salary)}/mo</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 cursor-pointer" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 cursor-pointer" onClick={() => toggleActive(s)}>
                      {s.is_active ? <UserX className="h-3.5 w-3.5 text-destructive" /> : <UserCheck className="h-3.5 w-3.5 text-primary" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
