import { PrismaClient, CollaborationFrequency, ChatRole, NominationStatus, RelationshipType } from "@prisma/client";
import { randomUUID } from "crypto";
import { combineReviews } from "../src/lib/combined/combineReviews";

const prisma = new PrismaClient();

type TranscriptMessage = { role: "reviewer" | "assistant"; content: string };

const makeTranscript = (messages: TranscriptMessage[]) =>
  messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

const makeStructuredJson = (input: {
  employee: string;
  reviewer: string;
  relationshipType: RelationshipType;
  collaborationFrequency: CollaborationFrequency;
  startDoing: Array<{ insight: string; description: string; evidence: string; confidence: number }>;
  stopDoing: Array<{ insight: string; description: string; evidence: string; confidence: number }>;
  continueDoing: Array<{ insight: string; description: string; evidence: string; confidence: number }>;
  transcript: TranscriptMessage[];
}) => ({
  metadata: {
    employee: input.employee,
    reviewer: input.reviewer,
    relationship_type: input.relationshipType,
    collaboration_frequency: input.collaborationFrequency,
  },
  start_doing: input.startDoing.map((item) => ({
    insight: item.insight,
    description: item.description,
    evidence: item.evidence,
    confidence_rating: item.confidence,
  })),
  stop_doing: input.stopDoing.map((item) => ({
    insight: item.insight,
    description: item.description,
    evidence: item.evidence,
    confidence_rating: item.confidence,
  })),
  continue_doing: input.continueDoing.map((item) => ({
    insight: item.insight,
    description: item.description,
    evidence: item.evidence,
    confidence_rating: item.confidence,
  })),
  full_transcript: makeTranscript(input.transcript),
});

