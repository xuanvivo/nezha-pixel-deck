import "./style.css";
import { landscape, icon } from "./art";
import { demoServers, demoGroups } from "./demo";
import {
  bytes,
  cpuCount,
  publicDescription,
  escapeHTML as e,
  finite,
  isOnline,
  nameOf,
  parseConfig,
  parseServers,
  percent,
  sorts,
  sortServers,
  uptime,
} from "./model";
import type { Config, Group, Server, Sort } from "./model";

const demo = new URLSearchParams(location.search).get("demo") === "1";
const app = document.querySelector<HTMLDivElement>("#app")!;
const regions = new Intl.DisplayNames(["zh-CN"], { type: "region" });
const stored = <T>(key: string, fallback: T): T => {
  try {
    return (
      JSON.parse(localStorage.getItem(`pixel-deck:${key}`) || "null") ??
      fallback
    );
  } catch {
    return fallback;
  }
};
const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(`pixel-deck:${key}`, JSON.stringify(value));
  } catch {
    /* Storage is optional. */
  }
};
let config: Config = {};
let servers: Server[] = [],
  groups: Group[] = [];
let query = "",
  group = "all",
  region = "all";
let sort: Sort = stored<Sort>("sort", "default");
if (!Object.hasOwn(sorts, sort)) sort = "default";
let onlineFirst = stored<boolean>("onlineFirst", true) === true;
const savedOrder: unknown = stored("order", []);
let order: number[] = Array.isArray(savedOrder)
  ? savedOrder.filter((n): n is number => Number.isSafeInteger(n))
  : [];
let compact = stored<boolean>("compact", false) === true;
let editing = false,
  selected: number | null = null,
  updated = 0,
  reconnectAttempt = 0;
let phase: "connecting" | "live" | "reconnecting" | "stale" | "demo" = demo
  ? "demo"
  : "connecting";
let hasFrame = false;
const history = new Map<
  number,
  { cpu: number[]; memory: number[]; in: number[]; out: number[] }
>();
const regionName = (code: string | undefined) => {
  try {
    return code && /^[A-Za-z]{2}$/.test(code)
      ? regions.of(code.toUpperCase()) || code
      : "未知地区";
  } catch {
    return "未知地区";
  }
};
const noteOf = (s: Server) =>
  config.descriptions?.[s.id] || publicDescription(s.public_note);
const current = () => phase === "live" || phase === "demo";
const online = (s: Server) => isOnline(s) && current();
const name = (s: Server) => e(nameOf(s, config));
const stateText = () =>
  ({
    connecting: "正在连接",
    live: "实时连接",
    reconnecting: "连接中断 · 自动重连",
    stale: "数据延迟 · 正在重连",
    demo: "演示模式 · 虚构数据",
  })[phase];

