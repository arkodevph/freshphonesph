export type AnswerBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; headings: string[]; rows: string[][] };

/** A deliberately small display grammar. HTML and links remain ordinary text. */
export function answerBlocks(paragraphs: string[]): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];

  const lines = paragraphs.join("\n\n").split("\n");

  const cells = (line: string) => {
    return line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => {
        return cell.trim();
      });
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();

    if (!line) {
      continue;
    }

    if (
      line.includes("|") &&
      /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] ?? "") &&
      cells(lines[index + 1]).every((cell) => {
        return /^:?-{3,}:?$/.test(cell);
      })
    ) {
      const headings = cells(line);

      const rows: string[][] = [];

      index += 2;

      while (
        index < lines.length &&
        lines[index].includes("|") &&
        lines[index].trim()
      ) {
        rows.push(cells(lines[index]));

        index++;
      }

      index--;

      blocks.push({ type: "table", headings, rows });

      continue;
    }

    const match = /^(?:[-*•]\s+|\d+[.)]\s+)(.+)$/.exec(line);

    if (match) {
      const ordered = /^\d/.test(line);

      const previous = blocks.at(-1);

      if (previous?.type === "list" && previous.ordered === ordered) {
        previous.items.push(match[1]);
      } else {
        blocks.push({ type: "list", ordered, items: [match[1]] });
      }

      continue;
    }

    const text = line.replace(/^#{1,4}\s+/, "");

    const previous = blocks.at(-1);

    if (
      previous?.type === "paragraph" &&
      index > 0 &&
      lines[index - 1].trim()
    ) {
      previous.text += `\n${text}`;
    } else {
      blocks.push({ type: "paragraph", text });
    }
  }

  return blocks;
}

export function answerInline(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((part) => {
      return part.startsWith("**")
        ? { type: "strong" as const, text: part.slice(2, -2) }
        : part.startsWith("`")
          ? { type: "code" as const, text: part.slice(1, -1) }
          : { type: "text" as const, text: part };
    });
}
