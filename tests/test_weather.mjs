import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const datasets = [
  ["beginner", JSON.parse(await readFile(new URL("../data/routes.json", import.meta.url), "utf8"))],
  ["advanced", JSON.parse(await readFile(new URL("../data/advanced-routes.json", import.meta.url), "utf8"))],
];

const availability = JSON.parse(await readFile(new URL("../data/weekend-availability.json", import.meta.url), "utf8"));

for (const [name, data] of datasets) {
  const weather = data.weather;
  assert.ok(weather, `${name} needs a weather block`);
  assert.equal(new Date(`${weather.date}T12:00:00+08:00`).getDay(), 6, `${name} weather date must be a Saturday`);
  assert.equal(weather.date, availability.weekend.start, `${name} weather date must match the current weekend snapshot`);
  assert.equal(weather.weekday, "周六");
  assert.equal(weather.source, "中国天气网");
  assert.ok(weather.note.includes("非徒步起点"), `${name} must state that the forecast is not trailhead-precise`);

  const routeIds = data.routes.map((route) => route.id);
  assert.deepEqual(Object.keys(weather.locations).sort(), [...routeIds].sort(), `${name} weather links must cover every route`);

  for (const [id, location] of Object.entries(weather.locations)) {
    assert.ok(location.name.length > 0, `${name} ${id} needs a location name`);
    assert.match(location.url, /^https:\/\/www\.weather\.com\.cn\/weather\/\d+\.shtml$/, `${name} ${id} url`);
  }
}

assert.equal(datasets[0][1].weather.locations["55996"].name, "新昌");
assert.equal(datasets[1][1].weather.locations["48168"].name, "海盐");
assert.equal(new Set(Object.values(datasets[0][1].weather.locations).map((item) => item.url)).size, 17);

console.log("PASS: both datasets map every route to a Saturday China Weather city forecast.");
