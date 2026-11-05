import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const preview = JSON.parse(await readFile(new URL("../data/weekend-preview.json", import.meta.url), "utf8"));
assert.equal(preview.schema_version, 1);
assert.equal(preview.kind, "nearest_weekend_manual_snapshot");
assert.equal(preview.route_id, "56151");
assert.equal(preview.complete, true);
assert.ok(preview.fetched_at && preview.source_url && preview.source_method);
assert.equal(preview.days.length, 2);
assert.deepEqual(preview.days.map((day) => day.date), ["2026-11-07", "2026-11-08"]);

for (const day of preview.days) {
  assert.equal(day.price_cny, 185);
  assert.equal(day.participant_count, null, "No historical total may masquerade as live batch participation");
  const bookable = day.status === "available" || day.status === "confirmed";
  assert.equal(day.weather !== null, bookable, "Weather must only exist on bookable days");
  if (day.weather) {
    assert.equal(day.weather.provider, "Open-Meteo");
    assert.ok(day.weather.location.includes("非景区入口"));
    assert.ok(day.weather.source_url.startsWith("https://api.open-meteo.com/"));
  }
}
assert.equal(preview.days[0].status, "full");
assert.equal(preview.days[0].status_code, 2);
assert.equal(preview.days[0].weather_note, "暂满日期未查询天气");
assert.equal(preview.days[1].status, "available");
assert.equal(preview.days[1].weather.weather_code, 81);

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
assert.ok(index.includes("weekend-preview-content"));
assert.ok(index.includes("./weekend.js"));
assert.ok(index.includes("天气只查询可报名或确定成行的日期"));

console.log("PASS: one-route weekend snapshot, corrected full status, bookable-only weather and unknown live participation.");
