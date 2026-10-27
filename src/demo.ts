import type { Group, Server } from "./model";
const GiB = 1024 ** 3;
export const demoGroups: Group[] = [
  { group: { id: 1, name: "亚太节点" }, servers: [101, 102, 103] },
  { group: { id: 2, name: "欧美节点" }, servers: [104, 105, 106] },
];
export function demoServers(): Server[] {
  const specs = [
    ["香港 · 轻云一号", "HK", 4, 8, 80, 18.6, 38, 24, 128],
    ["东京 · 樱花二号", "JP", 2, 4, 60, 32.4, 56, 37, 46],
    ["新加坡 · 狮城三号", "SG", 4, 8, 100, 8.2, 22, 18, 92],
    ["洛杉矶 · 西岸四号", "US", 8, 16, 160, 64.8, 74, 48, 215],
    ["法兰克福 · 莱茵五号", "DE", 2, 4, 80, 12.5, 41, 68, 36],
    ["伦敦 · 雾都六号", "GB", 2, 2, 40, 0, 0, 52, 0],
  ];
  return specs.map((v, i) => {
    const [name, country, cores, mem, disk, cpu, mempct, diskpct, days] = v;
    return {
      id: 101 + i,
      name: String(name),
      country_code: String(country),
      display_index: 60 - i * 10,
      last_active: new Date(
        Date.now() - (i === 5 ? 3600_000 : 1000),
      ).toISOString(),
      public_note: [
        "面向亚太的轻量服务与日常应用。",
        "东亚区域应用与测试环境。",
        "跨区域任务与服务中转。",
        "计算任务与后台工作负载。",
        "欧洲区域服务与异地备份。",
        "计划维护中的备用节点。",
      ][i],
      host: {
        platform: i % 2 ? "ubuntu" : "debian",
        arch: "amd64",
        cpu: [`Demo Virtual CPU ${cores} Virtual Core`],
        mem_total: Number(mem) * GiB,
        disk_total: Number(disk) * GiB,
        swap_total: GiB,
        virtualization: "kvm",
      },
      state: {
        cpu: Number(cpu),
        mem_used: (Number(mem) * GiB * Number(mempct)) / 100,
        disk_used: (Number(disk) * GiB * Number(diskpct)) / 100,
        net_in_speed: i === 5 ? 0 : (i + 1) * 182_548,
        net_out_speed: i === 5 ? 0 : (6 - i) * 320_468,
        net_in_transfer: (i + 1) * 48.2 * GiB,
        net_out_transfer: (i + 1) * 92.6 * GiB,
        uptime: Number(days) * 86400 + 14_400,
        load_1: Number(cpu) / 100,
        load_5: Number(cpu) / 120,
        load_15: Number(cpu) / 130,
        tcp_conn_count: 42 + i * 18,
        udp_conn_count: 8 + i,
        process_count: 100 + i * 12,
      },
    };
  });
}
