import { Suspense } from "react";
import SupportDashboard from "./SupportDashboard";

export default function SupportPage() {
  return <Suspense fallback={<p role="status">Loading Customer Service…</p>}><SupportDashboard /></Suspense>;
}
