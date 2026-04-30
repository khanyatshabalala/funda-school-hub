import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/children")({ component: ChildrenPage });

function ChildrenPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: links }, { data: ss }] = await Promise.all([
      supabase.from("parent_links").select("*, learners(*, schools(name))").eq("parent_user_id", user.id),
      supabase.from("schools").select("id,name").order("name"),
    ]);
    setChildren(links ?? []);
    setSchools(ss ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const school_id = fd.get("school_id") as string;
    const first = fd.get("first_name") as string;
    const last = fd.get("last_name") as string;
    const grade = parseInt(fd.get("grade_id") as string);
    if (!school_id || !first || !last) return toast.error("Fill all fields");

    // RLS lets parents only insert into learners they manage; school admins do that. For parent self-add demo, we use the school-admin policy fallback won't allow it. So we'll insert via a "request" model: create the learner record only if user has school admin rights. Otherwise, just create a parent_link to a hypothetical learner — for the v1 demo, allow it via direct insert only when schools have a self-serve policy. Fallback: error gracefully.
    const { data: learner, error: lerr } = await supabase.from("learners").insert({
      school_id, first_name: first, last_name: last, grade_id: grade,
    }).select().maybeSingle();
    if (lerr || !learner) {
      toast.error("To connect a child, please ask your school admin to register them first.");
      return;
    }
    const { error: linkErr } = await supabase.from("parent_links").insert({
      parent_user_id: user!.id, learner_id: learner.id, relationship: "parent", is_primary: true,
    });
    if (linkErr) return toast.error(linkErr.message);
    toast.success("Child added");
    setOpen(false);
    load();
  };

  return (
    <div className="max-w-5xl">
      <PageHeader title="My children" sub="Connect to your children's school records."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="size-4 mr-1"/>Add child</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Connect a child</DialogTitle><DialogDescription>Add your child's details to link them to their school.</DialogDescription></DialogHeader>
              <form onSubmit={onSubmit} className="space-y-3">
                <div><Label>First name</Label><Input name="first_name" required /></div>
                <div><Label>Last name</Label><Input name="last_name" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Grade</Label>
                    <Select name="grade_id" defaultValue="8">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{[0,1,2,3,4,5,6,7,8,9,10,11,12].map(g => <SelectItem key={g} value={String(g)}>{g===0 ? "R" : `Grade ${g}`}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>School</Label>
                    <Select name="school_id"><SelectTrigger><SelectValue placeholder="Choose"/></SelectTrigger>
                      <SelectContent>{schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Add child</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {children.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No children yet. Add one above.</Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((c: any) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{c.learners?.first_name} {c.learners?.last_name}</div>
                  <div className="text-xs text-muted-foreground">{c.learners?.schools?.name}</div>
                </div>
                <Badge variant="secondary">Grade {c.learners?.grade_id}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-3 capitalize">{c.relationship} {c.is_primary && "· Primary"}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
