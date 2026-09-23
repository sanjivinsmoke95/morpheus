import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export interface DocumentRead {
  id: string;
  filename: string;
  mime_type: string;
  byte_size: number;
  page_count: number;
  is_scanned: boolean;
}

export interface Analysis {
  id: string;
  document_id: string;
  title: string;
  sector: string;
  status: string;
  workflow_status?: string;
  stage_error: string | null;
  created_at: string;
}

export interface ReqAttribute {
  id: string;
  key: string;
  raw_value: string;
  normalized_value: number | null;
  unit: string;
  canonical_unit: string;
  comparator: string;
  value_high: number | null;
}

export interface Requirement {
  id: string;
  req_code: string;
  requirement_type: string;
  description: string;
  source_page: number | null;
  source_section: string;
  confidence: string;
  extraction_method: string;
  is_edited: boolean;
  attributes: ReqAttribute[];
}

export interface Evidence {
  id: string;
  source_type: string;
  source_name: string;
  source_url: string;
  page: number | null;
  section: string;
  text: string;
  data_origin: string;
  retrieved_at: string;
}

export interface Recommendation {
  id: string;
  requirement_id: string;
  standard: { id: string; is_number: string; title: string; sector: string; status: string; data_origin: string };
  applicability_class: string;
  relevance: string;
  relevance_score: number;
  retrieval_method: string;
  signals: Record<string, number>;
  rationale: string;
  confidence: string;
  final_rank: number;
  is_primary: boolean;
  review_status: string;
  excluded: boolean;
  exclusion_reason: string;
  evidence: Evidence[];
}

export interface Decision {
  id: string;
  target_type: string;
  target_id: string;
  decision: string;
  reason: string;
  created_at: string;
}

// ---- documents + analyses ----
export function useCreateAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, sector, title }: { file: File; sector: string; title: string }) => {
      const fd = new FormData();
      fd.append("file", file);
      const doc = (await api.post<DocumentRead>("/documents", fd)).data;
      const analysis = (await api.post<Analysis>("/analyses", { document_id: doc.id, sector, title })).data;
      return analysis;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analyses"] }),
  });
}

export function useAnalyses() {
  return useQuery<Analysis[]>({ queryKey: ["analyses"], queryFn: async () => (await api.get<Analysis[]>("/analyses")).data });
}

export function useAnalysis(id: string, poll = false) {
  return useQuery<Analysis>({
    queryKey: ["analysis", id],
    queryFn: async () => (await api.get<Analysis>(`/analyses/${id}`)).data,
    refetchInterval: poll ? 800 : false,
  });
}

// ---- requirements ----
export function useRequirements(analysisId: string) {
  return useQuery<Requirement[]>({
    queryKey: ["requirements", analysisId],
    queryFn: async () => (await api.get<Requirement[]>(`/analyses/${analysisId}/requirements`)).data,
  });
}

export function useEditRequirement(analysisId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, description, requirement_type }: { id: string; description?: string; requirement_type?: string }) =>
      (await api.patch<Requirement>(`/requirements/${id}`,
        { ...(description != null ? { description } : {}), ...(requirement_type != null ? { requirement_type } : {}) })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requirements", analysisId] });
      qc.invalidateQueries({ queryKey: ["recommendations", analysisId] });
    },
  });
}

// ---- recommendations ----
export function useRecommendations(analysisId: string, includeExcluded = false) {
  return useQuery<Recommendation[]>({
    queryKey: ["recommendations", analysisId, includeExcluded],
    queryFn: async () =>
      (await api.get<Recommendation[]>(`/analyses/${analysisId}/recommendations`,
        { params: { include_excluded: includeExcluded } })).data,
  });
}

export function useAddStandard(analysisId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { requirement_id: string; is_number: string; reason?: string }) =>
      (await api.post(`/analyses/${analysisId}/reviews/add-standard`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recommendations", analysisId] });
      qc.invalidateQueries({ queryKey: ["decisions", analysisId] });
    },
  });
}

// ---- reviews ----
export function useDecisions(analysisId: string) {
  return useQuery<Decision[]>({
    queryKey: ["decisions", analysisId],
    queryFn: async () => (await api.get<Decision[]>(`/analyses/${analysisId}/reviews/decisions`)).data,
  });
}