app.innerHTML = `
<header class="topbar"><div class="topbar-inner"><a href="${demo ? "/?demo=1" : "/"}" class="brand"><span class="brand-mark">${icon("server")}</span><span><strong id="site-name">PIXEL DECK</strong><small>NEZHA MONITORING / 像素监控台</small></span></a>
<nav aria-label="主导航"><a class="nav-current" href="#nodes">${icon("grid")}节点总览</a><button id="help-button">${icon("book")}使用说明</button><a href="/dashboard/" class="admin-link">管理后台 ${icon("arrow")}</a><button id="theme-button" class="icon-button" aria-label="切换深浅主题">${icon("moon")}</button></nav></div></header>
<main class="shell"><section class="hero frame"><div class="hero-copy"><div class="eyebrow"><span class="pixel-cross">+</span> A LITTLE PIXEL, A CLEARER WORLD.</div><h1>像素之间，<br>尽览每一台。</h1><p id="subtitle">把散落各处的服务器，装进一方像素世界。<br>运行状态、资源与流量，一眼有数。</p><div class="hero-bottom"><span class="connection"><i class="status-dot"></i><span id="connection-label" role="status">${stateText()}</span></span><span class="edition">VOL. 01 / ALWAYS IN SIGHT</span></div></div><div class="hero-art">${landscape}<span class="art-label">YOUR LITTLE SERVER FOREST</span></div></section>
<div class="demo-notice" ${demo ? "" : "hidden"}>${icon("spark")}当前是演示世界：所有节点、名称与指标均为虚构，不连接真实服务器。<a href="/">返回实时面板 ${icon("arrow")}</a></div>
<section class="stats" aria-label="服务器概况" id="stats"></section>
<section class="nodes-section" id="nodes"><div class="section-heading"><div><span class="eyebrow">THE FLEET / 01</span><h2>${icon("server")}我的服务器 <span id="visible-count">—</span></h2></div><span class="last-update" id="last-update">等待首次上报</span></div>
<div class="control-panel frame"><div class="toolbar"><label class="search">${icon("search")}<input id="search" type="search" placeholder="搜索节点名称、地区或备注…" aria-label="搜索节点" autocomplete="off"><kbd>/</kbd></label><label class="sort-select">${icon("sort")}<span class="sr-only">服务器排序</span><select id="sort">${Object.entries(
  sorts,
)
  .map(([value, label]) => `<option value="${value}">${label}</option>`)
  .join(
    "",
  )}</select></label><div class="view-buttons"><button id="grid-view" class="icon-button" aria-label="卡片视图" aria-pressed="true">${icon("grid")}</button><button id="list-view" class="icon-button" aria-label="紧凑视图" aria-pressed="false">${icon("list")}</button></div></div>
<div class="filters"><div class="group-tabs" id="groups" role="group" aria-label="服务器分组"></div><div class="filter-right"><label><span class="sr-only">筛选地区</span><select id="region"><option value="all">所有地区</option></select></label><label class="check"><input type="checkbox" id="online-first" ${onlineFirst ? "checked" : ""}>在线优先</label><button id="edit-order" class="text-button">调整顺序 ${icon("sort")}</button></div></div></div>
<div id="order-hint" class="order-hint" hidden>使用卡片上的前移 / 后移按钮调整顺序，自动保存在当前浏览器。<button class="text-button" id="reset-order">恢复面板顺序</button><button class="small-button" id="finish-order">完成</button></div>
<div id="connection-notice" class="connection-notice" role="status" hidden></div>
<div id="node-grid" class="node-grid" aria-label="服务器列表"></div>
<div class="fleet-footnote"><span>◈ 数值随探针上报刷新 · 流量为累计收发量</span><a href="#guide">如何读懂这些指标 ${icon("arrow")}</a></div></section>
<section class="guide frame" id="guide"><div class="guide-heading"><span class="guide-mark">${icon("book")}</span><div><span class="eyebrow">FIELD NOTES / 02</span><h2>看懂状态，再安心出发。</h2></div><span class="guide-tag">监控小手册</span></div><div class="guide-grid"><article><span class="guide-number">01</span><h3>资源条在说什么？</h3><p>CPU 是当前使用率；内存与磁盘为已用容量占总量的比例。绿色表示余量充足，70% 起变为黄色，90% 起变为红色。</p></article><article><span class="guide-number">02</span><h3>上下行与累计流量</h3><p>↓ 是服务器接收，↑ 是服务器发送；速率单位为字节每秒。累计流量来自探针计数，通常随系统重启归零，不代表本月账单。</p></article><article><span class="guide-number">03</span><h3>在线，也要看新鲜度</h3><p>最近 30 秒有探针上报才算在线。断线或数据过期时，页面会明确提示，并把旧读数标为快照，避免误判为实时状态。</p></article></div><details class="more-guide"><summary>排序、隐私与更多说明 <span>+</span></summary><div><p><b>排序：</b>默认按后台展示权重降序、ID 升序排列。可按名称、地区、CPU、内存、累计流量或运行时长排序。「在线优先」会先分在线 / 离线，再应用选定顺序。</p><p><b>我的顺序：</b>通过「调整顺序」前移或后移节点，仅保存在当前浏览器。管理员可使用独立站点配置中的 serverOrder 给所有访客指定默认顺序。</p><p><b>节点详情：</b>点击节点名称或「查看详情」，查看硬件、负载、连接数和本次打开页面后的短时趋势。缺失字段显示 —，趋势不等同于历史监控。</p><p><b>隐私：</b>页面只读取当前访问权限允许的哪吒数据。隐藏节点与敏感信息必须由哪吒后台限制；前端别名、折叠备注或不展示字段不能替代后端权限。</p></div></details></section>
<footer><a class="footer-brand" href="https://github.com/xuanvivo/nezha-pixel-deck" target="_blank" rel="noreferrer">${icon("server")} NEZHA PIXEL DECK</a><span>小小像素，认真守望。<span class="footer-dots"> ▪ ▪ ▪</span></span><a href="https://github.com/xuanvivo/nezha-pixel-deck" target="_blank" rel="noreferrer">${icon("github")}开源主题 ${icon("arrow")}</a></footer>
</main><dialog id="detail" aria-labelledby="detail-title"><div id="detail-body"></div></dialog><div id="announcement" class="sr-only" role="status" aria-live="polite"></div>`;

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
$("#sort").setAttribute("value", sort);
($("#sort") as HTMLSelectElement).value = sort;
function severity(p: number | null) {
  return p === null
    ? "unknown"
    : p >= 90
      ? "danger"
      : p >= 70
        ? "warning"
        : "good";
}
function meter(label: string, value: number | null, desc: string) {
  return `<div class="resource"><div class="resource-label"><span>${label}</span><strong>${value === null ? "—" : value.toFixed(1) + "<small>%</small>"}</strong></div><div class="meter ${severity(value)}" role="meter" aria-label="${label}使用率" aria-valuemin="0" aria-valuemax="100" ${value === null ? 'aria-valuetext="未上报"' : `aria-valuenow="${value.toFixed(1)}"`}><span style="width:${value === null ? 0 : Math.min(100, Math.max(0, value))}%"></span></div><small class="resource-desc">${desc}</small></div>`;
}
function sparkline(samples: number[], cls = "", width = 120, height = 28) {
  if (samples.length < 2) return `<span class="trend-pending">等待趋势</span>`;
  const max = Math.max(...samples, 1);
  const points = samples
    .map(
      (v, i) =>
        `${((i / (samples.length - 1)) * width).toFixed(1)},${(height - 3 - (v / max) * (height - 6)).toFixed(1)}`,
    )
    .join(" ");
  return `<svg class="sparkline ${cls}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}
function filtered() {
  const members = groups.find((g) => String(g.group.id) === group)?.servers;
  const needle = query.toLocaleLowerCase();
  return sortServers(
    servers.filter(
      (s) =>
        (group === "all" || members?.includes(s.id)) &&
        (region === "all" || s.country_code === region) &&
        (!needle ||
          `${nameOf(s, config)} ${regionName(s.country_code)} ${noteOf(s)}`
            .toLocaleLowerCase()
            .includes(needle)),
    ),
    sort,
    onlineFirst,
    order.length ? order : config.serverOrder,
    Date.now(),
    config,
  );
}
function card(s: Server, index: number) {
  const h = s.host || {},
    st = s.state || {},
    live = online(s),
    stale = !current(),
    cores = cpuCount(h.cpu);
  const cpu = typeof st.cpu === "number" ? Math.min(100, finite(st.cpu)) : null;
  const memory = percent(st.mem_used, h.mem_total),
    disk = percent(st.disk_used, h.disk_total);
  const orderButtons = editing
    ? `<div class="move-buttons"><button data-move="${s.id}" data-direction="-1" aria-label="前移 ${name(s)}">↑ 前移</button><button data-move="${s.id}" data-direction="1" aria-label="后移 ${name(s)}">↓ 后移</button></div>`
    : "";
  const hostInfo = [
    cores ? `${cores} vCPU` : "",
    finite(h.mem_total) ? bytes(h.mem_total) : "",
    h.platform ? e(h.platform) : "",
  ]
    .filter(Boolean)
    .join("<span> / </span>");
  return `<article class="node-card frame ${live ? "" : "is-offline"}" data-id="${s.id}"><div class="card-top"><span class="node-number">NODE / ${String(index + 1).padStart(2, "0")}</span><span class="node-status"><i class="status-dot ${live ? "" : "offline"}"></i>${stale ? "快照" : live ? "在线" : "离线"}</span></div><div class="node-title"><span class="node-avatar">${icon("server")}</span><div><button class="node-name" data-detail="${s.id}">${name(s)}</button><div class="node-location">${icon("globe")}<span>${e(regionName(s.country_code))}</span><span class="country-code">${e(s.country_code || "—")}</span></div></div></div><p class="host-info">${hostInfo || "硬件信息未上报"}</p><div class="resources">${meter("CPU", cpu, cores ? `${cores} 个逻辑核心` : "处理器使用率")}${meter("内存", memory, finite(h.mem_total) ? `${bytes(st.mem_used)} / ${bytes(h.mem_total)}` : "容量未上报")}${meter("磁盘", disk, finite(h.disk_total) ? `${bytes(st.disk_used)} / ${bytes(h.disk_total)}` : "容量未上报")}</div><div class="network"><div><span>${icon("down")}下载 / IN</span><strong>${live ? bytes(st.net_in_speed) + "<small>/s</small>" : "—"}</strong></div><div><span>${icon("up")}上传 / OUT</span><strong>${live ? bytes(st.net_out_speed) + "<small>/s</small>" : "—"}</strong></div><div class="network-trend">${sparkline(history.get(s.id)?.out || [])}<small>本次短时趋势</small></div></div><div class="card-note">${noteOf(s) ? e(noteOf(s)) : "暂无节点说明"}</div><div class="card-bottom"><span>${live ? '<i class="tiny-square"></i>已运行 ' + uptime(st.uptime) : "最后上报 " + (s.last_active && Number.isFinite(Date.parse(s.last_active)) ? e(new Date(s.last_active).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })) : "—")}</span><button data-detail="${s.id}">查看详情 ${icon("arrow")}</button></div>${orderButtons}</article>`;
}
function renderStats() {
  const active = servers.filter(online),
    total = servers.length;
  const cpu = active.filter((s) => typeof s.state?.cpu === "number");
  const average = cpu.length
    ? (
        cpu.reduce((sum, s) => sum + finite(s.state?.cpu), 0) / cpu.length
      ).toFixed(1)
    : "—";
  const incoming = active.reduce(
      (sum, s) => sum + finite(s.state?.net_in_speed),
      0,
    ),
    outgoing = active.reduce(
      (sum, s) => sum + finite(s.state?.net_out_speed),
      0,
    );
  const traffic = servers.reduce(
    (sum, s) =>
      sum +
      finite(s.state?.net_in_transfer) +
      finite(s.state?.net_out_transfer),
    0,
  );
  const known = hasFrame;
  $("#stats").innerHTML =
    `<div class="stat frame stat-online"><span class="stat-label"><span class="status-dot ${current() ? "" : "offline"}"></span>在线节点 <small>FLEET STATUS</small></span><strong>${known ? active.length : "—"}<small>/ ${known ? total : "—"}</small></strong><div class="stat-bottom"><span>${known ? total - active.length + (current() ? " 台离线" : " 台状态待确认") : "等待首次上报"}</span><span>${known && total && current() ? Math.round((active.length / total) * 100) + "% ONLINE" : "—"}</span></div></div><div class="stat frame"><span class="stat-label">平均 CPU <small>COMPUTE</small></span><strong>${current() ? average : "—"}<small>%</small></strong><div class="stat-bottom"><span>在线节点算术平均</span><span class="mini-bars">▂ ▄ ▃ ▆ ▄ ▂</span></div></div><div class="stat frame"><span class="stat-label">实时上下行 <small>NETWORK</small></span><div class="stat-network"><strong><small>↓</small> ${current() && known ? bytes(incoming) : "—"}<small>/s</small></strong><span>↑ ${current() && known ? bytes(outgoing) + "/s" : "—"}</span></div><div class="stat-bottom"><span>在线节点速率合计</span><span>IN / OUT</span></div></div><div class="stat frame"><span class="stat-label">累计流量 <small>TRANSFER</small></span><strong class="traffic-total">${known ? bytes(traffic) : "—"}</strong><div class="stat-bottom"><span>收发合计 · 非月度用量</span><span>↗</span></div></div>`;
}
function renderFilters() {
  $("#groups").innerHTML =
    `<button data-group="all" class="tab ${group === "all" ? "active" : ""}" aria-pressed="${group === "all"}">全部节点 <small>${servers.length}</small></button>` +
    groups
      .map(
        (g) =>
          `<button class="tab ${group === String(g.group.id) ? "active" : ""}" data-group="${g.group.id}" aria-pressed="${group === String(g.group.id)}">${e(g.group.name)}<small>${servers.filter((s) => g.servers.includes(s.id)).length}</small></button>`,
      )
      .join("");
  const codes = [
    ...new Set(
      servers.map((s) => s.country_code).filter((c): c is string => !!c),
    ),
  ].sort();
  if (region !== "all" && !codes.includes(region)) region = "all";
  $("#region").innerHTML =
    '<option value="all">所有地区</option>' +
    codes
      .map((c) => `<option value="${e(c)}">${e(regionName(c))}</option>`)
      .join("");
  ($("#region") as HTMLSelectElement).value = region;
}
function render() {
  const focused = document.activeElement as HTMLElement | null;
  const detailId = focused?.dataset.detail,
    moveId = focused?.dataset.move,
    direction = focused?.dataset.direction;
  const visible = filtered();
  $("#visible-count").textContent = hasFrame
    ? `${visible.length} / ${servers.length}`
    : "—";
  $("#node-grid").classList.toggle("compact", compact);
  $("#grid-view").setAttribute("aria-pressed", String(!compact));
  $("#list-view").setAttribute("aria-pressed", String(compact));
  $("#connection-label").textContent = stateText();
  $(".connection").classList.toggle("disconnected", !current());
  $("#last-update").textContent = updated
    ? `${demo ? "演示数据" : "最近更新"} ${new Date(updated).toLocaleTimeString("zh-CN", { hour12: false })}`
    : "等待首次上报";
  const notice = $("#connection-notice");
  notice.hidden = current() || phase === "connecting";
  notice.textContent = hasFrame
    ? "实时连接暂不可用，正在自动重连。下方资源条为最后一次快照。"
    : "还没有收到服务器数据。请确认面板连接和访问权限；页面会继续自动重连。";
  $("#node-grid").innerHTML = visible.length
    ? visible.map(card).join("")
    : `<div class="empty-state frame">${icon(hasFrame ? "search" : "server")}<h3>${hasFrame ? (servers.length ? "没有匹配的节点" : "还没有可见节点") : "正在接收你的像素世界…"}</h3><p>${hasFrame ? (servers.length ? "试试其他关键词，或清除分组与地区筛选。" : "检查后台节点是否允许访客查看，或进入管理后台登录。") : "等待哪吒面板的首次实时上报。"}</p>${hasFrame && servers.length ? '<button id="clear-filters" class="small-button">清除筛选</button>' : '<a href="/dashboard/" class="small-button">进入后台</a>'}</div>`;
  if (detailId)
    document
      .querySelector<HTMLElement>(`[data-detail="${detailId}"]`)
      ?.focus({ preventScroll: true });
  if (moveId)
    document
      .querySelector<HTMLElement>(
        `[data-move="${moveId}"][data-direction="${direction}"]`,
      )
      ?.focus({ preventScroll: true });
  renderStats();
  if (selected !== null) renderDetail();
}
function renderDetail() {
  const s = servers.find((s) => s.id === selected);
  if (!s) {
    closeDetail();
    return;
  }
  const focused = document.activeElement?.id;
  const h = s.host || {},
    st = s.state || {},
    hist = history.get(s.id);
  const pair = (label: string, value: string) =>
    `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  $("#detail-body").innerHTML =
    `<div class="detail-heading"><span class="eyebrow">NODE DETAILS / ${s.id}</span><button id="close-detail" class="icon-button" aria-label="关闭详情">${icon("close")}</button></div><h2 id="detail-title">${name(s)}</h2><p class="detail-summary">${e(regionName(s.country_code))} · ${online(s) ? "在线" : "快照 / 离线"} · ${e(h.platform || "系统未上报")}</p>${noteOf(s) ? `<p class="detail-note">${e(noteOf(s))}</p>` : ""}<dl class="detail-facts">${pair("架构 / 虚拟化", e([h.arch, h.virtualization].filter(Boolean).join(" / ") || "—"))}${pair("CPU", Array.isArray(h.cpu) && h.cpu.length ? `${cpuCount(h.cpu) ? cpuCount(h.cpu) + " vCPU · " : ""}${e(h.cpu[0])}` : "—")}${pair("内存", finite(h.mem_total) ? `${bytes(st.mem_used)} / ${bytes(h.mem_total)}` : "—")}${pair("磁盘", finite(h.disk_total) ? `${bytes(st.disk_used)} / ${bytes(h.disk_total)}` : "—")}${pair("Swap", finite(h.swap_total) ? `${bytes(st.swap_used)} / ${bytes(h.swap_total)}` : "—")}${pair("运行时间", st.uptime == null ? "—" : uptime(st.uptime))}${pair("负载 1 / 5 / 15 分", [st.load_1, st.load_5, st.load_15].map((n) => (n == null ? "—" : finite(n).toFixed(2))).join(" / "))}${pair("TCP / UDP 连接", `${e(st.tcp_conn_count ?? "—")} / ${e(st.udp_conn_count ?? "—")}`)}${pair("累计接收 / 发送", `${bytes(st.net_in_transfer)} / ${bytes(st.net_out_transfer)}`)}${pair("最后上报", e(s.last_active && Number.isFinite(Date.parse(s.last_active)) ? new Date(s.last_active).toLocaleString("zh-CN") : "—"))}</dl><div class="detail-chart"><span>CPU · 本次会话短时趋势</span>${sparkline(hist?.cpu || [], "", 440, 76)}<small>最多保留 30 次上报 · 仅在内存中保存 · 刷新后清空</small></div><div class="detail-chart"><span>发送速率 · 本次会话短时趋势</span>${sparkline(hist?.out || [], "", 440, 76)}</div>`;
  $("#close-detail").onclick = closeDetail;
  if (focused === "close-detail")
    $("#close-detail").focus({ preventScroll: true });
}
function closeDetail() {
  selected = null;
  $("#detail").removeAttribute("data-open");
  ($("#detail") as HTMLDialogElement).close();
}
function receive(data: Server[]) {
  const previous = new Map(servers.map((s) => [s.id, s]));
  servers = data.map((s) => ({
    ...s,
    public_note: s.public_note || previous.get(s.id)?.public_note,
  }));
  updated = Date.now();
  hasFrame = true;
  const present = new Set(servers.map((s) => s.id));
  for (const id of history.keys()) if (!present.has(id)) history.delete(id);
  for (const s of servers) {
    if (!isOnline(s)) continue;
    const h = history.get(s.id) || { cpu: [], memory: [], in: [], out: [] };
    for (const [key, value] of Object.entries({
      cpu: finite(s.state?.cpu),
      memory: percent(s.state?.mem_used, s.host?.mem_total) || 0,
      in: finite(s.state?.net_in_speed),
      out: finite(s.state?.net_out_speed),
    })) {
      h[key as keyof typeof h].push(value);
      if (h[key as keyof typeof h].length > 30)
        h[key as keyof typeof h].shift();
    }
    history.set(s.id, h);
  }
  renderFilters();
  render();
}
$("#search").addEventListener("input", (event) => {
  query = (event.target as HTMLInputElement).value;
  render();
});
$("#sort").addEventListener("change", (event) => {
  sort = (event.target as HTMLSelectElement).value as Sort;
  save("sort", sort);
  render();
});
$("#region").addEventListener("change", (event) => {
  region = (event.target as HTMLSelectElement).value;
  render();
});
$("#online-first").addEventListener("change", (event) => {
  onlineFirst = (event.target as HTMLInputElement).checked;
  save("onlineFirst", onlineFirst);
  render();
});
$("#grid-view").onclick = () => {
  compact = false;
  save("compact", compact);
  render();
};
$("#list-view").onclick = () => {
  compact = true;
  save("compact", compact);
  render();
};
$("#theme-button").onclick = () => {
  const theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("pixel-deck:theme", theme);
  } catch {}
  updateThemeButton();
};
function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === "dark";
  $("#theme-button").innerHTML = icon(dark ? "sun" : "moon");
  $("#theme-button").setAttribute(
    "aria-label",
    dark ? "切换浅色主题" : "切换深色主题",
  );
}
updateThemeButton();
$("#help-button").onclick = () =>
  $("#guide").scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
