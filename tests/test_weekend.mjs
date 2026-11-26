import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const preview = JSON.parse(await readFile(new URL("../data/weekend-preview.json", import.meta.url), "utf8"));
assert.equal(preview.schema_version, 1);
assert.equal(preview.kind, "nearest_weekend_manual_snapshot");
assert.equal(preview.route_id, "56151");
assert.equal(preview.complete, true);
assert.ok(preview.fetched_at && preview.source_url && preview.source_method);
assert.equal(preview.days.length, 2);

const STATUS_BY_CODE = { 1: "available", 2: "full", 3: "confirmed", 4: "unknown" };
const dates = preview.days.map((day) => day.date);
assert.notEqual(dates[0], dates[1], "days must be two distinct dates");
assert.ok(dates[0] < dates[1], "days must be sorted");
assert.deepEqual(preview.days.map((day) => day.weekday), ["周六", "周日"]);

for (const day of preview.days) {
  assert.ok(Number.isFinite(day.price_cny) && day.price_cny > 0);
  assert.equal(day.participant_count, null, "No historical total may masquerade as live batch participation");
  assert.equal(day.status, STATUS_BY_CODE[day.status_code], `status must match code ${day.status_code}`);
  const bookable = day.status === "available" || day.status === "confirmed";
  if (bookable) {
    assert.ok(day.weather, "bookable day must carry weather");
    assert.equal(day.weather.provider, "Open-Meteo");
    assert.ok(day.weather.location.includes("非景区入口"));
    assert.ok(day.weather.source_url.startsWith("https://api.open-meteo.com/"));
    assert.ok(Number.isFinite(day.weather.weather_code));
  } else {
    assert.equal(day.weather, null, "non-bookable day must not carry weather");
    assert.ok(day.weather_note, "non-bookable day must explain missing weather");
  }
}

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
assert.ok(index.includes("weekend-preview-content"));
assert.ok(index.includes("./weekend.js"));
assert.ok(index.includes("天气只查询可报名或确定成行的日期"));

console.log("PASS: one-route weekend snapshot, status/weather semantics and unknown live participation.");
