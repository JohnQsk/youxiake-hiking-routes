"use strict";

const previewRoot = document.querySelector("#weekend-preview-content");

function previewNode(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function shortDate(date) {
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function weatherBlock(weather) {
  const block = previewNode("div", "day-weather");
  block.append(
    previewNode("strong", "weather-title", `${weather.weather_label} · ${weather.temperature_min_c}–${weather.temperature_max_c}°C`),
    previewNode("span", "weather-rain", `降水 ${weather.precipitation_probability_max}% · ${weather.precipitation_sum_mm}mm`),
    previewNode("small", "weather-location", weather.location),
  );
  return block;
}

function dayCard(day) {
  const card = previewNode("article", `day-card status-${day.status}`);
  const heading = previewNode("div", "day-heading");
  const date = previewNode("div");
  date.append(previewNode("strong", "day-date", shortDate(day.date)), previewNode("span", "weekday", day.weekday));
  heading.append(date, previewNode("span", "status-pill", day.status_label));
  card.append(heading);
  card.append(previewNode("span", "day-price", `¥${day.price_cny}`));
  card.append(previewNode("small", "participant-count", "班期实时人数：未公开"));

  if (day.status === "available" || day.status === "confirmed") {
    card.append(day.weather
      ? weatherBlock(day.weather)
      : previewNode("p", "weather-pending", "天气尚未获取"));
  } else {
    card.append(previewNode("p", "weather-skipped", "暂满日期不查询天气"));
  }
  return card;
}

function renderPreview(data) {
  previewRoot.replaceChildren();
  const card = previewNode("article", "weekend-route-card");
  const header = previewNode("div", "weekend-route-header");
  const title = previewNode("div");
  title.append(
    previewNode("h3", "", data.route_name),
    previewNode("span", "snapshot-label", `单路线试验 · YXK ${data.route_id}`),
  );
  const official = previewNode("a", "source-link", "官方详情 ↗");
  official.href = data.source_url;
  official.target = "_blank";
  official.rel = "noopener noreferrer";
  header.append(title, official);
  card.append(header);

  const days = previewNode("div", "day-grid");
  for (const day of data.days) days.append(dayCard(day));
  card.append(days);

  const timestamp = data.fetched_at.slice(0, 16).replace("T", " ");
  card.append(previewNode("p", "snapshot-time", `手动快照 · 更新于 ${timestamp} · 不会自动刷新`));
  previewRoot.append(card);
}

async function loadPreview() {
  try {
    const response = await fetch("./data/weekend-preview.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    renderPreview(data);
  } catch (error) {
    previewRoot.replaceChildren(previewNode("p", "preview-error", `本周预览读取失败：${error.message}`));
  }
}

if (previewRoot) loadPreview();
