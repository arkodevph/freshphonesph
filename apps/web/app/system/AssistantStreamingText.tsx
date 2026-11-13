import { answerBlocks, answerInline } from "@/lib/assistant-answer";
import styles from "./ceo-assistant.module.css";

/** Only newly received words animate; existing text stays mounted and selectable. */
export function AssistantStreamingText({ text }: { text: string }) {
  return (
    <div className={styles.streamingText} data-streaming-text>
      {(text.match(/\S+\s*|\s+/g) ?? []).map((word, index) => {
        return (
          <span key={index} className={styles.streamWord}>
            {word}
          </span>
        );
      })}
    </div>
  );
}

function inline(text: string) {
  return answerInline(text).map((part, index) => {
    return part.type === "strong" ? (
      <strong key={index}>{part.text}</strong>
    ) : part.type === "code" ? (
      <code key={index}>{part.text}</code>
    ) : (
      <span key={index}>{part.text}</span>
    );
  });
}

export function AssistantAnswer({ paragraphs }: { paragraphs: string[] }) {
  return answerBlocks(paragraphs).map((block, index) => {
    if (block.type === "paragraph") {
      return <p key={index}>{inline(block.text)}</p>;
    }

    if (block.type === "list") {
      const List = block.ordered ? "ol" : "ul";

      return (
        <List key={index}>
          {block.items.map((item, row) => {
            return <li key={row}>{inline(item)}</li>;
          })}
        </List>
      );
    }

    return (
      <div
        className={styles.answerTable}
        key={index}
        tabIndex={0}
        role="region"
        aria-label="Answer table"
      >
        <table>
          <thead>
            <tr>
              {block.headings.map((cell, column) => {
                return (
                  <th key={column} scope="col">
                    {inline(cell)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => {
              return (
                <tr key={rowIndex}>
                  {block.headings.map((_, column) => {
                    return <td key={column}>{inline(row[column] ?? "")}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  });
}