async function main() {
  await prisma.$transaction([
    prisma.combinedReview.deleteMany(),
    prisma.reviewStructured.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.nomination.deleteMany(),
    prisma.reviewCycle.deleteMany(),
    prisma.person.deleteMany(),
  ]);

  const manager = await prisma.person.create({ data: { name: "Harriet Grant" } });
  const employee = await prisma.person.create({ data: { name: "Alex Morgan" } });

  const [priya, tom, maya, daniel] = await Promise.all([
    prisma.person.create({ data: { name: "Priya Shah" } }),
    prisma.person.create({ data: { name: "Tom Lewis" } }),
    prisma.person.create({ data: { name: "Maya Chen" } }),
    prisma.person.create({ data: { name: "Daniel Wright" } }),
  ]);

  const cycle = await prisma.reviewCycle.create({
    data: {
      employeeId: employee.id,
      managerId: manager.id,
      status: "READY",
    },
  });

  const priyaNomination = await prisma.nomination.create({
    data: {
      cycleId: cycle.id,
      reviewerId: priya.id,
      relationshipType: RelationshipType.PEER,
      collaborationFrequency: CollaborationFrequency.WEEKLY,
      requestToken: randomUUID(),
      status: NominationStatus.SUBMITTED,
      isSeed: true,
    },
  });

  const priyaTranscript: TranscriptMessage[] = [
    {
      role: "reviewer",
      content:
        "Start doing: Share delivery trade-offs earlier in planning so stakeholders can adjust. Stop doing: Taking on urgent ad-hoc requests without checking impact on current commitments. Continue doing: Breaking down complex analysis into clear steps for the team. Anything else: Great partner under pressure.",
    },
    {
      role: "assistant",
      content: "Can you share a specific example for the trade-offs point?",
    },
    {
      role: "reviewer",
      content:
        "During the Q3 pricing experiment, the data gap was flagged at the end; flagging it earlier would have avoided rework.",
    },
  ];

  await prisma.chatMessage.createMany({
    data: priyaTranscript.map((message) => ({
      nominationId: priyaNomination.id,
      role: message.role === "reviewer" ? ChatRole.REVIEWER : ChatRole.ASSISTANT,
      content: message.content,
      isSeed: true,
    })),
  });

  await prisma.reviewStructured.create({
    data: {
      nominationId: priyaNomination.id,
      model: "seeded",
      isSeed: true,
      json: makeStructuredJson({
        employee: employee.name,
        reviewer: priya.name,
        relationshipType: RelationshipType.PEER,
        collaborationFrequency: CollaborationFrequency.WEEKLY,
        startDoing: [
          {
            insight: "Surface trade-offs earlier",
            description:
              "Call out delivery trade-offs earlier in planning so stakeholders can adjust priorities before work starts.",
            evidence:
              "\"During the Q3 pricing experiment, the data gap was flagged at the end; flagging it earlier would have avoided rework.\"",
            confidence: 4,
          },
        ],
        stopDoing: [
          {
            insight: "Protect committed timelines",
            description:
              "Avoid accepting urgent ad-hoc requests without checking the impact on active commitments.",
            evidence:
              "\"Taking on urgent ad-hoc requests without checking impact on current commitments.\"",
            confidence: 3,
          },
        ],
        continueDoing: [
          {
            insight: "Make analysis teachable",
            description:
              "Keep breaking down complex analysis into clear steps so the team can follow and reuse the approach.",
            evidence:
              "\"Breaking down complex analysis into clear steps for the team.\"",
            confidence: 5,
          },
        ],
        transcript: priyaTranscript,
      }),
    },
  });

  const tomNomination = await prisma.nomination.create({
    data: {
      cycleId: cycle.id,
      reviewerId: tom.id,
      relationshipType: RelationshipType.CROSS_FUNCTIONAL,
      collaborationFrequency: CollaborationFrequency.MONTHLY,
      requestToken: randomUUID(),
      status: NominationStatus.SUBMITTED,
      isSeed: true,
    },
  });

  const tomTranscript: TranscriptMessage[] = [
    {
      role: "reviewer",
      content:
        "Start doing: Share a short risk summary before launches. Stop doing: Switching priorities mid-week without a quick heads-up to partners. Continue doing: Bringing clear recommendations with pros/cons. Anything else: Appreciate the calm delivery.",
    },
    {
      role: "assistant",
      content: "Could you provide an example of the priority shift?",
    },
    {
      role: "reviewer",
      content:
        "On the October retention sprint, scope changed mid-week and we only found out in the Friday sync.",
    },
  ];

  await prisma.chatMessage.createMany({
    data: tomTranscript.map((message) => ({
      nominationId: tomNomination.id,
      role: message.role === "reviewer" ? ChatRole.REVIEWER : ChatRole.ASSISTANT,
      content: message.content,
      isSeed: true,
    })),
  });

  await prisma.reviewStructured.create({
    data: {
      nominationId: tomNomination.id,
      model: "seeded",
      isSeed: true,
      json: makeStructuredJson({
        employee: employee.name,
        reviewer: tom.name,
        relationshipType: RelationshipType.CROSS_FUNCTIONAL,
        collaborationFrequency: CollaborationFrequency.MONTHLY,
        startDoing: [
          {
            insight: "Send pre-launch risks",
            description:
              "Share a short risk summary before launches so partner teams can anticipate issues.",
            evidence: "\"Share a short risk summary before launches.\"",
            confidence: 3,
          },
        ],
        stopDoing: [
          {
            insight: "Avoid silent reprioritisation",
            description:
              "Give partner teams a quick heads-up when priorities change mid-week.",
            evidence:
              "\"On the October retention sprint, scope changed mid-week and we only found out in the Friday sync.\"",
            confidence: 4,
          },
        ],
        continueDoing: [
          {
            insight: "Offer balanced recommendations",
            description:
              "Keep bringing clear recommendations with pros and cons to support decision-making.",
            evidence: "\"Bringing clear recommendations with pros/cons.\"",
            confidence: 4,
          },
        ],
        transcript: tomTranscript,
      }),
    },
  });

  const mayaNomination = await prisma.nomination.create({
    data: {
      cycleId: cycle.id,
      reviewerId: maya.id,
      relationshipType: RelationshipType.DIRECT_REPORT,
      collaborationFrequency: CollaborationFrequency.WEEKLY,
      requestToken: randomUUID(),
      status: NominationStatus.SUBMITTED,
      isSeed: true,
    },
  });

  const mayaTranscript: TranscriptMessage[] = [
    {
      role: "reviewer",
      content:
        "Start doing: Offer earlier feedback on drafts so I can iterate faster. Stop doing: Booking recurring meetings without a clear agenda. Continue doing: Making space for questions and coaching. Anything else: Very supportive manager.",
    },
    {
      role: "assistant",
      content: "What was a moment where early feedback helped?",
    },
    {
      role: "reviewer",
      content:
        "When I shared the onboarding deck, your early comments helped me tighten the story before the exec review.",
    },
  ];

  await prisma.chatMessage.createMany({
    data: mayaTranscript.map((message) => ({
      nominationId: mayaNomination.id,
      role: message.role === "reviewer" ? ChatRole.REVIEWER : ChatRole.ASSISTANT,
      content: message.content,
      isSeed: true,
    })),
  });

  await prisma.reviewStructured.create({
    data: {
      nominationId: mayaNomination.id,
      model: "seeded",
      isSeed: true,
      json: makeStructuredJson({
        employee: employee.name,
        reviewer: maya.name,
        relationshipType: RelationshipType.DIRECT_REPORT,
        collaborationFrequency: CollaborationFrequency.WEEKLY,
        startDoing: [
          {
            insight: "Give earlier draft feedback",
            description:
              "Share feedback earlier on drafts to help direct reports iterate quickly.",
            evidence:
              "\"When I shared the onboarding deck, your early comments helped me tighten the story before the exec review.\"",
            confidence: 5,
          },
        ],
        stopDoing: [
          {
            insight: "Reduce agenda-less meetings",
            description:
              "Avoid booking recurring meetings without a clear agenda or purpose.",
            evidence: "\"Booking recurring meetings without a clear agenda.\"",
            confidence: 3,
          },
        ],
        continueDoing: [
          {
            insight: "Keep coaching time open",
            description:
              "Continue making space for questions and coaching moments.",
            evidence: "\"Making space for questions and coaching.\"",
            confidence: 5,
          },
        ],
        transcript: mayaTranscript,
      }),
    },
  });

  // Daniel: 4th submitted seed review with shared communication/feedback themes + variety
  const danielNomination = await prisma.nomination.create({
    data: {
      cycleId: cycle.id,
      reviewerId: daniel.id,
      relationshipType: RelationshipType.MANAGER,
      collaborationFrequency: CollaborationFrequency.WEEKLY,
      requestToken: randomUUID(),
      status: NominationStatus.SUBMITTED,
      isSeed: true,
    },
  });

  const danielTranscript: TranscriptMessage[] = [
    {
      role: "reviewer",
      content:
        "Start doing: Flag constraints and dependencies in project updates earlier. Stop doing: Over-committing to deadlines when variables are still in flux. Continue doing: Maintaining transparent communication during delivery pressures. Anything else: Reliable and adaptable under changing conditions.",
    },
    {
      role: "assistant",
      content: "Can you give an example of the constraint/dependency point?",
    },
    {
      role: "reviewer",
      content:
        "On the API migration project, early visibility of the database locking issue would have saved us from a late pivot in Q4.",
    },
  ];

  await prisma.chatMessage.createMany({
    data: danielTranscript.map((message) => ({
      nominationId: danielNomination.id,
      role: message.role === "reviewer" ? ChatRole.REVIEWER : ChatRole.ASSISTANT,
      content: message.content,
      isSeed: true,
    })),
  });

  await prisma.reviewStructured.create({
    data: {
      nominationId: danielNomination.id,
      model: "seeded",
      isSeed: true,
      json: makeStructuredJson({
        employee: employee.name,
        reviewer: daniel.name,
        relationshipType: RelationshipType.MANAGER,
        collaborationFrequency: CollaborationFrequency.WEEKLY,
        startDoing: [
          {
            insight: "Flag constraints earlier",
            description:
              "Surface project constraints and dependencies in updates earlier to allow for planning adjustments.",
            evidence:
              "\"On the API migration project, early visibility of the database locking issue would have saved us from a late pivot in Q4.\"",
            confidence: 5,
          },
        ],
        stopDoing: [
          {
            insight: "Avoid over-committing",
            description:
              "Refrain from committing to firm deadlines when key project variables are still uncertain or in flux.",
            evidence:
              "\"Over-committing to deadlines when variables are still in flux.\"",
            confidence: 4,
          },
        ],
        continueDoing: [
          {
            insight: "Maintain transparent communication",
            description:
              "Continue keeping stakeholders informed with clear, honest communication during high-pressure delivery phases.",
            evidence:
              "\"Maintaining transparent communication during delivery pressures.\"",
            confidence: 5,
          },
        ],
        transcript: danielTranscript,
      }),
    },
  });

  // Generate combined summary from seed reviews
  console.log("Generating combined review summary from seed data...");
  await combineReviews(cycle.id);
  console.log("Seed complete: 4 submitted reviews with combined summary ready for manager.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
