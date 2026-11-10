import { mkdir, writeFile } from "node:fs/promises";

const directory = new URL("../../apps/web/public/brand/v2/", import.meta.url);

await mkdir(directory, { recursive: true });

for (const shape of ["oval", "corner"]) {
  const width = shape === "oval" ? 640 : 320;

  const height = shape === "oval" ? 400 : 192;

  const circles = [];

  for (let y = 8; y < height; y += 16) {
    for (let x = 8; x < width; x += 16) {
      const tone =
        shape === "oval"
          ? Math.max(0, 1 - ((x - 320) / 306) ** 2 - ((y - 200) / 186) ** 2)
          : Math.max(0, (x / width + y / height - 0.55) / 1.45);

      const radius = 7.4 * tone ** 1.4;

      if (radius >= 0.1) {
        circles.push(`<circle cx="${x}" cy="${y}" r="${radius.toFixed(2)}"/>`);
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><g fill="#000">${circles.join("")}</g></svg>\n`;

  await writeFile(new URL(`hero-halftone-${shape}.svg`, directory), svg);
}

console.log("Generated hero-only oval and corner halftones.");
