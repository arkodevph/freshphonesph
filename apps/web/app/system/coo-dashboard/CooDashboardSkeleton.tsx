import type { Me } from "@/lib/api";
import CooDashboardLayout from "@/app/system/_role-designs/coo/app/system/coo-dashboard/CooDashboardLayout";

export default function CooDashboardSkeleton({ me }: { me: Me }) {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Loading COO dashboard
      </span>
      <div inert>
        <CooDashboardLayout
          me={me}
          loading
          overview={{
            summary: null,
            error: null,
            pending: true,
            refresh: async () => {},
          }}
        />
      </div>
    </div>
  );
}
