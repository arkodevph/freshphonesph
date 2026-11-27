import type { NetworkBatch } from "@freshphones/contracts";
import styles from "./agent-batches.module.css";

export default function AgentBatchTable({ items }: { items: NetworkBatch[] }) {
  return (
    <table className={styles.table} role="table">
      <caption className={styles.srOnly}>
        Your assigned batches and current membership counts
      </caption>
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader">
            Batch
          </th>
          <th scope="col" role="columnheader">
            Model
          </th>
          <th scope="col" role="columnheader">
            Status
          </th>
          <th scope="col" role="columnheader" className={styles.number}>
            Current memberships
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {items.map((batch) => {
          return (
            <tr key={batch.id} role="row">
              <th scope="row" role="rowheader">
                {batch.code}
              </th>
              <td role="cell" data-label="Model">
                {batch.model}
              </td>
              <td role="cell" data-label="Status">
                <span className={styles.status}>
                  {batch.status.toLowerCase().replaceAll("_", " ")}
                </span>
              </td>
              <td
                role="cell"
                data-label="Current memberships"
                className={styles.number}
              >
                {batch.memberCount.toLocaleString("en-PH")}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