function finishOrder() {
  editing = false;
  $("#order-hint").hidden = true;
  $("#edit-order").setAttribute("aria-pressed", "false");
  render();
}
$("#edit-order").onclick = () => {
  if (editing) {
    finishOrder();
    return;
  }
  order = sortServers(
    servers,
    sort,
    onlineFirst,
    order.length ? order : config.serverOrder,
  ).map((s) => s.id);
  editing = true;
  sort = "custom";
  onlineFirst = false;
  ($("#sort") as HTMLSelectElement).value = sort;
  ($("#online-first") as HTMLInputElement).checked = false;
  save("order", order);
  save("sort", sort);
  save("onlineFirst", false);
  $("#order-hint").hidden = false;
  $("#edit-order").setAttribute("aria-pressed", "true");
  render();
};
$("#finish-order").onclick = finishOrder;
$("#reset-order").onclick = () => {
  order = [];
  sort = config.serverOrder?.length ? "custom" : "default";
  save("order", order);
  save("sort", sort);
  ($("#sort") as HTMLSelectElement).value = sort;
  finishOrder();
};
app.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("button");
  if (!target) return;
  if (target.dataset.group) {
    group = target.dataset.group;
    renderFilters();
    render();
  }
  if (target.dataset.detail) {
    selected = Number(target.dataset.detail);
    renderDetail();
    const dialog = $("#detail") as HTMLDialogElement;
    if (!dialog.open) dialog.showModal();
    $("#close-detail").focus();
  }
  if (target.dataset.move) {
    const id = Number(target.dataset.move),
      visible = filtered().map((s) => s.id),
      index = visible.indexOf(id),
      next = index + Number(target.dataset.direction);
    if (next < 0 || next >= visible.length) return;
    const complete = sortServers(
      servers,
      "custom",
      false,
      order.length ? order : config.serverOrder,
    ).map((s) => s.id);
    const a = complete.indexOf(id),
      b = complete.indexOf(visible[next]);
    [complete[a], complete[b]] = [complete[b], complete[a]];
    order = complete;
    save("order", order);
    render();
    $("#announcement").textContent = `已移动 ${nameOf(
      servers.find((s) => s.id === id)!,
      config,
    )}`;
  }
  if (target.id === "clear-filters") {
    query = "";
    region = "all";
    group = "all";
    ($("#search") as HTMLInputElement).value = "";
    renderFilters();
    render();
  }
});
$("#detail").addEventListener("click", (event) => {
  if (event.target === $("#detail")) {
    const rect = $("#detail").getBoundingClientRect();
    const m = event as MouseEvent;
    if (
      m.clientX < rect.left ||
      m.clientX > rect.right ||
      m.clientY < rect.top ||
      m.clientY > rect.bottom
    )
      closeDetail();
  }
});
$("#detail").addEventListener("close", () => {
  selected = null;
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "/" &&
    !(event.target instanceof HTMLInputElement) &&
    !(event.target instanceof HTMLSelectElement) &&
    !($("#detail") as HTMLDialogElement).open
  ) {
    event.preventDefault();
    $("#search").focus();
  }
});
async function loadJSON(path: string) {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Request failed");
  return response.json();
}
let socket: WebSocket | null = null,
  retry: ReturnType<typeof setTimeout> | undefined,
  watchdog: ReturnType<typeof setInterval> | undefined,
  firstFrameTimer: ReturnType<typeof setTimeout> | undefined;
