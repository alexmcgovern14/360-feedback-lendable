import { notFound } from "next/navigation";
import { Card } from "@/components/Card";
import { loadReviewState } from "@/lib/runtime/review-artifacts";
import { prisma } from "@/lib/db";
import { ReviewerRequestClient } from "./ReviewerRequestClient";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function ReviewerRequestPage({ params }: PageProps) {
  const { token } = await params;

  if (process.env.USE_JSON_DATA === "true") {
    const state = await loadReviewState(token);
    if (!state) notFound();
    const initialMessages = state.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
    return (
      <div className="flex h-[calc(100vh-3rem)] min-h-0 flex-col gap-6">
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Review request</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            Feedback for {state.employee.name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Your feedback helps build a clear, evidence-based 360 review. Please add
            as much detail as possible — we’ll then ask some follow-up questions.
          </p>
        </Card>

        <div className="min-h-0 flex-1">
          <ReviewerRequestClient
            token={token}
            employeeName={state.employee.name}
            reviewerName={state.reviewer.name}
            status={state.status}
            initialMessages={initialMessages}
          />
        </div>
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
    <div className="flex h-[calc(100vh-3rem)] min-h-0 flex-col gap-6">
      <Card>
        <p className="text-xs uppercase tracking-wide text-muted">Review request</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Feedback for {nomination.cycle.employee.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Your feedback helps build a clear, evidence-based 360 review. Please add
          as much detail as possible — we’ll then ask some follow-up questions.
        </p>
      </Card>

      <div className="min-h-0 flex-1">
        <ReviewerRequestClient
          token={token}
          employeeName={nomination.cycle.employee.name}
          reviewerName={nomination.reviewer.name}
          status={nomination.status}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );
}
