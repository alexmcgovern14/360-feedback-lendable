import { CollaborationFrequency, RelationshipType } from "@prisma/client";

export const relationshipWeight: Record<RelationshipType, number> = {
  MANAGER: 1.3,
  DIRECT_REPORT: 1.1,
  PEER: 1.0,
  CROSS_FUNCTIONAL: 0.9,
};

export const frequencyWeight: Record<CollaborationFrequency, number> = {
  WEEKLY: 1.2,
  MONTHLY: 1.0,
  RARELY: 0.8,
};

export function computeWeight(args: {
  relationshipType: RelationshipType;
  collaborationFrequency: CollaborationFrequency;
  confidenceRating: number;
}) {
  const base =
    relationshipWeight[args.relationshipType] *
    frequencyWeight[args.collaborationFrequency];
  return Number((base * (args.confidenceRating / 5)).toFixed(2));
}
