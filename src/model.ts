export interface Host {
  platform?: string;
  platform_version?: string;
  cpu?: string[];
  mem_total?: number;
  disk_total?: number;
  swap_total?: number;
  arch?: string;
  virtualization?: string;
  version?: string;
}
export interface State {
  cpu?: number;
  mem_used?: number;
  disk_used?: number;
  swap_used?: number;
  net_in_speed?: number;
  net_out_speed?: number;
  net_in_transfer?: number;
  net_out_transfer?: number;
  uptime?: number;
  load_1?: number;
  load_5?: number;
  load_15?: number;
  tcp_conn_count?: number;
  udp_conn_count?: number;
  process_count?: number;
}
export interface Server {
  id: number;
  name: string;
  display_index?: number;
  country_code?: string;
  last_active?: string;
  public_note?: string;
  host?: Host | null;
  state?: State | null;
}
export interface Group {
  group: { id: number; name: string };
  servers: number[];
}
export interface Config {
  siteName?: string;
  serverOrder?: number[];
  aliases?: Record<string, string>;
  descriptions?: Record<string, string>;
}
export type Sort =
  | "default"
  | "name"
  | "region"
  | "cpu"
  | "memory"
  | "traffic"
  | "uptime"
  | "custom";
export const sorts: Record<Sort, string> = {
  default: "面板顺序",
  name: "名称 A → Z",
  region: "地区顺序",
  cpu: "CPU 从高到低",
  memory: "内存从高到低",
  traffic: "流量从高到低",
  uptime: "运行时间从长到短",
  custom: "我的顺序",
};
export function finite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}
export function percent(used: unknown, total: unknown): number | null {
  return finite(total) > 0
    ? Math.min(100, (finite(used) / finite(total)) * 100)
    : null;
}
export function isOnline(server: Server, now = Date.now()): boolean {
  const stamp = Date.parse(server.last_active || "");
  return (
    !!server.state &&
    Number.isFinite(stamp) &&
    now - stamp <= 30_000 &&
    now - stamp >= -300_000
  );
}
export function bytes(value: unknown): string {
  let n = finite(value);
  const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 || n >= 100 ? 0 : 1)} ${units[i]}`;
}
export function uptime(value: unknown): string {
  const n = finite(value);
  if (n >= 86400)
    return `${Math.floor(n / 86400)} 天 ${Math.floor((n % 86400) / 3600)} 时`;
  if (n >= 3600)
    return `${Math.floor(n / 3600)} 时 ${Math.floor((n % 3600) / 60)} 分`;
  return `${Math.floor(n / 60)} 分`;
}
export function nameOf(s: Server, config: Config): string {
  return config.aliases?.[s.id] || s.name || `节点 ${s.id}`;
}
export function sortServers(
  servers: Server[],
  sort: Sort,
  onlineFirst: boolean,
  order: number[] = [],
  now = Date.now(),
  config: Config = {},
): Server[] {
  const indexes = new Map(order.map((id, index) => [id, index]));
  const priority = (s: Server) =>
    typeof s.display_index === "number" && Number.isFinite(s.display_index)
      ? s.display_index
      : 0;
  const fallback = (a: Server, b: Server) =>
    priority(b) - priority(a) || a.id - b.id;
  return [...servers].sort((a, b) => {
    if (onlineFirst) {
      const status = Number(isOnline(b, now)) - Number(isOnline(a, now));
      if (status) return status;
    }
    let comparison = 0;
    if (sort === "name")
      comparison = nameOf(a, config).localeCompare(nameOf(b, config), "zh-CN", {
        numeric: true,
      });
    else if (sort === "region")
      comparison = (a.country_code || "ZZ").localeCompare(
        b.country_code || "ZZ",
      );
    else if (sort === "cpu")
      comparison = finite(b.state?.cpu) - finite(a.state?.cpu);
    else if (sort === "memory")
      comparison =
        (percent(b.state?.mem_used, b.host?.mem_total) ?? -1) -
        (percent(a.state?.mem_used, a.host?.mem_total) ?? -1);
    else if (sort === "traffic")
      comparison =
        finite(b.state?.net_in_transfer) +
        finite(b.state?.net_out_transfer) -
        finite(a.state?.net_in_transfer) -
        finite(a.state?.net_out_transfer);
    else if (sort === "uptime")
      comparison = finite(b.state?.uptime) - finite(a.state?.uptime);
    else if (sort === "custom")
      comparison =
        (indexes.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (indexes.get(b.id) ?? Number.MAX_SAFE_INTEGER);
    return comparison || fallback(a, b);
  });
}
export function escapeHTML(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function parseServers(raw: unknown): Server[] {
  const object = raw as {
    data?: { servers?: unknown };
    servers?: unknown;
  } | null;
  const candidate = object?.data?.servers ?? object?.servers;
  if (!Array.isArray(candidate)) throw new Error("Invalid server stream");
  const seen = new Set<number>();
  return candidate.filter((s): s is Server => {
    if (
      !s ||
      typeof s !== "object" ||
      !Number.isSafeInteger(s.id) ||
      s.id < 0 ||
      seen.has(s.id)
    )
      return false;
    if (typeof s.name !== "string") return false;
    if (s.host != null && (typeof s.host !== "object" || Array.isArray(s.host)))
      return false;
    if (
      s.state != null &&
      (typeof s.state !== "object" || Array.isArray(s.state))
    )
      return false;
    seen.add(s.id);
    return true;
  });
}
export function parseConfig(raw: unknown): Config {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const config: Config = {};
  for (const key of ["siteName"] as const)
    if (typeof r[key] === "string") config[key] = r[key];
  if (Array.isArray(r.serverOrder))
    config.serverOrder = [
      ...new Set(
        r.serverOrder.filter((n) => Number.isSafeInteger(n) && n >= 0),
      ),
    ];
  for (const key of ["aliases", "descriptions"] as const) {
    const value = r[key];
    if (value && typeof value === "object" && !Array.isArray(value))
      config[key] = Object.fromEntries(
        Object.entries(value).filter(
          ([k, v]) => /^\d+$/.test(k) && typeof v === "string",
        ),
      );
  }
  return config;
}

export function cpuCount(cpu: unknown): number | null {
  if (
    !Array.isArray(cpu) ||
    !cpu.length ||
    cpu.some((s) => typeof s !== "string")
  )
    return null;
  const counts = cpu.map(
    (s) => s.match(/(\d+)\s+(?:Virtual|Physical)\s+Core/i)?.[1],
  );
  if (counts.every(Boolean))
    return counts.reduce((sum, n) => sum + Number(n), 0);
  return cpu.length > 1 ? cpu.length : null;
}
export function publicDescription(note: unknown): string {
  if (typeof note !== "string") return "";
  try {
    const parsed = JSON.parse(note);
    if (parsed && typeof parsed === "object") {
      const plan = parsed.planDataMod;
      if (plan && typeof plan === "object")
        return [plan.extra, plan.networkRoute, plan.bandwidth, plan.trafficVol]
          .filter((v) => typeof v === "string" && v.trim())
          .join(" · ");
      return typeof parsed.description === "string" ? parsed.description : "";
    }
  } catch {
    /* Ordinary notes are plain text. */
  }
  return note;
}
