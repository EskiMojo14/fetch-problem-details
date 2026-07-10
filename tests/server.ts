import { setupServer } from "msw/node";

import mocks from "./mocks/index.ts";

export const server = setupServer(...mocks);
