export type HandlerTableSort<Key extends string = string> = {
  key: Key;
  direction: "asc" | "desc";
};

export const newestHandlerSort = {
  key: "createdAt",
  direction: "desc",
} as const;

export function nextHandlerSort<Key extends string>(
  current: HandlerTableSort<Key>,
  key: Key,
): HandlerTableSort<Key> {
  return {
    key,
    direction:
      current.key === key && current.direction === "asc" ? "desc" : "asc",
  };
}
