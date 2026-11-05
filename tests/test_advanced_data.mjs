import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile(new URL("../data/advanced-routes.json", import.meta.url), "utf8"));
const beginner = JSON.parse(await readFile(new URL("../data/routes.json", import.meta.url), "utf8"));
const routes = data.routes;

assert.equal(data.schema_version, 1);
assert.equal(data.tier, "advanced");
assert.equal(data.checked_at, "2026-11-05");
assert.equal(routes.length, 16, "The advanced dataset must contain 16 routes");
assert.equal(new Set(routes.map((route) => route.id)).size, 16, "IDs must be unique");
assert.deepEqual(routes.map((route) => route.screenshot_order), Array.from({ length: 16 }, (_, i) => i + 1));

const beginnerIds = new Set(beginner.routes.map((route) => route.id));
for (const route of routes) {
  assert.ok(!beginnerIds.has(route.id), `${route.id} must not duplicate a beginner route`);
  assert.match(route.id, /^\d+$/);
  assert.ok(route.name && route.short_name && route.series);
  assert.equal(route.departure_city, "上海");
  assert.equal(route.days, 1);
  assert.equal(route.checked_at, "2026-11-05");
  assert.equal(route.source_url, `https://www.youxiake.com/lines.html?id=${route.id}`);
  assert.ok(route.source_excerpt.length > 0);
  assert.ok(route.drive_time.text);
  assert.ok(Number.isFinite(route.drive_time.min_minutes));
  assert.ok(Number.isFinite(route.drive_time.max_minutes));
  assert.ok(route.drive_time.min_minutes > 0);
  assert.ok(route.drive_time.max_minutes >= route.drive_time.min_minutes);
  assert.ok(Array.isArray(route.hiking_options) && route.hiking_options.length > 0);
  const optionKeys = new Set();
  for (const option of route.hiking_options) {
    assert.ok(option.key && option.label);
    assert.ok(!optionKeys.has(option.key), `Duplicate option ${option.key} in ${route.id}`);
    optionKeys.add(option.key);
    for (const field of ["distance_km", "ascent_m"]) {
      assert.ok(option[field] === null || (Number.isFinite(option[field]) && option[field] > 0), `${route.id} ${field}`);
    }
    assert.equal(typeof option.note, "string");
  }
}

const byId = Object.fromEntries(routes.map((route) => [route.id, route]));
assert.equal(byId["48168"].hiking_options[0].distance_km, 18);
assert.equal(byId["48168"].hiking_options[0].ascent_m, 700);
assert.equal(byId["30146"].hiking_options[0].distance_km, 20);
assert.equal(byId["30146"].hiking_options[0].ascent_m, 1100);
assert.equal(byId["20108"].hiking_options[0].distance_km, 6, "The official 5-6km range is recorded at its upper bound");
assert.equal(byId["47966"].hiking_options[0].ascent_m, 800, "The official 750-800m range is recorded at its upper bound");
assert.equal(byId["20343"].hiking_options[0].ascent_m, 950);

console.log("PASS: 16 advanced routes, unique IDs, official sources, ranges and null semantics.");
