import { Card, EmptyState, PageHeader, Skeleton, StatusChip } from "@/components/ui";
import { useFeedback } from "@/lib/morpheus";

export function FeedbackPage() {
  const { data, isLoading, isError } = useFeedback();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Feedback"
        subtitle="Officer decisions captured for review. Data only — no automatic retraining."
      />

      {isLoading ? (
        <Skeleton className="h-24" />
      ) : isError ? (
        <p className="text-sm text-danger">Feedback is visible to administrators.</p>
      ) : !data?.length ? (
        <EmptyState>No feedback captured yet.</EmptyState>
      ) : (
        <Card>
          {data.map((f) => (
            <div key={f.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 text-sm last:border-b-0">
              <StatusChip tone={f.decision === "ACCEPT" ? "success" : "danger"}>{f.decision}</StatusChip>
              <span className="min-w-0 flex-1 truncate text-muted">{f.reason || "—"}</span>
              <span className="font-tech text-[11px] text-muted">{new Date(f.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
