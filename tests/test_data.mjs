import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile(new URL("../data/routes.json", import.meta.url), "utf8"));
const routes = data.routes;

assert.equal(data.schema_version, 1);
assert.equal(data.checked_at, "2026-11-05");
assert.equal(routes.length, 21, "The seed dataset must contain 21 routes");
assert.equal(new Set(routes.map((route) => route.id)).size, 21, "IDs must be unique");
assert.deepEqual(routes.map((route) => route.screenshot_order), Array.from({ length: 21 }, (_, i) => i + 1));

for (const route of routes) {
  assert.match(route.id, /^\d+$/);
  assert.ok(route.name && route.short_name);
  assert.equal(route.departure_city, "上海");
  assert.equal(route.days, 1);
  assert.equal(route.checked_at, "2026-11-05");
  assert.equal(route.source_url, `https://www.youxiake.com/lines.html?id=${route.id}`);
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

assert.equal(routes.find((route) => route.id === "55996").hiking_options.length, 2, "Seasonal options must survive");
assert.equal(routes.find((route) => route.id === "18673").hiking_options[0].distance_km, null, "Unknown distance is not zero");
assert.equal(routes.find((route) => route.id === "49144").hiking_options[0].ascent_m, null, "Unknown ascent is not zero");

console.log(`PASS: ${routes.length} routes, unique IDs, valid sources, numeric ranges, variants and null semantics.`);