export function useDecide(analysisId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { target_type: string; target_id: string; decision: string; reason?: string }) =>
      (await api.post(`/analyses/${analysisId}/reviews/decisions`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decisions", analysisId] });
      qc.invalidateQueries({ queryKey: ["recommendations", analysisId] });
    },
  });
}

// ---- graph / standards / versions ----
export interface GraphNode {
  id: string;
  is_number: string;
  title: string;
  status: string;
  sector: string;
  data_origin: string;
  recommended?: boolean;
}
export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  relationship_type: string;
  relationship_confidence: string;
  source_name: string;
  data_origin: string;
  evidence_id: string | null;
}

export function useGraph(analysisId: string) {
  return useQuery<{ nodes: GraphNode[]; edges: GraphEdge[] }>({
    queryKey: ["graph", analysisId],
    queryFn: async () => (await api.get(`/analyses/${analysisId}/graph`)).data,
  });
}

export function useEdgeDetail() {
  return useMutation({
    mutationFn: async (edgeId: string) => (await api.get(`/graph/edges/${edgeId}`)).data,
  });
}

export interface StandardDetail {
  standard: GraphNode;
  scope: string;
  current_version: string;
  source_url: string;
  source_name: string;
  verification_status: string;
  versions: { version_label: string; is_current: boolean; notes: string; data_origin: string }[];
  amendments: { amendment_no: string; amendment_date: string | null; affected_clauses: string[]; summary: string; data_origin: string }[];
  relationships: { id: string; relationship_type: string; direction: string; target_is_number: string; target_title: string; confidence: string; data_origin: string }[];
}

export function useStandardDetail(id: string) {
  return useQuery<StandardDetail>({
    queryKey: ["standard", id],
    queryFn: async () => (await api.get<StandardDetail>(`/standards/${id}`)).data,
    enabled: !!id,
  });
}

export interface VersionFinding {
  referenced_text: string;
  is_number: string | null;
  referenced_version: string | null;
  current_version: string | null;
  discrepancy_type: string;
  confidence: string;
  note: string;
  evidence: { text: string; page: number | null; section: string };
}

export function useVersionFindings(analysisId: string) {
  return useQuery<VersionFinding[]>({
    queryKey: ["versions", analysisId],
    queryFn: async () => (await api.get<VersionFinding[]>(`/analyses/${analysisId}/versions`)).data,
  });
}

// ---- audit (Phase 4) ----
export interface Readiness {
  standards_identified: number;
  requirements_total: number;
  requirements_covered: number;
  requirements_partial: number;
  requirements_missing: number;
  conflicts: number;
  gaps: number;
  outdated_references: number;
  unresolved_references: number;
  pending_review_items: number;
}
export type CoverageLevel = "FULL" | "PARTIAL" | "MISSING";
export interface CoverageRow {
  id: string;
  requirement_code: string | null;
  requirement: string | null;
  standard: string | null;
  coverage: CoverageLevel;
  explanation: string;
  status: string;
}
export interface GapRow {
  id: string;
  gap_type: string;
  description: string;
  severity: string;
  is_mandatory_claim: boolean;
  related_standard: string | null;
  status: string;
  evidence: string | null;
}
export interface ConflictRow {
  id: string;
  conflict_type: string;
  parameter: string;
  value_a: string;
  unit_a: string;
  source_a: string;
  value_b: string;
  unit_b: string;
  source_b: string;
  severity: string;
  explanation: string;
  status: string;
}

export function useReadiness(analysisId: string) {
  return useQuery<Readiness>({
    queryKey: ["readiness", analysisId],
    queryFn: async () => (await api.get(`/analyses/${analysisId}/readiness`)).data,
  });
}
export function useCoverage(analysisId: string) {
  return useQuery<CoverageRow[]>({ queryKey: ["coverage", analysisId], queryFn: async () => (await api.get(`/analyses/${analysisId}/coverage`)).data });
}
export function useGaps(analysisId: string) {
  return useQuery<GapRow[]>({ queryKey: ["gaps", analysisId], queryFn: async () => (await api.get(`/analyses/${analysisId}/gaps`)).data });
}
export function useConflicts(analysisId: string) {
  return useQuery<ConflictRow[]>({ queryKey: ["conflicts", analysisId], queryFn: async () => (await api.get(`/analyses/${analysisId}/conflicts`)).data });
}

