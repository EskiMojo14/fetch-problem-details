import { afterAll, afterEach, beforeAll } from "vite-plus/test";

import { worker } from "../mocks/worker.ts";

beforeAll(() => worker.start({ onUnhandledRequest: "error" }));
afterEach(() => worker.resetHandlers());
afterAll(() => worker.stop());
