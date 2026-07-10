import { setupWorker } from "msw/browser";

import mocks from "./index.ts";

export const worker = setupWorker(...mocks);
