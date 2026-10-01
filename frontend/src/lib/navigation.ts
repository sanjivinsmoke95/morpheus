import { flushSync } from "react-dom";
import { useNavigate as useRRNavigate, type NavigateOptions, type To } from "react-router-dom";
import { queryClient } from "@/main";
import { api } from "@/lib/api";

/**
 * Checks if the browser supports the native View Transitions API and if
 * the user has NOT requested reduced motion.
 */
export function isViewTransitionSupported(): boolean {
  return (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    typeof (document as { startViewTransition?: unknown }).startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Executes a state transition inside document.startViewTransition using flushSync
 * to synchronously update the DOM for silky smooth native cross-fades.
 */
export function startSmoothTransition(callback: () => void): void {
  if (isViewTransitionSupported()) {
    (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
      flushSync(callback);
    });
  } else {
    callback();
  }
}

/**
 * Hook providing a view-transition-wrapped navigate function.
 */
export function useSmoothNavigate() {
  const navigate = useRRNavigate();
  return (to: To, options?: NavigateOptions) => {
    startSmoothTransition(() => {
      navigate(to, options);
    });
  };
}

/**
 * Prefetches all primary data endpoints for an analysis ID so that clicking
 * between tabs (Overview, Requirements, Standards, Issues, Evidence, Review, Report)
 * loads instantly in 0ms with zero loading skeletons or layout shifts.
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
