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
    mutationFn: async ({ id, description }: { id: string; description: string }) =>
      (await api.patch<Requirement>(`/requirements/${id}`, { description })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requirements", analysisId] });
      qc.invalidateQueries({ queryKey: ["recommendations", analysisId] });
    },
  });
}

// ---- recommendations ----
export function useRecommendations(analysisId: string) {
  return useQuery<Recommendation[]>({
    queryKey: ["recommendations", analysisId],
    queryFn: async () => (await api.get<Recommendation[]>(`/analyses/${analysisId}/recommendations`)).data,
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
export function useReadiness(analysisId: string) {
  return useQuery<Record<string, number>>({
    queryKey: ["readiness", analysisId],
    queryFn: async () => (await api.get(`/analyses/${analysisId}/readiness`)).data,
  });
}
export function useCoverage(analysisId: string) {
  return useQuery<any[]>({ queryKey: ["coverage", analysisId], queryFn: async () => (await api.get(`/analyses/${analysisId}/coverage`)).data });
}
export function useGaps(analysisId: string) {
  return useQuery<any[]>({ queryKey: ["gaps", analysisId], queryFn: async () => (await api.get(`/analyses/${analysisId}/gaps`)).data });
}
export function useConflicts(analysisId: string) {
  return useQuery<any[]>({ queryKey: ["conflicts", analysisId], queryFn: async () => (await api.get(`/analyses/${analysisId}/conflicts`)).data });
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
