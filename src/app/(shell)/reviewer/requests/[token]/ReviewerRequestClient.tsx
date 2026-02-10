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
  const [stage, setStage] = useState(
    status === "SUBMITTED" ? "completed" : initialMessages.length > 0 ? "chat" : "form",
  );
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isSending, setIsSending] = useState(false);
  const [followUpsUsed, setFollowUpsUsed] = useState(
    initialMessages.filter((message) => message.role === "assistant").length,
  );

  const [startDoing, setStartDoing] = useState("");
  const [stopDoing, setStopDoing] = useState("");
  const [continueDoing, setContinueDoing] = useState("");
  const [anythingElse, setAnythingElse] = useState("");
  const [reply, setReply] = useState("");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastCompletedOutput, setLastCompletedOutput] = useState<{
    messages: ChatMessage[];
    status: string;
    followUpsUsed: number;
  } | null>(
    status === "SUBMITTED"
      ? {
          messages: initialMessages,
          status: "complete",
          followUpsUsed: initialMessages.filter((m) => m.role === "assistant").length,
        }
      : null
  );
  const [artifacts, setArtifacts] = useState<unknown>(null);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);
  const chatEnabled = stage !== "form";

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
      if (data.status === "complete") {
        setLastCompletedOutput({ messages: nextMessages, status: data.status, followUpsUsed: data.followUpsUsed ?? 0 });
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const sendReply = async (skip = false) => {
    if (isSending) return;
    if (!skip && reply.trim().length === 0) return;
    
    // Optimistic update: add user's message immediately
    const userMessage: ChatMessage = { role: "reviewer", content: skip ? "(skipped)" : reply };
    setMessages((prev) => [...prev, userMessage]);
    setReply("");
    setIsSending(true);
    setSubmitError(null);
    
    try {
      const response = await fetch(`/api/reviewer/requests/${token}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: skip ? "" : reply, skip }),
      });
      const data = await response.json();
      if (!response.ok) {
        // Remove optimistic message on error
        setMessages((prev) => prev.slice(0, -1));
        setReply(skip ? "" : reply);
        setSubmitError(data?.error ?? "Something went wrong. Please try again.");
        setIsSending(false);
        return;
      }
      const nextMessages = (data.messages ?? []) as ChatMessage[];
      setMessages(nextMessages);
      const newFollowUpsUsed = data.followUpsUsed ?? followUpsUsed;
      setFollowUpsUsed(newFollowUpsUsed);
      
      // CRITICAL: Reset isSending BEFORE checking completion status
      setIsSending(false);
      
      // Immediately transition to completed state
      if (data.status === "complete") {
        setStage("completed");
        setLastCompletedOutput({ messages: nextMessages, status: data.status, followUpsUsed: newFollowUpsUsed });
      }
    } catch (err) {
      // Remove optimistic message on error
      setMessages((prev) => prev.slice(0, -1));
      setReply(skip ? "" : reply);
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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

  const stripTags = (content: string) =>
    content.replace(/\[(FOLLOWUP_1|FOLLOWUP_2|FINAL_PROMPT)\]\s*/g, "");

  const [showJson, setShowJson] = useState(false);

  if (stage === "completed") {
    return (
      <div className="flex min-h-[60vh] flex-col rounded border border-border bg-background">
        <div className="border-b border-border px-4 py-3 text-sm text-muted">
          Reviewing {employeeName} · Reviewer: {reviewerName}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <p className="text-lg text-foreground">Thanks for your review.</p>
        </div>
        <div className="flex justify-end border-t border-border px-4 py-3">
          <Button variant="secondary" onClick={() => setShowJson(!showJson)}>
            See JSON
          </Button>
        </div>
        {showJson ? (
          <div className="border-t border-border px-4 py-4">
            <Collapsible title="Submission & artifacts" defaultOpen>
              {lastCompletedOutput ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-foreground">
                    Your submission (transcript and metadata)
                  </p>
                  <pre className="max-h-[320px] overflow-auto rounded border border-border bg-background p-3 text-xs">
                    {JSON.stringify(lastCompletedOutput, null, 2)}
                  </pre>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={loadArtifacts}
                  disabled={isLoadingArtifacts}
                >
                  {isLoadingArtifacts ? "Loading…" : "Load stored artifacts from server"}
                </Button>
                {artifactsError ? (
                  <p className="text-xs text-muted">{artifactsError}</p>
                ) : null}
              </div>
              {artifacts ? (
                <>
                  <p className="mt-3 text-xs font-semibold text-foreground">
                    Stored artifacts (review state, structured review, combined summary)
                  </p>
                  <pre className="mt-1 max-h-[320px] overflow-auto rounded border border-border bg-background p-3 text-xs">
                    {JSON.stringify(artifacts, null, 2)}
                  </pre>
                </>
              ) : lastCompletedOutput ? null : (
                <p className="mt-3 text-xs text-muted">
                  Click the button above to load JSON from the server (when Blob storage is configured).
                </p>
              )}
            </Collapsible>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* 1. Header (Fixed height at top) */}
      <div className="flex-none border-b border-border bg-background px-4 py-3 text-sm text-muted">
        Reviewing {employeeName} · Reviewer: {reviewerName}
      </div>

      {/* 2. Middle Content (Fills remaining space, Scrollable) */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-background p-4">
        {stage === "form" ? (
          <div className="mb-6 rounded border border-border bg-surface p-4">
            <div className="grid grid-cols-2 gap-4">
              <Textarea
                label="Start doing"
                placeholder={`What could ${employeeName} start doing that they're not doing yet? New behaviours or changes that would help — with examples if you can.`}
                rows={2}
                value={startDoing}
                onChange={(event) => setStartDoing(event.target.value)}
              />
              <Textarea
                label="Stop doing"
                placeholder={`What should ${employeeName} stop doing? Behaviours or habits that get in the way — with examples if you can.`}
                rows={2}
                value={stopDoing}
                onChange={(event) => setStopDoing(event.target.value)}
              />
              <Textarea
                label="Continue doing"
                placeholder={`What should ${employeeName} continue doing? Things that already work well — with concrete examples.`}
                rows={2}
                value={continueDoing}
                onChange={(event) => setContinueDoing(event.target.value)}
              />
              <Textarea
                label="Anything else"
                placeholder="Anything else you'd like to add?"
                rows={2}
                value={anythingElse}
                onChange={(event) => setAnythingElse(event.target.value)}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={submitInitialForm} disabled={!canSubmitForm || isSending}>
                {isSending ? "Sending…" : "Send feedback"}
              </Button>
              {submitError ? (
                <p className="text-sm text-red-600" role="alert">
                  {submitError}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {messages.length > 0 &&
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                      message.role === "assistant"
                        ? "bg-surface text-foreground"
                        : "bg-accent text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{stripTags(message.content)}</p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 3. Footer / Chat Entry (Fixed height at bottom) */}
      <div className="flex-none border-t border-border bg-background px-4 py-3 shadow-lg">
        {submitError && stage !== "form" ? (
          <p className="mb-2 text-sm text-red-600" role="alert">
            {submitError}
          </p>
        ) : null}
        <Textarea
          label="Your reply"
          rows={2}
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          disabled={!chatEnabled || isSending}
          placeholder="Type your reply here…"
          className={!chatEnabled || isSending ? "opacity-50" : ""}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => sendReply(false)} disabled={!chatEnabled || isSending}>
            {isSending ? "Sending…" : "Send reply"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => sendReply(true)}
            disabled={!chatEnabled || isSending}
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
