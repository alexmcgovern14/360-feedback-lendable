import { notFound } from "next/navigation";
import { Card } from "@/components/Card";
import { getNominationByToken } from "@/lib/json-data";
import { prisma } from "@/lib/db";
import { ReviewerRequestClient } from "./ReviewerRequestClient";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function ReviewerRequestPage({ params }: PageProps) {
  const { token } = await params;

  if (process.env.USE_JSON_DATA === "true") {
    const nomination = getNominationByToken(token);
    if (!nomination) notFound();
    const initialMessages = nomination.chatMessages.map((message) => ({
      role: (message.role === "ASSISTANT" ? "assistant" : "reviewer") as "reviewer" | "assistant",
      content: message.content,
    }));
    return (
      <div className="space-y-6">
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Review request</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            Feedback for {nomination.cycle.employee.name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Your feedback helps build a clear, evidence-based 360 review.
          </p>
        </Card>

        <ReviewerRequestClient
          token={token}
          employeeName={nomination.cycle.employee.name}
          reviewerName={nomination.reviewer.name}
          status={nomination.status as "REQUESTED" | "SUBMITTED"}
          initialMessages={initialMessages}
        />
      </div>
    );
  }

  const nomination = await prisma.nomination.findUnique({
    where: { requestToken: token },
    include: {
      reviewer: true,
      cycle: { include: { employee: true } },
      chatMessages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!nomination) {
    notFound();
  }

  const initialMessages = nomination.chatMessages.map((message) => ({
    role: (message.role === "ASSISTANT" ? "assistant" : "reviewer") as "reviewer" | "assistant",
    content: message.content,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-xs uppercase tracking-wide text-muted">Review request</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Feedback for {nomination.cycle.employee.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Your feedback helps build a clear, evidence-based 360 review.
        </p>
      </Card>

      <ReviewerRequestClient
        token={token}
        employeeName={nomination.cycle.employee.name}
        reviewerName={nomination.reviewer.name}
        status={nomination.status}
        initialMessages={initialMessages}
      />
    </div>
  );
}