let stopped = false,
  frameAt = 0;
function connect() {
  if (stopped) return;
  phase = hasFrame ? "reconnecting" : "connecting";
  render();
  socket = new WebSocket(
    `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/v1/ws/server`,
  );
  firstFrameTimer = setTimeout(() => socket?.close(), 12_000);
  socket.onmessage = (event) => {
    try {
      const data = parseServers(JSON.parse(event.data));
      clearTimeout(firstFrameTimer);
      frameAt = Date.now();
      reconnectAttempt = 0;
      phase = "live";
      receive(data);
    } catch {
      /* Ignore invalid frames; the watchdog reconnects if none are valid. */
    }
  };
  socket.onerror = () => socket?.close();
  socket.onclose = () => {
    clearTimeout(firstFrameTimer);
    if (stopped) return;
    phase = "reconnecting";
    render();
    const delay =
      Math.min(30_000, 1000 * 2 ** Math.min(reconnectAttempt++, 5)) +
      Math.random() * 500;
    retry = setTimeout(connect, delay);
  };
}
async function init() {
  if (demo) {
    config = {
      siteName: "像素探针",
      subtitle:
        "把散落各处的服务器，装进一方像素世界。\n运行状态、资源与流量，一眼有数。",
    };
    groups = demoGroups;
    phase = "demo";
    receive(demoServers());
    setInterval(() => {
      const tick = Math.floor(Date.now() / 2000);
      receive(
        demoServers().map((s, i) =>
          i === 5
            ? s
            : {
                ...s,
                state: {
                  ...s.state,
                  cpu: Math.max(
                    1,
                    finite(s.state?.cpu) + Math.sin(tick + i) * 3,
                  ),
                  net_out_speed:
                    finite(s.state?.net_out_speed) *
                    (1 + Math.sin(tick / 2 + i) * 0.3),
                },
              },
        ),
      );
    }, 2000);
  } else {
    const loaded = await Promise.allSettled([
      loadJSON("/api/v1/setting"),
      loadJSON("/api/v1/server-group"),
      loadJSON("/config.local.json"),
    ]);
    const settings =
      loaded[0].status === "fulfilled" ? loaded[0].value?.data?.config : null;
    config =
      loaded[2].status === "fulfilled" ? parseConfig(loaded[2].value) : {};
    if (!config.siteName && typeof settings?.site_name === "string")
      config.siteName = settings.site_name;
    const rawGroups =
      loaded[1].status === "fulfilled" ? loaded[1].value?.data : null;
    if (Array.isArray(rawGroups))
      groups = rawGroups.filter(
        (g) =>
          g &&
          g.group &&
          Number.isSafeInteger(g.group.id) &&
          typeof g.group.name === "string" &&
          Array.isArray(g.servers),
      );
    if (!order.length && config.serverOrder?.length && sort === "default") {
      sort = "custom";
      ($("#sort") as HTMLSelectElement).value = sort;
    }
    connect();
    watchdog = setInterval(() => {
      if (phase === "live" && Date.now() - frameAt > 15_000) {
        phase = "stale";
        render();
        socket?.close();
      } else if (hasFrame) render();
    }, 5000);
    window.addEventListener("pagehide", () => {
      stopped = true;
      clearTimeout(retry);
      clearTimeout(firstFrameTimer);
      clearInterval(watchdog);
      socket?.close();
    });
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) location.reload();
    });
  }
  $("#site-name").textContent = config.siteName || "PIXEL DECK";
  document.title = `${config.siteName || "Nezha Pixel Deck"} · 像素监控台${demo ? " · 演示" : ""}`;
  if (config.subtitle) $("#subtitle").textContent = config.subtitle;
}
render();
void init();
