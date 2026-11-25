import ClientsLoading from "@/app/system/_role-designs/coo/app/system/clients/ClientsLoading";
import { Suspense } from "react";
import ClientsDashboard from "@/app/system/_role-designs/coo/app/system/clients/ClientsDashboard";

export default function ClientsPage() {
  return (
    <Suspense fallback={<ClientsLoading />}>
      <ClientsDashboard />
    </Suspense>
  );
}
