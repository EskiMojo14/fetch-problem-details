import { setupServer } from "msw/node";

import mocks from "./index.ts";

export const server = setupServer(...mocks);
