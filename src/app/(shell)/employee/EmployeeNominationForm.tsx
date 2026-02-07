"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

type PersonOption = {
  id: string;
  name: string;
};

type FormProps = {
  people: PersonOption[];
  existingReviewerIds: string[];
};

const relationshipOptions = [
  { value: "MANAGER", label: "Manager" },
  { value: "PEER", label: "Peer" },
  { value: "DIRECT_REPORT", label: "Direct report" },
  { value: "CROSS_FUNCTIONAL", label: "Cross-functional" },
];

const frequencyOptions = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "RARELY", label: "Rarely" },
];

export function EmployeeNominationForm({ people, existingReviewerIds }: FormProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [relationshipType, setRelationshipType] = useState("PEER");
  const [collaborationFrequency, setCollaborationFrequency] = useState("WEEKLY");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const maxReached = existingReviewerIds.length >= 6;

  const selectedPerson = people.find((person) => person.id === selectedId);

  const filteredPeople = useMemo(() => {
    const normalizedQuery = query.toLowerCase();
    return people
      .filter((person) => !existingReviewerIds.includes(person.id))
      .filter((person) =>
        person.name.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 6);
  }, [people, existingReviewerIds, query]);

  const canSubmit = Boolean(selectedPerson) && !isSubmitting && !maxReached;

  const handleSelect = (person: PersonOption) => {
    setSelectedId(person.id);
    setQuery(person.name);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedPerson) return;
    setIsSubmitting(true);
    try {
      await fetch("/api/employee/nomination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerId: selectedPerson.id,
          relationshipType,
          collaborationFrequency,
        }),
      });
      setSelectedId("");
      setQuery("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          label="Reviewer"
          placeholder="Start typing a name"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedId("");
          }}
        />
        {query.length > 0 && !selectedId && filteredPeople.length > 0 ? (
          <div className="absolute z-10 mt-2 w-full rounded border border-border bg-surface shadow-sm">
            {filteredPeople.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => handleSelect(person)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-background"
              >
                {person.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-foreground">Relationship type</span>
          <select
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
            value={relationshipType}
            onChange={(event) => setRelationshipType(event.target.value)}
          >
            {relationshipOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-foreground">
            Collaboration frequency
          </span>
          <select
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
            value={collaborationFrequency}
            onChange={(event) => setCollaborationFrequency(event.target.value)}
          >
            {frequencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          Add reviewer
        </Button>
        <span className="text-xs text-muted">
          {existingReviewerIds.length} reviewers added (min 3, max 6)
        </span>
      </div>
    </div>
  );
}
