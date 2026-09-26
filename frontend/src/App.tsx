import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/pages/Login";
import { DashboardPage } from "@/pages/Dashboard";
import { AnalyticsPage } from "@/pages/Analytics";
import { StandardsLibraryPage } from "@/pages/StandardsLibrary";
import { RegulatoryUpdatesPage } from "@/pages/RegulatoryUpdates";
import { HelpPage } from "@/pages/Help";
import { NewAnalysisPage } from "@/pages/NewAnalysis";
import { ProcessingPage } from "@/pages/Processing";
import { OverviewPage } from "@/pages/Overview";
import { StandardsPage } from "@/pages/Standards";
import { RequirementsPage } from "@/pages/Requirements";
import { IssuesGapsPage } from "@/pages/IssuesGaps";
import { EvidencePage } from "@/pages/Evidence";
import { RecommendationsPage } from "@/pages/Recommendations";
import { ReportsPage } from "@/pages/Reports";
import { HistoryPage } from "@/pages/History";
import { KnowledgeGraphPage } from "@/pages/KnowledgeGraph";
import { StandardDetailPage } from "@/pages/StandardDetail";
import { AuditPage } from "@/pages/Audit";
import { RegulatoryPage } from "@/pages/Regulatory";
import { CopilotPage } from "@/pages/Copilot";
import { ReviewPage } from "@/pages/Review";
import { EvaluationPage } from "@/pages/Evaluation";
import { AdminPage } from "@/pages/Admin";
import { FeedbackPage } from "@/pages/Feedback";

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-muted">Loading…</div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

/** The landing screen depends on the role: Admins open the System Console and
 *  Reviewers open their Sign-Off Queue (neither has a case-origination landing);
 *  Officers get the case Dashboard. */
function HomeRoute() {
  const { user } = useAuth();
  if (user?.role === "ADMIN") return <Navigate to="/admin" replace />;
  if (user?.role === "REVIEWER") return <Navigate to="/history" replace />;
  return <DashboardPage />;
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
          <Route index element={<HomeRoute />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/standards" element={<StandardsLibraryPage />} />
          <Route path="/regulatory-updates" element={<RegulatoryUpdatesPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/analyses/new" element={<NewAnalysisPage />} />
          <Route path="/analyses/:id/processing" element={<ProcessingPage />} />
          <Route path="/analyses/:id" element={<OverviewPage />} />
          <Route path="/analyses/:id/standards" element={<StandardsPage />} />
          <Route path="/analyses/:id/requirements" element={<RequirementsPage />} />
          <Route path="/analyses/:id/issues" element={<IssuesGapsPage />} />
          <Route path="/analyses/:id/evidence" element={<EvidencePage />} />
          <Route path="/analyses/:id/recommendations" element={<RecommendationsPage />} />
          <Route path="/analyses/:id/reports" element={<ReportsPage />} />
          <Route path="/analyses/:id/graph" element={<KnowledgeGraphPage />} />
          <Route path="/standards/:id" element={<StandardDetailPage />} />
          <Route path="/analyses/:id/audit" element={<AuditPage />} />
          <Route path="/analyses/:id/regulatory" element={<RegulatoryPage />} />
          <Route path="/analyses/:id/copilot" element={<CopilotPage />} />
          <Route path="/analyses/:id/review" element={<ReviewPage />} />
          <Route path="/evaluation" element={<EvaluationPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
