import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT || 5173);
const mime = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript",
  ".css": "text/css", ".geojson": "application/geo+json", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2"
};
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  const relative = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const target = path.resolve(root, "." + relative);
  if (!target.startsWith(root) || relative.split("/").some(part => part.startsWith("."))) {
    response.writeHead(404).end("Not found");
    return;
  }
  try {
    const body = await readFile(target);
    response.writeHead(200, { "Content-Type": mime[path.extname(target)] || "application/octet-stream", "Cache-Control": "no-cache" });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});
server.listen(port, "0.0.0.0", () => console.log(`Local: http://localhost:${port}/`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
