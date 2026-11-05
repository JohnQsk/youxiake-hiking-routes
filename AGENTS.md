# AGENTS.md

本文件面向在本仓库工作的编码 Agent。动手前先读完：这里的约束大多有测试兜底，不是风格建议。

## 项目是什么

「徙野 / Youxiake Hiking Routes」是一个公开、可溯源的个人实验：把上海出发的一日徒步路线整理成结构化数据，并按**参考车程、徒步距离、累计爬升**比较。

- 纯静态站点：HTML + CSS + 原生 JavaScript，无框架、无后端、无外部前端资源。
- 线上地址：<https://johnqsk.github.io/youxiake-hiking-routes/>
- 非游侠客官方项目，不提供报名服务。不要把它改成商业导流、报名入口或内容聚合站。
- 数据范围是 2026-11-05 核对的 21 条入门路线和 16 条进阶路线，**不是**游侠客全量路线库。

## 技术栈与硬约束

- 没有 `package.json`，没有构建步骤，没有 npm 依赖。不要为了改页面引入框架、打包器、CDN 资源或字体服务。
- 页面必须通过 HTTP 访问（JS 用 `fetch` 读取 JSON）；不要改成依赖 `file://` 的方案。
- 测试是 Node 内置 `assert` 的独立 `.mjs` 脚本，不需要测试框架；`scripts/export_csv.py` 只用 Python 标准库。
- 页面语言为 `zh-CN`。文案保持克制、可核验，不写营销式夸大或无法证实的“最……”“必去”。
- GitHub Pages 静态托管，不要引入需要服务端、定时任务或构建产物的功能。

## 常用命令

在仓库根目录执行：

```bash
# 本地预览（然后打开 http://127.0.0.1:8000）
python -m http.server 8000

# 由 routes.json 重新生成 routes.csv（UTF-8 with BOM，每方案一行）
python scripts/export_csv.py

# 数据、页面、周末快照测试
node tests/test_data.mjs
node tests/test_advanced_data.mjs
node tests/test_weekend_availability.mjs
node tests/test_weather.mjs
node tests/test_pages.mjs
node tests/test_weekend.mjs

# JavaScript 语法检查
node --check app.js
node --check weekend.js
```

改完任何内容，至少运行与改动相关的测试；改 JS 必须跑 `node --check`。不要在没有运行测试的情况下声称通过。

## 目录结构

| 路径 | 作用 |
|---|---|
| `index.html` | 首页：本周末单路线预览 + 入门线 / 进阶线入口，不重复路线表 |
| `beginner.html` | 入门线对照表：21 条路线，含本周末班期列与报名筛选 |
| `about.html` | 项目动机、数据方法、工具致谢 |
| `advanced.html` | 进阶线对照表：16 条路线，含本周末班期列与报名筛选 |
| `app.js` | 入门页与进阶页共用的路线表：加载、筛选、排序、多方案切换；数据集由 `<body data-routes>` 指定，周末快照由 `<body data-weekend>` 指定 |
| `weekend.js` | 首页单路线周末预览的渲染 |
| `style.css` | 全站样式；设计变量在 `:root`，断点为 1050px / 700px，并处理 `prefers-reduced-motion` |
| `data/routes.json` | 入门路线主数据集（21 条，含固定地点天气链接） |
| `data/advanced-routes.json` | 进阶路线数据集（16 条，另有 `tier`、`series` 与固定地点天气链接） |
| `data/weekend-availability.json` | 全站 37 条路线 11/07–08 的手动团期与价格快照 |
| `data/weekend-preview.json` | 大树王国（56151）最近周末的手动快照 |
| `routes.csv` | 由入门数据集生成的 CSV，需与 `data/routes.json` 同步提交 |
| `scripts/export_csv.py` | CSV 导出脚本 |
| `tests/*.mjs` | 数据、页面、周末快照、天气映射的断言测试 |
| `CHANGELOG.md` | 版本记录；当前发布版本为 v1.0.1 |
| `.nojekyll` | GitHub Pages 配置，勿删 |

## 数据规则（最重要）

`tests/test_data.mjs` 与 `tests/test_advanced_data.mjs` 固定了两套数据集的形状。修改数据前先读对应测试，修改后必须让它继续通过。

入门数据集 `data/routes.json`：

