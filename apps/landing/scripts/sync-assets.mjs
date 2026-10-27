import { cpSync } from "node:fs";

cpSync(
  new URL("../../web/public/", import.meta.url),
  new URL("../public/", import.meta.url),
  {
    recursive: true,
  },
);
