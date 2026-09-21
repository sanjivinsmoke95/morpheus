import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/pages/Login";
import { DashboardPage } from "@/pages/Dashboard";
import { NewAnalysisPage } from "@/pages/NewAnalysis";
import { ProcessingPage } from "@/pages/Processing";
import { RequirementsPage } from "@/pages/Requirements";
import { RecommendationsPage } from "@/pages/Recommendations";
import { ReportsPage } from "@/pages/Reports";
import { HistoryPage } from "@/pages/History";

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-zinc-400">Loading…</div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<DashboardPage />} />
          <Route path="/analyses/new" element={<NewAnalysisPage />} />
          <Route path="/analyses/:id/processing" element={<ProcessingPage />} />
          <Route path="/analyses/:id/requirements" element={<RequirementsPage />} />
          <Route path="/analyses/:id/recommendations" element={<RecommendationsPage />} />
          <Route path="/analyses/:id/reports" element={<ReportsPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