// ---- regulatory (Phase 5) ----
export function useQco(analysisId: string) {
  return useQuery<any[]>({ queryKey: ["qco", analysisId], queryFn: async () => (await api.get(`/analyses/${analysisId}/qco`)).data });
}
export function useCertification(analysisId: string) {
  return useQuery<any[]>({ queryKey: ["cert", analysisId], queryFn: async () => (await api.get(`/analyses/${analysisId}/certification`)).data });
}
export function useAmendmentImpact(analysisId: string) {
  return useQuery<any[]>({ queryKey: ["amendments", analysisId], queryFn: async () => (await api.get(`/analyses/${analysisId}/amendments`)).data });
}

// ---- advanced (Phase 6) ----
export function useCopilot(analysisId: string) {
  return useQuery<any[]>({ queryKey: ["copilot", analysisId], queryFn: async () => (await api.get(`/analyses/${analysisId}/copilot`)).data });
}
export function useHistoryCompare(analysisId: string) {
  return useQuery<any>({ queryKey: ["history-compare", analysisId], queryFn: async () => (await api.get(`/analyses/${analysisId}/history-compare`)).data });
}

// ---- admin ----
export function useIngestion() {
  return useQuery<Record<string, any>>({ queryKey: ["ingestion"], queryFn: async () => (await api.get(`/admin/ingestion`)).data });
}
export function useAdminHealth() {
  return useQuery<any>({ queryKey: ["admin-health"], queryFn: async () => (await api.get(`/admin/health`)).data });
}
export function useCreateStandard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => (await api.post(`/admin/standards`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingestion"] }),
  });
}
export function useImportStandards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return (await api.post(`/admin/standards/import`, fd)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingestion"] }),
  });
}
export function useFeedback() {
  return useQuery<any[]>({ queryKey: ["feedback"], queryFn: async () => (await api.get(`/feedback`)).data });
}

// ---- evaluation (Phase 7) ----
export function useEvaluation() {
  return useQuery<any>({ queryKey: ["evaluation"], queryFn: async () => (await api.get(`/evaluation`)).data });
}
export function useRunEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post(`/evaluation/run`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluation"] }),
  });
}

// ---- reports ----
export function useCreateReport() {
  return useMutation({
    mutationFn: async ({ analysisId, format }: { analysisId: string; format: "PDF" | "DOCX" }) =>
      (await api.post<{ id: string; format: string }>("/reports", { analysis_id: analysisId, format })).data,
  });
}

