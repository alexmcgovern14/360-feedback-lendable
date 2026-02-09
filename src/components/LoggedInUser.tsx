"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Persona = {
  type: "employee" | "reviewer" | "manager";
  name: string;
  jobTitle: string;
};

const PERSONA_COLORS = {
  employee: "bg-blue-100 text-blue-800 border-blue-300",
  reviewer: "bg-orange-100 text-orange-800 border-orange-300",
  manager: "bg-purple-100 text-purple-800 border-purple-300",
};

export function LoggedInUser() {
  const pathname = usePathname();
  const [persona, setPersona] = useState<Persona | null>(null);

  useEffect(() => {
    async function fetchPersona() {
      try {
        const response = await fetch(`/api/persona?pathname=${encodeURIComponent(pathname)}`);
        if (response.ok) {
          const data = await response.json();
          setPersona(data);
        }
      } catch (err) {
        console.error("Failed to fetch persona:", err);
      }
    }
    fetchPersona();
  }, [pathname]);

  if (!persona) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm font-medium ${PERSONA_COLORS[persona.type]}`}
    >
      <div className="font-semibold">{persona.name}</div>
      <div className="text-xs opacity-80">{persona.jobTitle}</div>
    </div>
  );
}