- 顶层 `schema_version` 为 `1`，`checked_at` 为 `2026-11-05`。
- 恰好 21 条路线；`id` 为纯数字字符串且唯一；`screenshot_order` 为连续的 `1..21`。
- 每条路线：`departure_city` 为 `"上海"`，`days` 为 `1`，`source_url` 必须严格等于 `https://www.youxiake.com/lines.html?id=<id>`。
- `drive_time` 必须有 `min_minutes`、`max_minutes`、`text`，且 `0 < min <= max`。排序用下限，车程上限筛选用上限。
- `hiking_options` 至少一项，每项含唯一 `key`、`label`、字符串 `note`；`distance_km` 与 `ascent_m` 只能是**正数或 `null`**。
- `null` 表示官方未公开，**不是 0，不是缺失待填的占位符**。UI 显示“未公开”，排序置底，筛选时排除；不要把最高海拔、下降或接驳距离填进累计爬升/全程距离。
- 多方案、多季节、多接驳分别放进 `hiking_options`，不要合并成一个“平均值”。
- `source_excerpt` 只放理解数字所需的短摘录；不要复制官方全文或图片。
- `checked_at` 只能在实际重新核对官方详情后更新，并同步更新 README、首页文案和测试里所有硬编码日期；不要为了“看起来新”改日期。

进阶数据集 `data/advanced-routes.json`：

- 顶层 `tier` 为 `"advanced"`，恰好 16 条；`screenshot_order` 连续 `1..16`，ID 唯一且不与入门数据集重叠。
- 每条路线必须有非空 `series`（如“疾速追山”“山野攀行”），它是官方系列标签，不是难度评级。
- 官方写区间或“+”号时（5–6km、750–800m、950m+），`distance_km` / `ascent_m` 按上限记录，并在 `note` 保留原文；不要删掉备注把区间伪装成精确值。
- 活动 ID 可以用 youxiake-go 检索，但车程、距离、爬升必须逐条回到官方详情页核对；工具结果不能直接当数据。
- `advanced.html` 必须保留 `data-routes="./data/advanced-routes.json"`、`#route-rows` 和表格说明，不得退回占位页。

两份路线数据都有顶层 `weather` 块：

- `date` 为 `2026-11-07`、`weekday` 为 `周六`、`source` 为 `中国天气网`，`note` 必须说明是城市/区县 7 天预报、非徒步起点精确预报。
- `locations` 必须覆盖该数据集全部活动 ID，每个值含非空 `name` 和 `https://www.weather.com.cn/weather/<code>.shtml` 链接。
- 表格按固定地点生成“11/07 周六”天气链接；不要在页面运行时请求天气接口，也不要声称链接是徒步起点精确预报。

新增路线属于范围变更，会牵动 README、入门页 `21` / 进阶页 `16` 的计数、对应测试和 CSV。除非用户明确要求，不要扩充数据集；优先修正或核对现有条目。

## 全站本周末班期快照

`data/weekend-availability.json` 是**手动快照**，不是实时接口：

- 只覆盖 2026-11-07/08；保留 `checked_at`（含时分）、`weekend.start/end`、`complete: true` 和 `source_method`。
- 必须覆盖全部 37 个活动 ID（入门 21 + 进阶 16），顺序与 `routes.json`、`advanced-routes.json` 一致；本周末没有班期时 `days` 为空数组，不伪造日期。
- `status_code`：`1` = 可报名，`3` = 确定成行，`2` = 不可报名（暂满/受限）；`1` 和 `3` 都算可报名。大树王国 11/07 的 `2` 显示为“暂满”。
- 只记录班期状态与 `price_cny`，不记录余位或 `joined`；历史累计报名数不能冒充班期实时人数。
- 页面不得自动刷新，也不得在浏览器里请求第三方班期接口；快照由 youxiake-go 的团期查询（`--ids`）手动生成。
- `tests/test_weekend_availability.mjs` 固定了：入门 8 条可报名、进阶 5 条可报名、共 24 条无班期。刷新快照时同步更新测试，不要删断言来“修绿”。

## 周末快照规则

`data/weekend-preview.json` 是**手动快照**，不是实时接口：

- 只覆盖 56151 大树王国的最近周末两天；`complete: true`，并保留 `fetched_at`、`source_url`、`source_method`。
- 班期状态与价格来自官方；`participant_count` 必须保持 `null`，不得用历史累计报名数冒充班期实时人数。
- 仅 `available` 或 `confirmed` 的日期才有 `weather`；`full` 日期写 `weather_note`，不查询天气。
- 天气来自 Open-Meteo 网格预报，`location` 必须说明“非景区入口精确预报”。
- 页面不得自动刷新快照，也不得在浏览器里请求第三方天气/票务接口。
- `tests/test_weekend.mjs` 硬编码了 2026-11-07/08、价格 185、状态和天气码。刷新快照时同步更新测试，不要删掉这些断言来“修绿”。

## 页面与前端约定

`tests/test_pages.mjs` 会检查：`<html lang="zh-CN">`、非空 `<title>`、每页恰好一个 `aria-current="page"`、导航同时包含 `./beginner.html`、`./about.html` 与 `./advanced.html`、所有 `./` 开头的 `href`/`src` 均存在、每页都有 `youxiake-go` 致谢链接。

