"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { deleteAdminLearner } from "@/app/actions";
import type { LearnerResponse } from "@/lib/types";

export function AdminLearnersClient({ schemaName, initial }: { schemaName: string; initial: LearnerResponse[] }) {
  const [list, setList] = useState(initial);
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();

  const q = query.toLowerCase();
  const visible = q
    ? list.filter(l =>
        l.fullname.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.includes(q),
      )
    : list;

  const remove = (id: number, name: string) => start(async () => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const r = await deleteAdminLearner(schemaName, id);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Learner deleted");
    setList(list.filter(l => l.id !== id));
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learners ({list.length})</CardTitle>
        <Input
          className="mt-2 max-w-xs"
          placeholder="Search by name, email or phone…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No learners in this tenant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Graduated</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No matching learners.</td></tr>}
                {visible.map(l => (
                  <tr key={l.id} className="border-t">
                    <td className="py-2 font-medium">{l.fullname}</td>
                    <td>{l.email}</td>
                    <td className="font-mono text-xs">{l.phone}</td>
                    <td>{l.graduated ? "Yes" : "No"}</td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => remove(l.id, l.fullname)}
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
