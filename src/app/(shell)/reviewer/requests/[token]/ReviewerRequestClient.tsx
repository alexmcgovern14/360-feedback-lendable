"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Collapsible } from "@/components/Collapsible";
import { Textarea } from "@/components/Textarea";

type ChatMessage = {
  role: "reviewer" | "assistant";
  content: string;
};

type Props = {
  token: string;
  employeeName: string;
  reviewerName: string;
  status: "REQUESTED" | "SUBMITTED";
  initialMessages: ChatMessage[];
};

export function ReviewerRequestClient({
  token,
  employeeName,
  reviewerName,
  status,
  initialMessages,
}: Props) {
  const [stage, setStage] = useState(status === "SUBMITTED" ? "completed" : "form");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isSending, setIsSending] = useState(false);
  const [followUpsUsed, setFollowUpsUsed] = useState(0);

  const [startDoing, setStartDoing] = useState("");
  const [stopDoing, setStopDoing] = useState("");
  const [continueDoing, setContinueDoing] = useState("");
  const [anythingElse, setAnythingElse] = useState("");
  const [reply, setReply] = useState("");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<any | null>(null);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);

  const canSubmitForm =
    startDoing.trim().length > 0 ||
    stopDoing.trim().length > 0 ||
    continueDoing.trim().length > 0 ||
    anythingElse.trim().length > 0;

  const submitInitialForm = async () => {
    if (!canSubmitForm || isSending) return;
    setIsSending(true);
    setSubmitError(null);
    try {
      const response = await fetch(`/api/reviewer/requests/${token}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDoing,
          stopDoing,
          continueDoing,
          anythingElse,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      const nextMessages: ChatMessage[] = data.messages ?? [];
      setMessages(nextMessages.length > 0 ? nextMessages : messages);
      setStage(data.status === "complete" ? "completed" : "chat");
      setFollowUpsUsed(data.followUpsUsed ?? 0);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const sendReply = async (skip = false) => {
    if (isSending) return;
    if (!skip && reply.trim().length === 0) return;
    setIsSending(true);
    setSubmitError(null);
    try {
      const response = await fetch(`/api/reviewer/requests/${token}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply, skip }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setMessages(data.messages ?? messages);
      setReply("");
      setStage(data.status === "complete" ? "completed" : "chat");
      setFollowUpsUsed(data.followUpsUsed ?? followUpsUsed);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const loadArtifacts = async () => {
    setIsLoadingArtifacts(true);
    setArtifactsError(null);
    try {
      const res = await fetch(`/api/observability/reviewer/${token}`);
      const data = await res.json();
      if (!res.ok) {
        setArtifactsError(data?.error ?? "Failed to load JSON artifacts.");
        return;
      }
      setArtifacts(data);
    } catch (err) {
      setArtifactsError(err instanceof Error ? err.message : "Failed to load JSON artifacts.");
    } finally {
      setIsLoadingArtifacts(false);
    }
  };

  return (
    <div className="space-y-6">
      {stage === "form" ? (
        <div className="space-y-5">
          <div className="rounded border border-info-border bg-info-bg px-4 py-3 text-sm text-foreground">
            Please add as much detail as possible. We’ll then ask a few more questions.
          </div>
          <div className="grid gap-4">
            <Textarea
              label="Start doing"
              placeholder={`What could ${employeeName} start doing that they're not doing yet? New behaviours or changes that would help — with examples if you can.`}
              rows={3}
              value={startDoing}
              onChange={(event) => setStartDoing(event.target.value)}
            />
            <Textarea
              label="Stop doing"
              placeholder={`What should ${employeeName} stop doing? Behaviours or habits that get in the way — with examples if you can.`}
              rows={3}
              value={stopDoing}
              onChange={(event) => setStopDoing(event.target.value)}
            />
            <Textarea
              label="Continue doing"
              placeholder={`What should ${employeeName} continue doing? Things that already work well — with concrete examples.`}
              rows={3}
              value={continueDoing}
              onChange={(event) => setContinueDoing(event.target.value)}
            />
            <Textarea
              label="Anything else"
              placeholder="Anything else you'd like to add?"
              rows={3}
              value={anythingElse}
              onChange={(event) => setAnythingElse(event.target.value)}
            />
          </div>
          {submitError ? (
            <p className="text-sm text-red-600" role="alert">
              {submitError}
            </p>
          ) : null}
          <Button onClick={submitInitialForm} disabled={!canSubmitForm || isSending}>
            {isSending ? "Sending…" : "Send feedback"}
          </Button>

          <div className="rounded border border-border bg-background px-4 py-3 text-xs text-muted">
            AI follow-up chat will appear here once you submit the form.
          </div>
        </div>
      ) : null}

      {stage !== "form" ? (
        <div className="space-y-4">
          <div className="rounded border border-border bg-background px-4 py-3 text-sm text-muted">
            Reviewing {employeeName} · Reviewer: {reviewerName}
          </div>
          <div className="space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted">No messages yet.</p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded border border-border px-3 py-2 text-sm ${
                    message.role === "assistant"
                      ? "bg-info-bg text-foreground"
                      : "bg-surface text-foreground"
                  }`}
                >
                  <p className="text-xs uppercase tracking-wide text-muted">
                    {message.role === "assistant" ? "AI" : "Reviewer"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
                </div>
              ))
            )}
          </div>

          {submitError && stage !== "form" ? (
            <p className="text-sm text-red-600" role="alert">
              {submitError}
            </p>
          ) : null}
          {stage === "chat" ? (
            <div className="rounded border border-border bg-surface p-4">
              <Textarea
                label={`Your reply (${3 - followUpsUsed} follow-ups left)`}
                rows={3}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => sendReply(false)} disabled={isSending}>
                  Send reply
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => sendReply(true)}
                  disabled={isSending}
                >
                  Skip
                </Button>
              </div>
            </div>
          ) : null}

          {stage === "completed" ? (
            <div className="space-y-3">
              <div className="rounded border border-border bg-info-bg px-4 py-3 text-sm text-foreground">
                Thanks — your review has been submitted and is now locked.
              </div>

              <Collapsible title="See JSON (stored artifacts)">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={loadArtifacts}
                    disabled={isLoadingArtifacts}
                  >
                    {isLoadingArtifacts ? "Loading…" : "Load / refresh JSON"}
                  </Button>
                  {artifactsError ? (
                    <p className="text-xs text-muted">{artifactsError}</p>
                  ) : null}
                </div>
                {artifacts ? (
                  <pre className="mt-3 max-h-[420px] overflow-auto rounded border border-border bg-background p-3 text-xs">
                    {JSON.stringify(artifacts, null, 2)}
                  </pre>
                ) : (
                  <p className="mt-3 text-xs text-muted">
                    This shows the JSON persisted for observability (review transcript/state, structured
                    review JSON, and the latest combined summary if available).
                  </p>
                )}
              </Collapsible>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
