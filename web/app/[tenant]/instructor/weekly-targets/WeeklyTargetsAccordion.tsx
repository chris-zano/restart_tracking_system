"use client";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { WEEK_NUMBERS, type WeeklyTargetResponse } from "@/lib/types";

export function WeeklyTargetsAccordion({ targets }: { targets: WeeklyTargetResponse[] }) {
  const byWeek = Object.fromEntries(targets.map(t => [t.weekNumber, t]));

  return (
    <Accordion type="single" collapsible className="rounded-md border divide-y divide-border">
      {WEEK_NUMBERS.map(w => {
        const t = byWeek[w];
        const kcCount = t?.knowledgeChecks.length ?? 0;
        const labCount = t?.labs.length ?? 0;
        return (
          <AccordionItem key={w} value={w} className="border-0">
            <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/50 rounded-none">
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm">{w.replace("_", " ")}</span>
                <Badge variant={t ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                  {t ? `${kcCount} KC · ${labCount} Lab` : "Not set"}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {t ? (
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium mb-1 text-xs uppercase tracking-wide text-muted-foreground">Knowledge checks ({kcCount})</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                      {t.knowledgeChecks.map(k => <li key={k}>{k}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1 text-xs uppercase tracking-wide text-muted-foreground">Labs ({labCount})</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                      {t.labs.map(l => <li key={l}>{l}</li>)}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No targets set for this week yet.</p>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
