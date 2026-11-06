import { ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import {
  getCurrentUser,
  getDemoState,
  subscribeMockControl,
  subscribeMockEvents,
} from "./database";

// O MSW normaliza o caminho do Socket.IO; aceitamos os dois formatos.
const stream = ws.link(/^wss?:\/\/[^/]+\/(?:socket\.io\/?)?$/);

/** Handshake e mensagens do Socket.IO interceptados pelo MSW. */
export const socketHandlers = [
  stream.addEventListener("connection", (connection) => {
    const { client } = connection;
    const requestedUser = client.url.searchParams.get("userId");
    const userId = getCurrentUser()?.id ?? null;
    if (
      !getDemoState().connected ||
      (requestedUser !== "visitor" && requestedUser !== userId)
    ) {
      client.close(1012, "Simulated connection interruption");
      return;
    }
    const binding = toSocketIo(connection);
    const unsubscribeEvents = subscribeMockEvents((event) => {
      if (
        event.type === "order.updated" &&
        (event.userId !== userId || getCurrentUser()?.id !== userId)
      )
        return;
      binding.client.emit(event.type, event);
    });
    const unsubscribeControl = subscribeMockControl((action) => {
      if (action === "disconnect")
        client.close(1012, "Simulated connection interruption");
    });
    // O binding cuida do namespace; o ping continua no transporte Engine.IO.
    const heartbeat = setInterval(() => {
      client.send("2");
    }, 20_000);
    client.addEventListener("close", () => {
      clearInterval(heartbeat);
      unsubscribeEvents();
      unsubscribeControl();
    });
  }),
];
