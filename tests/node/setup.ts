import { afterAll, afterEach, beforeAll } from "vite-plus/test";

import { server } from "../mocks/server.ts";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