export async function downloadReport(reportId: string, format: string) {
  const res = await api.get(`/reports/${reportId}/download`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `morpheus-report.${format.toLowerCase()}`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- dashboard + analytics ----
export interface DashboardSummary {
  kpis: { active_tenders: number; compliance_rate: number; needs_action: number; avg_gaps: number };
  metrics: {
    tenders_analyzed: { value: number; delta: number | null };
    standards_mapped: { value: number; delta: number | null };
    issues_detected: { value: number; delta: number | null };
    pending_reviews: { value: number; delta: number | null };
  };
  coverage_bars: { label: string; pct: number }[];
  compliance_rate: number;
  recent: {
    id: string; title: string; filename: string; sector: string; status: string;
    workflow_status: string; created_at: string | null;
    verdict: string; tone: string; compliance_pct: number | null;
  }[];
}
export function useDashboard() {
  return useQuery<DashboardSummary>({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/dashboard/summary")).data,
  });
}

export interface AnalyticsSummary {
  kpis: { total_analyses: number; compliance_rate: number; avg_gaps: number; standards_catalogue: number };
  sector_breakdown: { sector: string; count: number; compliance_rate: number }[];
  gap_categories: { category: string; gap_count: number }[];
  top_standards: { is_number: string; title: string; citation_count: number }[];
  trend: { week: string; analyses_count: number; compliance_rate: number }[];
}
export function useAnalytics() {
  return useQuery<AnalyticsSummary>({
    queryKey: ["analytics"],
    queryFn: async () => (await api.get("/analytics/summary")).data,
  });
}

export interface RegulatoryUpdate {
  type: "AMENDMENT" | "QCO";
  is_number: string; title: string; headline: string; detail: string;
  date: string | null; affects_tenders: { id: string; title: string }[]; data_origin: string;
}
export function useRegulatoryUpdates() {
  return useQuery<RegulatoryUpdate[]>({
    queryKey: ["regulatory-updates"],
    queryFn: async () => (await api.get("/regulatory/updates")).data,
  });
}

export interface StandardSearchRow {
  id: string; is_number: string; title: string; sector: string; status: string; data_origin: string;
}
export function useStandardsSearch(q: string, sector?: string) {
  return useQuery<StandardSearchRow[]>({
    queryKey: ["standards-search", q, sector ?? ""],
    queryFn: async () =>
      (await api.get("/standards", { params: { q: q || undefined, sector: sector || undefined, limit: 100 } })).data,
  });
}

// ---- P2/P5/P6: coverage-by-category, issues, clauses, ask, notes, add-requirement ----
export interface CategoryCoverage { category: string; full: number; partial: number; missing: number; total: number; }
export function useCoverageByCategory(analysisId: string) {
  return useQuery<CategoryCoverage[]>({
    queryKey: ["coverage-by-category", analysisId],
    queryFn: async () => (await api.get(`/analyses/${analysisId}/coverage-by-category`)).data,
  });
}

export interface Issue {
  id: string; type: "CONFLICT" | "GAP" | "OUTDATED"; severity: string;
  title: string; description: string; standard_is_number: string | null; recommended_action: string;
}
export function useIssues(analysisId: string) {
  return useQuery<Issue[]>({
    queryKey: ["issues", analysisId],
    queryFn: async () => (await api.get(`/analyses/${analysisId}/issues`)).data,
  });
}

export interface ClausePage {
  page_number: number; text_excerpt: string;
  standards: { is_number: string; title: string; evidence_text: string; role: string; relevance: string }[];
}
export function useClauses(analysisId: string) {
  return useQuery<ClausePage[]>({
    queryKey: ["clauses", analysisId],
    queryFn: async () => (await api.get(`/analyses/${analysisId}/clauses`)).data,
  });
}

export interface AskAnswer { answer: string; abstained: boolean; citations: { is_number: string; text: string }[]; }
export function useAsk(analysisId: string) {
  return useMutation({
    mutationFn: async (question: string) =>
      (await api.post<AskAnswer>(`/analyses/${analysisId}/ask`, { question })).data,
  });
}

export interface RequirementNote { id: string; body: string; author: string | null; created_at: string | null; }
export function useNotes(requirementId: string, enabled = true) {
  return useQuery<RequirementNote[]>({
    queryKey: ["notes", requirementId],
    queryFn: async () => (await api.get(`/requirements/${requirementId}/notes`)).data,
    enabled,
  });
}
export function useAddNote(requirementId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => (await api.post(`/requirements/${requirementId}/notes`, { body })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes", requirementId] }),
  });
}
export function useAddRequirement(analysisId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { description: string; requirement_type: string }) =>
      (await api.post(`/analyses/${analysisId}/requirements`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requirements", analysisId] });
      qc.invalidateQueries({ queryKey: ["recommendations", analysisId] });
    },
  });
}

// ---- P7/P8: report summary, MII, workflow status ----
export interface ReportSummary {
  verdict: string; verdict_detail: string; compliance_pct: number; requirements_total: number;
  covered: number; partial: number; missing: number; conflicts: number; gaps: number;
  actions: string[]; appendix_count: number; mandatory_count: number;
  top_rows: { is_number: string; title: string; relevance: string; match_pct: number;
    applicability: string; mandatory: boolean; advice: string; is_demo: boolean }[];
}
export function useReportSummary(analysisId: string) {
  return useQuery<ReportSummary>({
    queryKey: ["report-summary", analysisId],
    queryFn: async () => (await api.get(`/analyses/${analysisId}/report-summary`)).data,
  });
}

export interface MiiCheck {
  available: boolean; status: string; has_preference_clause: boolean;
  has_local_content_declaration: boolean; foreign_brand_terms: string[];
  issues: { severity: string; text: string }[]; advisory: string;
}
export function useMii(analysisId: string) {
  return useQuery<MiiCheck>({
    queryKey: ["mii", analysisId],
    queryFn: async () => (await api.get(`/analyses/${analysisId}/mii`)).data,
  });
}

export function useSetWorkflowStatus(analysisId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (workflow_status: string) =>
      (await api.patch<Analysis>(`/analyses/${analysisId}/workflow-status`, { workflow_status })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analysis", analysisId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["analyses"] });
    },
  });
}
