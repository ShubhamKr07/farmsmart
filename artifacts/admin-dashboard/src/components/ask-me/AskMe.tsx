import { useState } from "react";
import { Sparkles, Loader2, ExternalLink } from "lucide-react";
import { usePostRecommend } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

/**
 * Global "Ask Me" entry point — a free-text question box (distinct from the
 * existing ⌘K command palette, which navigates/acts rather than answers
 * questions). Available from any page via the TopBar. Submits to
 * POST /api/recommend, which grounds the answer in cached/live-searched
 * vertical-farming knowledge plus the farm's own operational data.
 */
export function AskMe() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(null);
  const recommend = usePostRecommend();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    setSubmittedQuestion(trimmed);
    recommend.mutate({ data: { question: trimmed } });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuestion("");
      setSubmittedQuestion(null);
      recommend.reset();
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden lg:inline-flex gap-2 h-9 px-2 text-muted-foreground"
        onClick={() => setOpen(true)}
        aria-label="Ask a vertical-farming question"
        data-testid="button-ask-me"
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-xs">Ask Me</span>
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Ask Me
            </SheetTitle>
            <SheetDescription>
              Ask anything about vertical farming — crop setpoints, troubleshooting, market data. Answers combine your
              own farm data with external knowledge.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
            <Input
              autoFocus
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. why are my basil trays failing?"
              data-testid="input-ask-me"
            />
            <Button type="submit" disabled={recommend.isPending || !question.trim()} data-testid="button-ask-me-submit">
              {recommend.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            {recommend.isPending && (
              <p className="text-sm text-muted-foreground">Thinking…</p>
            )}

            {recommend.isError && (
              <p className="text-sm text-destructive">
                Something went wrong. Try again in a moment.
              </p>
            )}

            {recommend.isSuccess && submittedQuestion && (
              <div className="space-y-4" data-testid="ask-me-answer">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Q: {submittedQuestion}</p>
                  <p className="text-sm whitespace-pre-wrap">{recommend.data.answer}</p>
                </div>

                {recommend.data.sources.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Sources</p>
                    {recommend.data.sources.map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-muted/50 transition-colors"
                      >
                        <span className="truncate">{s.title || s.url}</span>
                        <span className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
                          <Badge variant="secondary" className="text-[10px]">
                            {Math.round(s.similarity * 100)}%
                          </Badge>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </span>
                      </a>
                    ))}
                  </div>
                )}

                {recommend.data.cache_hit && (
                  <p className="text-[11px] text-muted-foreground">Answered from cached knowledge.</p>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
