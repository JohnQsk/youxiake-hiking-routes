"use strict";

const routesUrl = document.body.dataset.routes || "./data/routes.json";
const weekendUrl = document.body.dataset.weekend || "";

const state = {
  routes: [],
  checkedAt: "",
  variants: new Map(),
  weekend: new Map(),
  weekendLoaded: false,
  weather: new Map(),
  weatherDate: "",
};

const ui = {
  rows: document.querySelector("#route-rows"),
  summary: document.querySelector("#result-summary"),
  total: document.querySelector("#route-total"),
  search: document.querySelector("#search"),
  sort: document.querySelector("#sort"),
  maxDrive: document.querySelector("#max-drive"),
  maxAscent: document.querySelector("#max-ascent"),
  weekendFilter: document.querySelector("#weekend-filter"),
  weekendNote: document.querySelector("#weekend-note"),
  reset: document.querySelector("#reset"),
  empty: document.querySelector("#empty-state"),
};

function selectedOption(route) {
  const selectedKey = state.variants.get(route.id);
  return route.hiking_options.find((option) => option.key === selectedKey)
    || route.hiking_options[0];
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatMetric(value, unit) {
  return value === null || value === undefined ? "未公开" : `${value} ${unit}`;
}

function compareNullable(a, b, direction = 1) {
  if (a === null || a === undefined) return (b === null || b === undefined) ? 0 : 1;
  if (b === null || b === undefined) return -1;
  return (a - b) * direction;
}

function sortValue(route, sort) {
  const option = selectedOption(route);
  if (sort.startsWith("drive")) return route.drive_time.min_minutes;
  if (sort.startsWith("distance")) return option.distance_km;
  if (sort.startsWith("ascent")) return option.ascent_m;
  return route.screenshot_order;
}

function visibleRoutes() {
  const query = ui.search.value.trim().toLocaleLowerCase("zh-CN");
  const maxDrive = ui.maxDrive.value ? Number(ui.maxDrive.value) : null;
  const maxAscent = ui.maxAscent.value ? Number(ui.maxAscent.value) : null;
  const weekendFilter = ui.weekendFilter ? ui.weekendFilter.value : "";
  const sort = ui.sort.value;
  const direction = sort.endsWith("-desc") ? -1 : 1;

  return state.routes
    .filter((route) => {
      const option = selectedOption(route);
      const searchable = `${route.name} ${route.short_name} ${route.id}`.toLocaleLowerCase("zh-CN");
      if (query && !searchable.includes(query)) return false;
      if (maxDrive !== null && route.drive_time.max_minutes > maxDrive) return false;
      if (maxAscent !== null && (option.ascent_m === null || option.ascent_m > maxAscent)) return false;
      if (weekendFilter && state.weekendLoaded) {
        const bookable = isWeekendBookable(route);
        if (weekendFilter === "bookable" && !bookable) return false;
        if (weekendFilter === "unavailable" && bookable) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === "screenshot") return a.screenshot_order - b.screenshot_order;
      return compareNullable(sortValue(a, sort), sortValue(b, sort), direction)
        || (a.screenshot_order - b.screenshot_order);
    });
}

function routeCell(route, option) {
  const cell = node("td");
  const name = node("span", "route-name", route.short_name);
  name.title = route.name;
  if (route.series) cell.append(node("span", "route-series", route.series));
  cell.append(name, node("span", "route-id", `YXK ${route.id}`));

  if (route.hiking_options.length > 1) {
    const select = node("select", "variant-select");
    select.setAttribute("aria-label", `选择${route.short_name}的路线方案`);
    for (const item of route.hiking_options) {
      const choice = node("option", "", item.label);
      choice.value = item.key;
      choice.selected = item.key === option.key;
      select.append(choice);
    }
    select.addEventListener("change", () => {
      state.variants.set(route.id, select.value);
      render();
    });
    cell.append(select);
  }
  if (option.note) cell.append(node("span", "variant-note", option.note));
  return cell;
}

function metricCell(value, unit) {
  const cell = node("td");
  const known = value !== null && value !== undefined;
  cell.append(node("span", known ? "metric" : "metric unknown", formatMetric(value, unit)));
  return cell;
}

function weekendInfo(route) {
  return state.weekend.get(route.id) || { days: [] };
}

function isWeekendBookable(route) {
  return weekendInfo(route).days.some((day) => day.status_code === 1 || day.status_code === 3);
}

function weekendCell(route) {
  const cell = node("td", "weekend-cell");
  if (!state.weekendLoaded) {
    cell.append(node("span", "weekend-none", "未查询"));
    return cell;
  }

  const days = weekendInfo(route).days;
  if (days.length === 0) {
    cell.append(node("span", "weekend-none", "本周末无班期"));
    return cell;
  }

  const list = node("div", "weekend-days");
  for (const day of days) {
    const [, month, date] = day.date.split("-");
    const bookable = day.status_code === 1 || day.status_code === 3;
    const item = node("div", "weekend-day");
    item.append(
      node("span", "weekend-date", `${month}/${date}`),
      node("span", `weekend-status ${bookable ? "is-bookable" : "is-unavailable"}`, day.status_label),
      node("span", "weekend-price", day.price_cny === null || day.price_cny === undefined ? "价格未公开" : `¥${day.price_cny}`),
    );
    list.append(item);
  }
  cell.append(list);
  return cell;
}

function weatherCell(route) {
  const cell = node("td", "weather-cell");
  const weather = state.weather.get(route.id);
  if (!weather) {
    cell.append(node("span", "weather-none", "未配置"));
    return cell;
  }

  const date = state.weatherDate || "2026-11-07";
  const shortDate = date.slice(5).replace("-", "/");
  const link = node("a", "weather-link", `${shortDate} 周六 ↗`);
  link.href = weather.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.title = `${weather.name} · ${date}（周六）天气预报 · 中国天气网`;
  cell.append(node("span", "weather-location", weather.name), link);
  return cell;
}

function render() {
  const routes = visibleRoutes();
  ui.rows.replaceChildren();

  for (const route of routes) {
    const option = selectedOption(route);
    const row = node("tr");
    row.dataset.routeId = route.id;
    row.append(
      routeCell(route, option),
      node("td", "drive-text", route.drive_time.text),
      metricCell(option.distance_km, "km"),
      metricCell(option.ascent_m, "m"),
    );
    if (weekendUrl) row.append(weekendCell(route));
    if (state.weather.size) row.append(weatherCell(route));
    const source = node("td");
    const link = node("a", "source-link", "官方详情 ↗");
    link.href = route.source_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = `核对日期：${route.checked_at}`;
    source.append(link);
    row.append(source);
    ui.rows.append(row);
  }

  let summary = `显示 ${routes.length} / ${state.routes.length} 条`;
  if (weekendUrl && state.weekendLoaded) {
    summary += ` · 本周末共 ${state.routes.filter(isWeekendBookable).length} 条可报名`;
  }
  summary += ` · 核对日期 ${state.checkedAt}`;
  ui.summary.textContent = summary;
  ui.empty.hidden = routes.length !== 0;
}

async function loadWeekend() {
  if (!weekendUrl) return;
  try {
    const response = await fetch(weekendUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.weekend = new Map(Object.entries(data.routes || {}));
    state.weekendLoaded = true;
    if (ui.weekendNote && data.checked_at) {
      const stamp = data.checked_at.slice(0, 16).replace("T", " ");
      ui.weekendNote.textContent = `本周末班期来自 ${stamp} 的团期快照，不自动刷新；“确定成行”班次仍可报名。天气链接为中国天气网城市/区县 7 天预报，非徒步起点精确预报。`;
    }
  } catch (error) {
    state.weekendLoaded = false;
    if (ui.weekendNote) ui.weekendNote.textContent = "本周末班期读取失败，请稍后重试。";
  }
}

async function load() {
  try {
    const response = await fetch(routesUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.routes = data.routes;
    state.checkedAt = data.checked_at;
    state.weather = new Map(Object.entries(data.weather?.locations || {}));
    state.weatherDate = data.weather?.date || "";
    ui.total.textContent = String(state.routes.length);
    await loadWeekend();
    render();
  } catch (error) {
    ui.summary.textContent = "数据读取失败，请通过本地 HTTP 服务或 GitHub Pages 打开。";
    ui.rows.replaceChildren();
    const row = node("tr");
    const cell = node("td", "empty-state", `无法加载 ${routesUrl}：${error.message}`);
    cell.colSpan = 5 + (weekendUrl ? 1 : 0) + (state.weather.size ? 1 : 0);
    row.append(cell);
    ui.rows.append(row);
  }
}

const controls = [ui.search, ui.sort, ui.maxDrive, ui.maxAscent];
if (ui.weekendFilter) controls.push(ui.weekendFilter);
for (const control of controls) {
  control.addEventListener(control === ui.search ? "input" : "change", render);
}

ui.reset.addEventListener("click", () => {
  ui.search.value = "";
  ui.sort.value = "drive-asc";
  ui.maxDrive.value = "";
  ui.maxAscent.value = "";
  if (ui.weekendFilter) ui.weekendFilter.value = "";
  state.variants.clear();
  render();
});

load();
