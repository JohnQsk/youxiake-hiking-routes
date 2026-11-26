import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const availability = JSON.parse(await readFile(new URL("../data/weekend-availability.json", import.meta.url), "utf8"));
const beginner = JSON.parse(await readFile(new URL("../data/routes.json", import.meta.url), "utf8"));
const advanced = JSON.parse(await readFile(new URL("../data/advanced-routes.json", import.meta.url), "utf8"));

assert.equal(availability.schema_version, 1);
assert.equal(availability.kind, "nearest_weekend_availability");
assert.match(availability.checked_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
assert.equal(availability.complete, true);
assert.ok(availability.source_method.includes("youxiake-go"));

// Weekend window must be a real Saturday/Sunday pair, consistent with itself.
const start = new Date(`${availability.weekend.start}T12:00:00+08:00`);
const end = new Date(`${availability.weekend.end}T12:00:00+08:00`);
assert.equal(start.getDay(), 6, "weekend.start must be a Saturday");
assert.equal(end.getDay(), 0, "weekend.end must be a Sunday");
assert.equal(end - start, 24 * 3600 * 1000, "weekend must be one Saturday-Sunday pair");
assert.ok(end > new Date(`${availability.checked_at.slice(0, 10)}T00:00:00+08:00`), "snapshot must target a future weekend");

const beginnerIds = beginner.routes.map((route) => route.id);
const advancedIds = advanced.routes.map((route) => route.id);
const allIds = [...beginnerIds, ...advancedIds];
assert.equal(allIds.length, 37);
assert.deepEqual(Object.keys(availability.routes).sort(), [...allIds].sort(), "Availability must cover every route");

const LABELS = { 1: "可报名", 2: "暂满", 3: "确定成行", 4: "待确认" };
const isBookable = (entry) => entry.days.some((day) => day.status_code === 1 || day.status_code === 3);
let empty = 0;
for (const [id, entry] of Object.entries(availability.routes)) {
  assert.ok(Array.isArray(entry.days), `${id} days must be an array`);
  const seen = new Set();
  let previous = "";
  for (const day of entry.days) {
    assert.ok(day.date === availability.weekend.start || day.date === availability.weekend.end, `${id} ${day.date}`);
    assert.ok(!seen.has(day.date), `${id} duplicate ${day.date}`);
    seen.add(day.date);
    assert.ok(day.date > previous, `${id} days must be sorted`);
    previous = day.date;
    assert.ok(day.weekday === "周六" || day.weekday === "周日");
    assert.ok([1, 2, 3, 4].includes(day.status_code), `${id} status code ${day.status_code}`);
    assert.equal(day.status_label, LABELS[day.status_code], `${id} label for status ${day.status_code}`);
    assert.ok(day.price_cny === null || (Number.isFinite(day.price_cny) && day.price_cny > 0));
    assert.equal(typeof day.remark, "string");
  }
  if (entry.days.length === 0) empty += 1;
}

const beginnerBookable = beginnerIds.filter((id) => isBookable(availability.routes[id]));
const advancedBookable = advancedIds.filter((id) => isBookable(availability.routes[id]));
assert.ok(beginnerBookable.length + advancedBookable.length > 0, "at least one route should be bookable");

console.log(
  `PASS: weekend ${availability.weekend.start}/${availability.weekend.end} covers 37 routes; ` +
    `${beginnerBookable.length} beginner + ${advancedBookable.length} advanced bookable, ${empty} without departures.`,
);
