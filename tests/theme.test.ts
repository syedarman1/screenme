import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import ThemeProvider from "../src/app/components/ThemeProvider";

test("page content renders before browser hydration or storage access", () => {
  const html = renderToString(React.createElement(ThemeProvider, { children: React.createElement("main", null, "Readable content before hydration") }));
  assert.match(html, /<main>Readable content before hydration<\/main>/);
});
