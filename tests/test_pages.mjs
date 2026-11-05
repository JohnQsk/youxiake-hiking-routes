import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const pages = { index: "index.html", about: "about.html", advanced: "advanced.html" };
const html = {};
for (const [key, filename] of Object.entries(pages)) {
  html[key] = await readFile(new URL(filename, root), "utf8");
  assert.match(html[key], /<html lang="zh-CN">/);
  assert.match(html[key], /<title>[^<]+<\/title>/);
  assert.equal((html[key].match(/aria-current="page"/g) || []).length, 1, `${filename} needs one current nav item`);
  assert.ok(html[key].includes("./about.html") && html[key].includes("./advanced.html"));

  for (const match of html[key].matchAll(/(?:href|src)="\.\/([^"]*)"/g)) {
    const relative = match[1];
    if (relative) await access(fileURLToPath(new URL(relative, root)));
  }
}

for (const page of Object.values(html)) {
  assert.ok(page.includes("https://github.com/vanawaker/youxiake-go"), "Credit link must be visible on every page");
}
assert.ok(html.about.includes("吃水不忘挖井人"));
assert.ok(html.about.includes("为什么做"));
assert.ok(html.advanced.includes("INTENTIONALLY EMPTY"));
assert.ok(!html.advanced.includes("<table"), "Advanced placeholder must not invent a route table");
assert.ok(html.index.includes("一日入门种子路线"));

console.log("PASS: all pages, local links, current navigation, credit links and intentional advanced placeholder.");
