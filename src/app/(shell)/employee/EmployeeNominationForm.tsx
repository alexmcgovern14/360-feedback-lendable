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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [relationshipType, setRelationshipType] = useState("PEER");
  const [collaborationFrequency, setCollaborationFrequency] = useState("WEEKLY");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const maxReached = existingReviewerIds.length >= 6;

  const selectedPerson = people.find((person) => person.id === selectedId);

  const eligiblePeople = useMemo(
    () => people.filter((person) => !existingReviewerIds.includes(person.id)),
    [people, existingReviewerIds],
  );

  const filteredPeople = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return eligiblePeople;
    return eligiblePeople.filter((person) =>
      person.name.toLowerCase().includes(normalizedQuery),
    );
  }, [eligiblePeople, query]);

  const canSubmit = Boolean(selectedPerson) && !isSubmitting && !maxReached;

  const handleSelect = (person: PersonOption) => {
    setSelectedId(person.id);
    setQuery(person.name);
    setDropdownOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => setDropdownOpen(false), 150);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedPerson) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/employee/nomination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerId: selectedPerson.id,
          relationshipType,
          collaborationFrequency,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to add reviewer" }));
        console.error("Failed to add reviewer:", error);
        return;
      }
      setSelectedId("");
      setQuery("");
      // Refresh the page data - revalidatePath in the API route ensures fresh data
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const showDropdown = dropdownOpen && !maxReached && filteredPeople.length > 0;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          label="Reviewer"
          placeholder="Type a name or click to see full list"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedId("");
            setDropdownOpen(true);
          }}
          onFocus={() => setDropdownOpen(true)}
          onBlur={handleBlur}
        />
        {showDropdown ? (
          <div className="absolute z-10 mt-2 max-h-64 w-full overflow-auto rounded border border-border bg-surface shadow-sm">
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
