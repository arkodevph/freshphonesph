import CeoDashboardLayout from "./CeoDashboardLayout";

const ignore = () => {};

export default function CeoDashboardSkeleton({
  name = "there",
}: {
  name?: string;
}) {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Loading CEO overview
      </span>
      <div inert>
        <CeoDashboardLayout
          name={name}
          overview={{
            data: null,
            summary: null,
            error: null,
            summaryError: null,
            pending: true,
            months: 6,
            selectMonths: ignore,
            refresh: async () => {},
            refreshAll: ignore,
          }}
        />
      </div>
    </div>
  );
}
