import { Suspense } from "react";
import TeamDashboard from "./TeamDashboard";

export default function TeamPage() {
  return <Suspense fallback={<p role="status">Loading account directory…</p>}><TeamDashboard /></Suspense>;
}
