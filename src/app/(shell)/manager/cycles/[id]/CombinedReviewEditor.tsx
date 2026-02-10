"use client";

import { useState } from "react";
import { Button } from "@/components/Button";

type Insight = {
  title: string;
  synthesis: string;
  why_prioritized?: string;
  evidence_quotes?: string[];
};

export type CombinedData = {
  executive_summary: string;
  start_doing: Insight[];
  stop_doing: Insight[];
  continue_doing: Insight[];
};

type Props = {
  cycleId: string;
  status: "DRAFT" | "FINALISED";
  initialData: CombinedData;
};

export function CombinedReviewEditor({ cycleId, status, initialData }: Props) {
  const [draft, setDraft] = useState<CombinedData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [finalised, setFinalised] = useState(status === "FINALISED");

  const updateInsight = (
    section: keyof CombinedData,
    index: number,
    value: string,
  ) => {
    setDraft((prev) => {
      const next = { ...prev };
      if (section === "executive_summary") {
        next.executive_summary = value;
        return next;
      }
      const items = [...(prev[section] as Insight[])];
      items[index] = { ...items[index], synthesis: value };
      (next[section] as Insight[]) = items;
      return next;
    });
  };

  const saveEdits = async () => {
    setIsSaving(true);
    try {
      await fetch(`/api/manager/cycles/${cycleId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", editedJson: draft }),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const finalise = async () => {
    setIsSaving(true);
    try {
      await fetch(`/api/manager/cycles/${cycleId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalise", editedJson: draft }),
      });
      setFinalised(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Executive summary</h2>
          <div className="flex items-center gap-2">
            <Button onClick={saveEdits} disabled={isSaving || finalised}>
              Save
            </Button>
            <Button
              variant="secondary"
              onClick={finalise}
              disabled={isSaving || finalised}
            >
              Finalise
            </Button>
          </div>
        </div>
        <textarea
          className="mt-3 w-full resize-none rounded border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground"
          rows={Math.max(3, Math.ceil(draft.executive_summary.length / 80))}
          value={draft.executive_summary}
          onChange={(event) => updateInsight("executive_summary", 0, event.target.value)}
          disabled={finalised}
        />
      </div>

      {(["start_doing", "stop_doing", "continue_doing"] as const).map((section) => (
        <div key={section} className="rounded border border-border bg-surface p-4">
          <h3 className="text-base font-semibold text-foreground">
            {section.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
          </h3>
          <div className="mt-4 space-y-4">
            {(draft[section] as Insight[]).length === 0 ? (
              <p className="text-sm text-muted">No insights prioritised.</p>
            ) : (
              (draft[section] as Insight[]).map((item, index) => (
                <div key={`${section}-${index}`} className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    {item.title}
                  </p>
                  <textarea
                    className="w-full resize-none rounded border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground"
                    rows={Math.max(3, Math.ceil(item.synthesis.length / 80))}
                    value={item.synthesis}
                    onChange={(event) =>
                      updateInsight(section, index, event.target.value)
                    }
                    disabled={finalised}
                  />
                  {item.why_prioritized ? (
                    <p className="text-xs text-muted">
                      Why prioritised: {item.why_prioritized}
                    </p>
                  ) : null}
                  {item.evidence_quotes && item.evidence_quotes.length > 0 ? (
                    <div className="text-xs text-muted">
                      Evidence: {item.evidence_quotes.join(" ")}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
