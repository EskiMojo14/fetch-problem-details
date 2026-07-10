import type { Check, SizeLimitConfig } from "size-limit";

import * as fpd from "./src";
import * as fpdStandard from "./src/standard";

const path = "dist/index.mjs";
const standardPath = "dist/standard.mjs";

const checks: Array<Check> = [
  {
    name: "Full bundle",
    path,
    import: "*",
  },
  ...Object.entries(fpd).map(([name]) => ({
    name,
    path,
    import: `{ ${name} }`,
  })),
  {
    name: "Standard bundle",
    path: standardPath,
    import: "*",
  },
  ...Object.entries(fpdStandard).map(([name]) => ({
    name: `standardSchema.${name}`,
    path: standardPath,
    import: `{ ${name} }`,
  })),
];

export default checks satisfies SizeLimitConfig;
