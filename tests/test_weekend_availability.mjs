import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const availability = JSON.parse(await readFile(new URL("../data/weekend-availability.json", import.meta.url), "utf8"));
const beginner = JSON.parse(await readFile(new URL("../data/routes.json", import.meta.url), "utf8"));
const advanced = JSON.parse(await readFile(new URL("../data/advanced-routes.json", import.meta.url), "utf8"));

assert.equal(availability.schema_version, 1);
assert.equal(availability.kind, "nearest_weekend_availability");
assert.equal(availability.checked_at, "2026-11-05T11:45:25+08:00");
assert.equal(availability.complete, true);
assert.equal(availability.weekend.start, "2026-11-07");
assert.equal(availability.weekend.end, "2026-11-08");
assert.ok(availability.source_method.includes("youxiake-go"));

const beginnerIds = beginner.routes.map((route) => route.id);
const advancedIds = advanced.routes.map((route) => route.id);
const allIds = [...beginnerIds, ...advancedIds];
assert.equal(allIds.length, 37);
assert.deepEqual(Object.keys(availability.routes).sort(), [...allIds].sort(), "Availability must cover every route");

const isBookable = (entry) => entry.days.some((day) => day.status_code === 1 || day.status_code === 3);
let empty = 0;
for (const [id, entry] of Object.entries(availability.routes)) {
  assert.ok(Array.isArray(entry.days), `${id} days must be an array`);
  const seen = new Set();
  let previous = "";
  for (const day of entry.days) {
    assert.ok(day.date === "2026-11-07" || day.date === "2026-11-08", `${id} ${day.date}`);
    assert.ok(!seen.has(day.date), `${id} duplicate ${day.date}`);
    seen.add(day.date);
    assert.ok(day.date > previous, `${id} days must be sorted`);
    previous = day.date;
    assert.ok(day.weekday === "周六" || day.weekday === "周日");
    assert.ok([1, 2, 3].includes(day.status_code), `${id} status code`);
    assert.ok(day.status_label.length > 0);
    assert.ok(day.price_cny === null || (Number.isFinite(day.price_cny) && day.price_cny > 0));
    assert.equal(typeof day.remark, "string");
  }
  if (entry.days.length === 0) empty += 1;
}

const beginnerBookable = beginnerIds.filter((id) => isBookable(availability.routes[id]));
const advancedBookable = advancedIds.filter((id) => isBookable(availability.routes[id]));
assert.equal(beginnerBookable.length, 8, "8 beginner routes are bookable this weekend");
assert.equal(advancedBookable.length, 5, "5 advanced routes are bookable this weekend");
assert.equal(empty, 24, "24 routes have no departure this weekend");
assert.equal(beginnerBookable.length + advancedBookable.length, 13);
assert.deepEqual(advancedBookable.sort(), ["34921", "36930", "43845", "48168", "50935"].sort());

assert.equal(availability.routes["48168"].days.length, 2);
assert.equal(availability.routes["48168"].days[0].status_label, "确定成行");
assert.equal(availability.routes["48168"].days[1].status_label, "可报名");
assert.equal(availability.routes["56151"].days[0].status_code, 2);
assert.equal(availability.routes["56151"].days[0].status_label, "暂满");
assert.equal(availability.routes["56151"].days[1].status_label, "可报名");
assert.equal(availability.routes["49144"].days.length, 2);
assert.equal(availability.routes["18673"].days.length, 1);
assert.deepEqual(availability.routes["36819"].days, []);

console.log("PASS: weekend availability covers 37 routes, 8 beginner + 5 advanced bookable, manual snapshot semantics intact.");
