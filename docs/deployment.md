# 安装、更新与回滚

## 兼容范围

本主题连接哪吒 v2 的以下同源接口：

- `GET /api/v1/setting`：站点名称。
- `GET /api/v1/server-group`：当前访问权限下的分组。
- `WS /api/v1/ws/server`：实时节点、硬件和状态。

支持形如 `{ "servers": [...] }` 或 `{ "data": { "servers": [...] } }` 的实时帧。以哪吒后端过滤后的节点清单为准。未实现独立登录页面；管理入口指向现有 `/dashboard/`，登录和权限由原后台处理。本主题覆盖用户首页与节点详情，不提供官方主题的服务监控图、网络探测图、流量账单和历史时序查询；管理后台仍可访问。

已验证哪吒 Dashboard v2.4.1 的原生部署及默认 `user_template: user-dist`。其他 v2 版本需要确认后端支持从工作目录读取用户模板。本项目不兼容 v0 模板系统。

## 本地演示

```sh
npm ci
npm run dev
```

打开终端显示的本机地址，加上 `/?demo=1`。实时模式必须与哪吒部署在同一站点；普通本地 Vite 服务不代理生产面板，也没有默认生产地址。

## 原生部署

```sh
npm ci
npm run build
sudo python3 scripts/install.py --dashboard-dir /opt/nezha/dashboard --dist dist
```

`--dashboard-dir` 必须是实际的哪吒工作目录，包含 `app` 和 `data/`。确认 `data/config.yaml` 的 `user_template` 为 `user-dist`。安装脚本只安装静态文件，不改配置文件、不操作数据库、不重启任何服务。

脚本把构建文件放到 `pixel-deck-releases/<时间戳>/`，将工作目录的 `user-dist` 软链接指向新版本。已有目录会移到 `pixel-deck-backups/`；已有软链接的目标记录到私有安装记录中。更新时保留既有 `config.local.json`。备份与旧版本需按自己的磁盘策略维护，脚本不会自动删除。

浏览器打开面板，确认站点标题、节点数量和实时状态正确。检查 `/dashboard/` 原管理后台仍可使用。如果前面有缓存代理，请清除首页缓存；不要缓存 WebSocket 和 API。

## 站点定制

```sh
sudo cp /opt/nezha/dashboard/user-dist/config.example.json /opt/nezha/dashboard/user-dist/config.local.json
sudoedit /opt/nezha/dashboard/user-dist/config.local.json
```

| 字段 | 用途 |
| --- | --- |
| `siteName` | 标题；不填则读取后台站点名称 |
| `subtitle` | 首页说明，支持 `\n` 换行 |
| `serverOrder` | 默认节点 ID 顺序，新节点按后台权重追加 |
| `aliases` | 节点 ID 到展示名称的映射 |
| `descriptions` | 节点 ID 到公开说明的映射 |

配置是公开的，不放 IP、密码、Token、账单或私有运维备注。别名仅改变展示，不会阻止直接读取后端节点原名。配置应保存在部署机器上或单独的私有仓库；不要提交到本项目。

后台顺序优先级：访客自己的「我的顺序」→ 站点 `serverOrder` → 后台 `display_index` 降序、ID 升序。用户选定其他排序后，按其选择执行。「在线优先」在排序前先区分在线 / 离线。通过浏览器本地存储保留主题、视图、排序和节点 ID；不保存监控读数。

## 容器部署

先在宿主机构建主题，把 `dist` 挂载到容器的哪吒**实际工作目录**下的 `user-dist`，例如工作目录为 `/dashboard` 时：

```yaml
# 合并到现有哪吒 Compose 服务，不另建面板、不替换现有数据卷。
volumes:
  - ./pixel-dist:/dashboard/user-dist:ro
```

必须通过现有容器的 `WorkingDir` 或 `docker inspect` 确认路径，不能假定所有镜像均为 `/dashboard`。新挂载需要重建对应容器才能生效，按自己的维护计划操作。确认后端模板设置为 `user-dist`。

## 回滚

安装完成时打印旧目标，并写到工作目录 `pixel-deck-backups/<时间戳>/install-manifest.private.json`。若原来没有本地覆盖，可将 `user-dist` 软链接改名为 `user-dist.disabled`，后端恢复内置官方静态资源；不需要删除发布目录。若原来已有主题，把 `user-dist` 指回旧目标即可。变更前先确认该路径确实是本安装器创建的软链接。

```sh
# 仅适用于原来没有 user-dist 本地覆盖的安装。
cd /opt/nezha/dashboard
sudo test -L user-dist
sudo mv user-dist user-dist.disabled
```

若已存在 `user-dist.disabled`，请使用新的备份名称，避免覆盖。

## 反向代理

沿用哪吒原有代理。确保 `/api/v1/ws/server` 允许 WebSocket Upgrade，且具有足够长的读超时。主题与 API 共用 HTTPS 源，不添加 CORS 放行或把探针端口暴露到公网。静态资源文件名含内容哈希，可以长期缓存；HTML、站点配置和 API 应重新校验或禁止缓存。

## 指标说明

- CPU：探针上报的百分比；首页平均值为在线节点的算术平均，不按核心数加权。
- 内存、磁盘：已用 / 总量。未知总量显示 `—`，不会当作 0%。
- 上下行：服务器接收 / 发送速率，采用 B、KiB、MiB 等字节单位，不能直接当作 Mbps。
- 累计流量：接收与发送计数合计，通常在系统重启后归零；不是月度套餐用量。
- 在线：最近 30 秒有有效上报且实时连接正常。无有效帧超过 15 秒会主动重连，失败按 1–30 秒退避。
- 趋势：最多 30 次本次会话采样，图表纵轴自动缩放；刷新页面清空，不是持久历史。
- 旧主题套餐备注：仅提取套餐说明、线路、带宽与流量文字；不解析付款、续费或价格。纯文本备注按文字显示，不执行 HTML。
