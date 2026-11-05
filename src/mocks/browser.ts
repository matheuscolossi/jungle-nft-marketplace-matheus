import { setupWorker } from "msw/browser";
import { initializeDatabase } from "./database";
import { handlers } from "./handlers";
import { socketHandlers } from "./socket";

export const worker = setupWorker(...handlers, ...socketHandlers);
export async function startMocks() {
  await initializeDatabase();
  await worker.start({
    onUnhandledRequest: "bypass",
    serviceWorker: { url: "/mockServiceWorker.js" },
  });
}
