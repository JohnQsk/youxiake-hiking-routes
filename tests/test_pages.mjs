import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const pages = { index: "index.html", beginner: "beginner.html", about: "about.html", advanced: "advanced.html" };
const html = {};
for (const [key, filename] of Object.entries(pages)) {
  html[key] = await readFile(new URL(filename, root), "utf8");
  assert.match(html[key], /<html lang="zh-CN">/);
  assert.match(html[key], /<title>[^<]+<\/title>/);
  assert.equal((html[key].match(/<h1[\s>]/g) || []).length, 1, `${filename} needs exactly one h1`);
  assert.equal((html[key].match(/aria-current="page"/g) || []).length, 1, `${filename} needs one current nav item`);
  assert.ok(
    html[key].includes("./beginner.html") && html[key].includes("./about.html") && html[key].includes("./advanced.html"),
    `${filename} needs links to all route pages`,
  );

  for (const match of html[key].matchAll(/(?:href|src)="\.\/([^"]*)"/g)) {
    const relative = match[1];
    if (relative) await access(fileURLToPath(new URL(relative, root)));
  }
}

for (const page of Object.values(html)) {
  assert.ok(page.includes("https://github.com/vanawaker/youxiake-go"), "Credit link must be visible on every page");
}
assert.ok(html.about.includes("致谢"));
assert.ok(html.about.includes("为什么做"));
assert.ok(html.index.includes("本周末，先看能不能报名。"));
assert.ok(html.index.includes('id="weekend-preview-content"'));
assert.ok(html.index.includes("./weekend.js"));
assert.ok(html.index.includes('href="./beginner.html"'));
assert.ok(html.index.includes('href="./advanced.html"'));
assert.ok(!html.index.includes('id="route-rows"'), "The homepage should link to the route pages, not duplicate their tables");
assert.ok(html.beginner.includes('data-routes="./data/routes.json"'));
assert.ok(html.beginner.includes('data-weekend="./data/weekend-availability.json"'));
assert.ok(html.beginner.includes('id="weekend-filter"'));
assert.ok(html.beginner.includes('id="weekend-note"'));
assert.ok(html.beginner.includes("本周末 11/07–08"));
assert.ok(html.beginner.includes("周六天气"));
assert.ok(html.beginner.includes("一日入门种子路线"));
assert.ok(html.beginner.includes('id="route-rows"'));
assert.ok(!html.beginner.includes("先看清路线"), "Beginner table page should not keep the oversized slogan");
assert.ok(html.advanced.includes('data-routes="./data/advanced-routes.json"'));
assert.ok(html.advanced.includes('data-weekend="./data/weekend-availability.json"'));
assert.ok(html.advanced.includes('id="weekend-filter"'));
assert.ok(html.advanced.includes('id="weekend-note"'));
assert.ok(html.advanced.includes("本周末 11/07–08"));
assert.ok(html.advanced.includes("周六天气"));
assert.ok(html.advanced.includes('id="route-rows"'));
assert.ok(html.advanced.includes("进阶线对照表"));
assert.ok(!html.advanced.includes("先把强度看清"), "Advanced table page should not keep the oversized slogan");
assert.ok(!html.advanced.includes("placeholder-inner"), "Advanced page must render verified routes, not a placeholder");

console.log("PASS: four pages, local links, current navigation, credit links, home weekend preview and both route filters.");
