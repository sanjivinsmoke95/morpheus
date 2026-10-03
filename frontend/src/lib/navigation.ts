import { queryClient } from "@/main";
import { api } from "@/lib/api";

/**
 * Prefetches all data endpoints for an analysis ID so that switching
 * between tabs (Overview, Requirements, Standards, Issues & Gaps, Evidence, Review, Report)
 * is instantaneous without any loading delay or skeleton flash.
 */
export function prefetchAnalysisBundle(id: string) {
  if (!id) return;

  // Analysis metadata
  queryClient.prefetchQuery({
    queryKey: ["analysis", id],
    queryFn: async () => (await api.get(`/analyses/${id}`)).data,
    staleTime: 5 * 60 * 1000,
  });

  // Readiness scorecard
  queryClient.prefetchQuery({
    queryKey: ["readiness", id],
    queryFn: async () => (await api.get(`/analyses/${id}/readiness`)).data,
    staleTime: 5 * 60 * 1000,
  });

  // Coverage breakdown
  queryClient.prefetchQuery({
    queryKey: ["coverage-by-category", id],
    queryFn: async () => (await api.get(`/analyses/${id}/coverage-by-category`)).data,
    staleTime: 5 * 60 * 1000,
  });

  // Extracted requirements
  queryClient.prefetchQuery({
    queryKey: ["requirements", id],
    queryFn: async () => (await api.get(`/analyses/${id}/requirements`)).data,
    staleTime: 5 * 60 * 1000,
  });

  // Recommendations & matched standards
  queryClient.prefetchQuery({
    queryKey: ["recommendations", id, false],
    queryFn: async () => (await api.get(`/analyses/${id}/recommendations`, { params: { include_excluded: false } })).data,
    staleTime: 5 * 60 * 1000,
  });

  // QCO mandatory status
  queryClient.prefetchQuery({
    queryKey: ["qco", id],
    queryFn: async () => (await api.get(`/analyses/${id}/qco`)).data,
    staleTime: 5 * 60 * 1000,
  });

  // Gaps & conflicts
  queryClient.prefetchQuery({
    queryKey: ["gaps", id],
    queryFn: async () => (await api.get(`/analyses/${id}/gaps`)).data,
    staleTime: 5 * 60 * 1000,
  });
  queryClient.prefetchQuery({
    queryKey: ["conflicts", id],
    queryFn: async () => (await api.get(`/analyses/${id}/conflicts`)).data,
    staleTime: 5 * 60 * 1000,
  });

  // Officer sign-off decisions
  queryClient.prefetchQuery({
    queryKey: ["decisions", id],
    queryFn: async () => (await api.get(`/analyses/${id}/reviews/decisions`)).data,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Prefetches primary views on hover for instant feel.
 */
export function prefetchRoute(route: string) {
  if (route === "/standards") {
    queryClient.prefetchQuery({
      queryKey: ["standards-search", "", ""],
      queryFn: async () => (await api.get("/standards", { params: { limit: 100 } })).data,
      staleTime: 5 * 60 * 1000,
    });
  } else if (route === "/history") {
    queryClient.prefetchQuery({
      queryKey: ["analyses", true],
      queryFn: async () => (await api.get("/analyses", { params: { mine: true } })).data,
      staleTime: 5 * 60 * 1000,
    });
  } else if (route === "/") {
    queryClient.prefetchQuery({
      queryKey: ["dashboard"],
      queryFn: async () => (await api.get("/dashboard")).data,
      staleTime: 5 * 60 * 1000,
    });
  }
}
