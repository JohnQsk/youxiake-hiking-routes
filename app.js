"use strict";

const state = {
  routes: [],
  checkedAt: "",
  variants: new Map(),
};

const ui = {
  rows: document.querySelector("#route-rows"),
  summary: document.querySelector("#result-summary"),
  total: document.querySelector("#route-total"),
  search: document.querySelector("#search"),
  sort: document.querySelector("#sort"),
  maxDrive: document.querySelector("#max-drive"),
  maxAscent: document.querySelector("#max-ascent"),
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
  const sort = ui.sort.value;
  const direction = sort.endsWith("-desc") ? -1 : 1;

  return state.routes
    .filter((route) => {
      const option = selectedOption(route);
      const searchable = `${route.name} ${route.short_name} ${route.id}`.toLocaleLowerCase("zh-CN");
      if (query && !searchable.includes(query)) return false;
      if (maxDrive !== null && route.drive_time.max_minutes > maxDrive) return false;
      if (maxAscent !== null && (option.ascent_m === null || option.ascent_m > maxAscent)) return false;
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

  ui.summary.textContent = `显示 ${routes.length} / ${state.routes.length} 条 · 核对日期 ${state.checkedAt}`;
  ui.empty.hidden = routes.length !== 0;
}

async function load() {
  try {
    const response = await fetch("./data/routes.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.routes = data.routes;
    state.checkedAt = data.checked_at;
    ui.total.textContent = String(state.routes.length);
    render();
  } catch (error) {
    ui.summary.textContent = "数据读取失败，请通过本地 HTTP 服务或 GitHub Pages 打开。";
    ui.rows.replaceChildren();
    const row = node("tr");
    const cell = node("td", "empty-state", `无法加载 routes.json：${error.message}`);
    cell.colSpan = 5;
    row.append(cell);
    ui.rows.append(row);
  }
}

for (const control of [ui.search, ui.sort, ui.maxDrive, ui.maxAscent]) {
  control.addEventListener(control === ui.search ? "input" : "change", render);
}

ui.reset.addEventListener("click", () => {
  ui.search.value = "";
  ui.sort.value = "drive-asc";
  ui.maxDrive.value = "";
  ui.maxAscent.value = "";
  state.variants.clear();
  render();
});

load();
