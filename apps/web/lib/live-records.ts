import { API_URL } from "./backend";
import { PRESENTATION_MODE } from "./presentation";
import { ApiError, tsRequest } from "./ts-api";
import { membershipHeaders } from "./membership-selection";

const listeners = new Set<() => void>();

let source: EventSource | undefined;

let timer: ReturnType<typeof setTimeout> | undefined;

let failures = 0;

let generation = 0;

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function retry(minimumSeconds = 0) {
  if (!listeners.size) {
    return;
  }

  const currentGeneration = generation;

  const backoff = Math.min(60_000, 2000 * 2 ** Math.min(failures++, 5));

  timer = setTimeout(
    () => {
      timer = undefined;

      void tsRequest("/auth/me")
        .then(() => {
          if (listeners.size && generation === currentGeneration) {
            connect();
          }
        })
        .catch((error: unknown) => {
          if (generation !== currentGeneration) {
            return;
          }

          if (error instanceof ApiError && error.status === 401) {
            return;
          }

          retry(
            error instanceof ApiError ? error.retryAfterSeconds : undefined,
          );
        });
    },
    Math.max(minimumSeconds * 1000, backoff) + Math.random() * 1000,
  );
}

function connect() {
  const membership = membershipHeaders("/events")["X-Membership-Id"];

  const connection = new EventSource(
    `${API_URL}/api/events${membership ? `?membership=${encodeURIComponent(membership)}` : ""}`,
    {
      withCredentials: true,
    },
  );

  source = connection;

  connection.addEventListener("ready", () => {
    if (source !== connection) {
      return;
    }

    failures = 0;

    notify();
  });

  connection.addEventListener("change", () => {
    if (source === connection) {
      notify();
    }
  });

  connection.onerror = () => {
    if (source !== connection) {
      return;
    }

    connection.close();

    source = undefined;

    retry();
  };
}

/** Share the browser connection; each consumer still reloads its authorized snapshot. */
export function subscribeLiveRecords(listener: () => void) {
  if (PRESENTATION_MODE) {
    return () => {};
  }

  listeners.add(listener);

  if (listeners.size === 1) {
    generation++;

    failures = 0;

    window.addEventListener("focus", notify);

    connect();
  }

  return () => {
    listeners.delete(listener);

    if (!listeners.size) {
      generation++;

      source?.close();

      source = undefined;

      clearTimeout(timer);

      timer = undefined;

      window.removeEventListener("focus", notify);
    }
  };
}
