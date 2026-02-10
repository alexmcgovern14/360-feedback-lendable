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

  const [priya, tom, maya, daniel, sarah] = await Promise.all([
    prisma.person.create({ data: { name: "Priya Shah" } }),
    prisma.person.create({ data: { name: "Tom Lewis" } }),
    prisma.person.create({ data: { name: "Maya Chen" } }),
    prisma.person.create({ data: { name: "Daniel Wright" } }),
    prisma.person.create({ data: { name: "Sarah Johnson" } }),
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
        "Start doing: Flag project constraints and dependencies earlier in updates so we can plan around them. Stop doing: Switching priorities mid-sprint without giving partners a heads-up. Continue doing: Breaking down complex analysis into clear, teachable steps for the team. Anything else: Great partner under pressure.",
    },
    {
      role: "assistant",
      content: "Can you share a specific example of the constraints point?",
    },
    {
      role: "reviewer",
      content:
        "During the Q3 pricing experiment, the data dependency was flagged late which caused rework. Surfacing it earlier would have saved the team a week.",
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
            insight: "Flag constraints earlier",
            description:
              "Surface project constraints and dependencies in updates earlier so teams can adjust plans before issues become blockers.",
            evidence:
              "\"During the Q3 pricing experiment, the data dependency was flagged late which caused rework. Surfacing it earlier would have saved the team a week.\"",
            confidence: 5,
          },
        ],
        stopDoing: [
          {
            insight: "Avoid silent reprioritisation",
            description:
              "Give partner teams a quick heads-up when priorities shift mid-sprint rather than surprising them in weekly syncs.",
            evidence:
              "\"Switching priorities mid-sprint without giving partners a heads-up.\"",
            confidence: 4,
          },
        ],
        continueDoing: [
          {
            insight: "Make work teachable",
            description:
              "Keep breaking down complex analysis into clear, reusable steps that help the team learn and build on the approach.",
            evidence:
              "\"Breaking down complex analysis into clear, teachable steps for the team.\"",
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
        "Start doing: Share feedback earlier on work-in-progress so we can course-correct before it's too late. Stop doing: Switching priorities mid-week without giving cross-functional partners a heads-up. Continue doing: Maintaining transparent communication during high-pressure periods. Anything else: Appreciate the calm delivery.",
    },
    {
      role: "assistant",
      content: "Can you share an example of when earlier feedback would have helped?",
    },
    {
      role: "reviewer",
      content:
        "On the retention dashboard project, early feedback on the metrics approach would have avoided a full redesign in week 3. We only saw it in the final review.",
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
            insight: "Give earlier feedback",
            description:
              "Share feedback earlier on work-in-progress to allow course correction before final delivery stages.",
            evidence:
              "\"On the retention dashboard project, early feedback on the metrics approach would have avoided a full redesign in week 3. We only saw it in the final review.\"",
            confidence: 4,
          },
        ],
        stopDoing: [
          {
            insight: "Avoid silent reprioritisation",
            description:
              "Give cross-functional partners advance notice when priorities shift mid-sprint rather than surprising them in weekly syncs.",
            evidence:
              "\"Switching priorities mid-week without giving cross-functional partners a heads-up.\"",
            confidence: 4,
          },
        ],
        continueDoing: [
          {
            insight: "Maintain transparent communication",
            description:
              "Continue keeping stakeholders informed with clear, honest updates during high-pressure delivery phases.",
            evidence:
              "\"Maintaining transparent communication during high-pressure periods.\"",
            confidence: 5,
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
        "Start doing: Share feedback earlier on drafts and works-in-progress so I can iterate before polishing. Stop doing: Scheduling recurring check-ins without a clear agenda or purpose—makes them feel like box-ticking. Continue doing: Breaking down complex problems into teachable steps that help me learn the thinking. Anything else: Very supportive manager.",
    },
    {
      role: "assistant",
      content: "Can you give an example where early feedback made a difference?",
    },
    {
      role: "reviewer",
      content:
        "When I shared the onboarding deck early, your comments on the narrative structure helped me refocus before the exec review. If I'd waited until the final version, I would have had to start over.",
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
            insight: "Give earlier feedback",
            description:
              "Provide feedback earlier on drafts and works-in-progress to enable iteration before the polishing stage.",
            evidence:
              "\"When I shared the onboarding deck early, your comments on the narrative structure helped me refocus before the exec review. If I'd waited until the final version, I would have had to start over.\"",
            confidence: 5,
          },
        ],
        stopDoing: [
          {
            insight: "Reduce unnecessary meetings",
            description:
              "Avoid scheduling recurring check-ins without clear agendas or objectives—they can feel like administrative overhead.",
            evidence:
              "\"Scheduling recurring check-ins without a clear agenda or purpose—makes them feel like box-ticking.\"",
            confidence: 4,
          },
        ],
        continueDoing: [
          {
            insight: "Make work teachable",
            description:
              "Continue breaking down complex problems into clear, step-by-step explanations that help others learn the underlying thinking.",
            evidence:
              "\"Breaking down complex problems into teachable steps that help me learn the thinking.\"",
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
        "Start doing: Call out technical constraints and dependencies earlier in project updates so we can route around them. Stop doing: Accepting last-minute meetings that disrupt deep work—better to batch communication. Continue doing: Keeping communication transparent and proactive during complex deliveries. Anything else: Reliable and adaptable under changing conditions.",
    },
    {
      role: "assistant",
      content: "Can you share a specific example of the constraints issue?",
    },
    {
      role: "reviewer",
      content:
        "On the API migration project, the database locking constraint surfaced late in Q4, forcing a rushed pivot. Flagging it in the project kickoff would have given us time to design around it.",
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
              "Identify and communicate technical constraints and dependencies earlier in project cycles to enable proactive planning and design adjustments.",
            evidence:
              "\"On the API migration project, the database locking constraint surfaced late in Q4, forcing a rushed pivot. Flagging it in the project kickoff would have given us time to design around it.\"",
            confidence: 5,
          },
        ],
        stopDoing: [
          {
            insight: "Reduce unnecessary meetings",
            description:
              "Decline last-minute meetings that fragment focused work time—batch communication more intentionally to protect deep work blocks.",
            evidence:
              "\"Accepting last-minute meetings that disrupt deep work—better to batch communication.\"",
            confidence: 4,
          },
        ],
        continueDoing: [
          {
            insight: "Maintain transparent communication",
            description:
              "Continue providing clear, proactive updates to stakeholders throughout complex deliveries, especially during high-pressure phases.",
            evidence:
              "\"Keeping communication transparent and proactive during complex deliveries.\"",
            confidence: 5,
          },
        ],
        transcript: danielTranscript,
      }),
    },
  });

  // Sarah: 5th nomination - REQUESTED status for testing reviewer flow (isSeed: false so it shows on reviewer page)
  await prisma.nomination.create({
    data: {
      cycleId: cycle.id,
      reviewerId: sarah.id,
      relationshipType: RelationshipType.PEER,
      collaborationFrequency: CollaborationFrequency.MONTHLY,
      requestToken: randomUUID(),
      status: NominationStatus.REQUESTED,
      isSeed: false,
    },
  });

  // Generate combined summary from seed reviews
  console.log("Generating combined review summary from seed data...");
  await combineReviews(cycle.id);
  console.log("Seed complete: 4 submitted reviews + 1 outstanding request for testing.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
