import type { NetworkAgent, NetworkBatch } from "@freshphones/contracts";
import styles from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/network.module.css";

export function Readiness({
  agent,
}: {
  agent: Pick<NetworkAgent, "agentProfile">;
}) {
  return (
    <span
      className={styles.readiness}
      data-ready={agent.agentProfile?.active || undefined}
    >
      {!agent.agentProfile
        ? "Profile not linked"
        : agent.agentProfile.active
          ? "Profile active"
          : "Profile inactive"}
    </span>
  );
}

export default function NetworkDirectory({
  agents,
  batches,
  onAgent,
}: {
  agents: NetworkAgent[] | null;
  batches: NetworkBatch[] | null;
  onAgent: (id: string) => void;
}) {
  return (
    <div
      className={styles.tableWrap}
      role="region"
      aria-label={agents ? "Assigned Agent results" : "Assigned batch results"}
      tabIndex={0}
    >
      <table className={styles.table}>
        <caption className={styles.srOnly}>
          {agents
            ? "Assigned Agents and all-time enrollment request counts"
            : "Assigned batches and current member counts"}
        </caption>
        <thead>
          <tr>
            {agents ? (
              <>
                <th scope="col">Agent</th>
                <th scope="col">Profile</th>
                <th scope="col" data-numeric>
                  Pending
                </th>
                <th scope="col" data-numeric>
                  Approved
                </th>
                <th scope="col" data-numeric>
                  Rejected
                </th>
                <th scope="col">
                  <span className={styles.srOnly}>Agent details</span>
                </th>
              </>
            ) : (
              <>
                <th scope="col">Batch</th>
                <th scope="col">Model</th>
                <th scope="col">Status</th>
                <th scope="col" data-numeric>
                  Members
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {agents?.map((agent) => {
            return (
              <tr key={agent.id}>
                <th scope="row">
                  <strong>{agent.name}</strong>
                  <span className={styles.secondary}>
                    {agent.agentProfile?.code ?? "No linked code"}
                  </span>
                </th>
                <td data-label="Profile">
                  <Readiness agent={agent} />
                </td>
                <td data-label="Pending requests" data-numeric>
                  {agent.requests.pending.toLocaleString()}
                </td>
                <td data-label="Approved requests" data-numeric>
                  {agent.requests.approved.toLocaleString()}
                </td>
                <td data-label="Rejected requests" data-numeric>
                  {agent.requests.rejected.toLocaleString()}
                </td>
                <td data-label="Details">
                  <button
                    type="button"
                    className={styles.rowAction}
                    aria-label={`View ${agent.name}`}
                    onClick={() => {
                      return onAgent(agent.id);
                    }}
                  >
                    View Agent<span aria-hidden="true"> ↗</span>
                  </button>
                </td>
              </tr>
            );
          })}
          {batches?.map((batch) => {
            return (
              <tr key={batch.id}>
                <th scope="row">{batch.code}</th>
                <td data-label="Model">{batch.model}</td>
                <td data-label="Status">
                  {batch.status.charAt(0) + batch.status.slice(1).toLowerCase()}
                </td>
                <td data-label="Current members" data-numeric>
                  {batch.memberCount.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
