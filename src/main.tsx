import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "./lib/query";
import { SessionProvider } from "./lib/session";
import "./styles.css";
import "./shell.css";
import "./market.css";
import "./checkout.css";
import "./account.css";

async function start() {
  const appReady = import("./App");
  const mocksReady =
    import.meta.env.VITE_ENABLE_MOCKS !== "false"
      ? import("./mocks/browser").then(({ startMocks }) => startMocks())
      : Promise.resolve();
  const [{ router }] = await Promise.all([appReady, mocksReady]);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
void start().catch((error) => {
  console.error(error);
  const root = document.getElementById("root")!;
  root.textContent =
    "Não foi possível iniciar a demonstração. Atualize a página e tente novamente.";
});
