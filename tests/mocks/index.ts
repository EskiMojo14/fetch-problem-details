import { http, HttpResponse } from "msw";

export default [
  http.get("https://example.com/test", () => HttpResponse.json({ message: "Hello, world!" })),
];