- 四个页面共享同一套顶部导航，都包含首页、一日入门线、进阶线、关于；新增页面时保持导航一致，并只给当前页加 `aria-current`。
- 所有本地资源用 `./` 相对路径，保证 Pages 子路径可用。
- `advanced.html` 必须保留真实对照表：`data-routes="./data/advanced-routes.json"`、`data-weekend="./data/weekend-availability.json"`、`#route-rows`、`#weekend-filter`、`#weekend-note`、进阶说明和 `app.js` 引用；不要改回占位页。
- `index.html` 只做首页：保留 `weekend-preview-content`、`./weekend.js`、“天气只查询可报名或确定成行的日期”和两个路线页入口；不要把路线表搬回首页。
- `beginner.html` 必须保留 `data-routes="./data/routes.json"`、`data-weekend="./data/weekend-availability.json"`、`#route-rows`、`#weekend-filter`、`#weekend-note` 和“本周末 11/07–08”表头。
- 入门页与进阶页都必须保留周末班期列和“周六天气”列；任一页改回 5 列表格都会失去报名筛选与天气链接。
- 天气列使用固定地点映射，链接日期为 11/07 周六；不要改成实时天气请求，也不要把城市/区县预报说成徒步起点预报。
- 入门页写死的 `21`、进阶页写死的 `16`、核对日期和 meta description，在数据变更时必须一起改。
- 不要删除 footer 里的非官方声明、数据来源、致谢或 MIT 许可信息。

JavaScript 约定：

- 两个入口都使用 `"use strict"`，保持无依赖、可读的普通函数风格。
- 用 `document.createElement` / `textContent` 构建 DOM，**不要用 `innerHTML` 拼接数据**。
- 缺失值统一走 `null` 分支（显示“未公开”、排序置底），不要用 `0` 或空字符串兜底。
- `app.js` 被入门页和进阶页共用，通过 `<body data-routes>` 选择 JSON；两页都用 `<body data-weekend>` 加载同一份班期快照。没有对应数据的列不要渲染成空列：基础 5 列之外，周末列由 `data-weekend` 决定，天气列由数据集 `weather` 块决定。`weekend.js` 只负责首页单路线卡片。
- 班期筛选只认 `status_code` 1/3 为可报名；数据未加载时不要误判为“不可报名”。
- 不引入全局状态管理、虚拟 DOM 或第三方工具库。

CSS 约定：

- 复用 `:root` 里的颜色/阴影变量和现有组件类，不要在 HTML 里写内联样式。
- 移动端已有 1050px / 700px 断点；改布局时同时检查窄屏表格横向滚动和导航换行。
- 动效必须尊重 `prefers-reduced-motion`。

## 完成标准

- 数据改动：`python scripts/export_csv.py` + `node tests/test_data.mjs`，并检查 `routes.csv` diff 合理。
- 进阶数据改动：`node tests/test_advanced_data.mjs`，确认 16 条、ID 不重叠、区间按上限并保留备注。
- 全站周末班期改动：`node tests/test_weekend_availability.mjs`，确认 37 个 ID 全覆盖、入门 8 条/进阶 5 条可报名、24 条无班期的口径，并更新 `checked_at`。
- 天气映射改动：`node tests/test_weather.mjs`，确认两份数据都覆盖全部路线、日期为 11/07 周六、链接指向中国天气网城市/区县页。
- 页面改动：`node tests/test_pages.mjs`；涉及入门页或进阶页数字时手动核对计数与日期。
- 周末快照改动：`node tests/test_weekend.mjs`，确认天气只出现在可报名/确定成行日期。
- JS 改动：`node --check app.js`、`node --check weekend.js`，并确认入门页与进阶页都能加载各自的数据集。
- 视觉改动：用 `python -m http.server 8000` 起本地服务，在浏览器里实际打开验证；不要只读代码就断言渲染正常。
- 只做与请求相关的最小改动，不顺手重构、不批量改文案、不升级工具链。

## 边界

- 逐条核对官方公开详情页；不批量抓取、不绕过登录/付费墙、不冒用官方身份。
- 拿不到的数字保持 `null` 或干脆不写；不要根据路线名、图片或“新手友好”等宣传词猜数字。
- 不提交 cookie、token、个人报名信息或任何隐私数据。
- 不添加统计、追踪、广告或第三方请求；本项目要能纯静态、可离线自托管（数据文件随仓库提供）。
- 保留来源链接、核对日期、短摘录和免责声明；使用第三方工具（如 youxiake-go）时独立核验字段含义。
