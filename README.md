# Clash Verge Rev 全局覆盖脚本 · v3.5

> 针对 **校园网 / 文献与 Zotero / AI 分流 / Steam & 游戏加速器 / CF 验证域名分流** 共存场景的 Clash Verge Rev 覆盖脚本。
>
> A Clash Verge Rev override script for CN campus networks, academic databases, Zotero, residential AI egress, game accelerators and Cloudflare challenge routing.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-Clash%20Verge%20Rev-green)
![Language](https://img.shields.io/badge/language-JavaScript-yellow)
![Version](https://img.shields.io/badge/version-3.5-orange)

## Related Repositories

[VPS-Builder](https://github.com/SehAie/VPS-Builder) - 🚀 一键部署 VPS 的 Windows 命令行工具 | A Windows CLI tool to bootstrap VPS

---

## 📖 目录

- [🆕 v3.5 更新说明](#-v35-更新说明)
- [⚠️ 使用前必读](#️-使用前必读)
- [✨ 功能特性](#-功能特性)
- [🚀 快速开始](#-快速开始)
- [🔧 使用环境](#-使用环境)
- [🏗️ 架构概览](#️-架构概览)
- [📘 功能模块详解](#-功能模块详解)
- [📑 规则优先级顺序](#-规则优先级顺序)
- [🛠️ 自建节点配置](#️-自建节点配置)
- [🔁 切换到其他协议（SS / VMess / VLESS / Trojan 等）](#-切换到其他协议ss--vmess--vless--trojan-等)
- [🚫 不想自建节点？直接使用订阅节点](#-不想自建节点直接使用订阅节点)
- [🔧 维护指南](#-维护指南)
- [❓ 常见问题排查](#-常见问题排查)
- [📎 快速检查清单](#-快速检查清单)
- [🧪 本地验证](#-本地验证)
- [🤝 贡献](#-贡献)
- [📄 License](#-license)
- [⚠️ 免责声明](#️-免责声明)

---

## 🆕 v3.5 更新说明

> **更新于 2026-10-14**，从 v3.0 升级。

### 重大更新

| 更新项 | 说明 |
|--------|------|
| 🌐 **AI DNS 经家宽链路** | 海外 AI 的精确域名与后缀解析策略使用 Cloudflare / Google DoH，并通过 `#AI-HomeIP` 指定出口；单独覆盖 `api.oaistatsig.com` |
| 🏠 **AI 出口收紧** | 默认策略组仅包含 `AI-HomeIP` / `REJECT`；`AI-MyVPS` 作为连接家宽 SOCKS5 的中转节点 |
| 📚 **Zotero / NCBI 支持** | Zotero 官网、同步与附件存储加入 DIRECT + 真实 IP + 系统 DNS；新增 NCBI 域名与 `ascp.exe` 直连规则 |
| 🐉 **国产 AI DNS 显式直连** | 国产 AI 清单同时生成路由、`fake-ip-filter` 和系统 DNS 策略，不再只依赖 GeoSite 收录 |
| 🧠 **DNS 合并约束明确** | DIRECT 出口固定使用系统 DNS；显式要求 `fake-ip-filter-mode: blacklist`，遇到其他模式报错提示 |
| 🎮 **进程直连语义修正** | 保留 Steam / 加速器 `PROCESS-NAME` 规则，停止自动添加 TUN 排除进程；原配置的排除项仍保留 |
| 🧩 **保留订阅指纹选择** | 不再强制写入全局 Chrome TLS 指纹；继续对节点、策略组、规则和过滤项去重合并 |

### 详细变更

**1. AI 流量与 DNS 使用家宽链路**

默认链路为：`AI 请求 → 🤖 AI专属分流 → AI-HomeIP → AI-MyVPS 中转 → 家宽出口`。

海外 AI 的 DoH 查询也固定经过 `AI-HomeIP`。使用 IP 形式的 DoH 地址，避免先解析 DNS 服务器域名。DNS 出口直接引用节点，因此在 AI 策略组中选择 `REJECT` 只会拒绝匹配该组的业务连接，不会关闭该节点上的 DNS 查询。

```js
const aiNameservers = [
  `https://1.1.1.1/dns-query#${HOMEIP_NODE}`,
  `https://8.8.8.8/dns-query#${HOMEIP_NODE}`
];
```

**2. 从 v3.0 迁移时需要注意**

- **默认使用 VPS + 家宽链路**：必须填写两个节点的五个占位符。只用 VPS 或订阅节点时，须同时修改 AI 策略组和 `aiNameservers`，具体步骤见下文。
- **检查 DNS 过滤模式**：未设置模式时按 `blacklist` 处理；已有 `whitelist` 或 `rule` 配置需先转换其语义，不能只改模式名称。
- **检查旧 TUN 排除项**：v3.5 不再新增排除项，也不会删除订阅或客户端中已有的排除项。被排除的进程可能绕过脚本路由，请按需求自行清理旧项。
- **海外 AI 不保证始终返回 fake-ip**：脚本保留订阅过滤项，最终结果取决于合并后的列表。应用自行使用 DoH、未知域名或无法嗅探的连接也不保证被本脚本接管。

**3. 保留并说明原有能力**

保留 HTTP/TLS/QUIC 嗅探、校园/文献/Steam 直连、局域网规则、海外 AI UDP/443 REJECT 和规则前置。新增 `oaistatsig.com`、`openaimerge.com` 两个海外 AI 域名。

QUIC 阻断仅针对已识别海外 AI 域名的 UDP/443，是否回退 TCP 取决于客户端。CF 验证域名仍为 DIRECT，不能保证解决所有网站的风控或验证码问题。

---

## ⚠️ 使用前必读

本脚本中的自建节点信息**已脱敏**：

```js
server: "YOUR_VPS_SERVER_IP_HERE",
password: "YOUR_HYSTERIA2_PASSWORD_HERE",
server: "YOUR_HOMEIP_SOCKS_SERVER_HERE",
username: "YOUR_HOMEIP_USERNAME_HERE",
password: "YOUR_HOMEIP_PASSWORD_HERE",
```

在使用前，你需要任选一种方案：

- **默认方案**：使用 **VPS + 家宽 IP**，填写 `AI-MyVPS` 和 `AI-HomeIP` 的五个占位符
- **仅用 VPS**：按[仅使用 VPS](#仅使用-vps)修改策略组与 AI DNS，删除家宽节点注入
- **其他协议**：参考[协议模板](#-切换到其他协议ss--vmess--vless--trojan-等)替换 VPS 中转节点，家宽节点继续引用 `AI-MyVPS`
- **只用订阅**：按[订阅节点方案](#-不想自建节点直接使用订阅节点)修改节点、策略组和 AI DNS

> 🔐 **安全提示**：真实服务器信息切勿提交到任何公开仓库！

---

## ✨ 功能特性

| 场景 | 需求 | 解决方案 |
|------|------|----------|
| 🔒 CF 验证域名分流 | 避免验证资源误走订阅分组 | 验证域名 DIRECT + 系统 DNS，优先于订阅规则 |
| 🎓 校园网 & 文献下载 | 需走校园 IP 出口才能识别授权 | 域名直连 + 系统 DNS |
| 📚 Zotero / NCBI | 同步、附件存储与科研数据上传 | 域名真实 IP + 系统 DNS；Aspera 进程 DIRECT |
| 🤖 海外 AI 服务 | AI 访问与 DNS 使用家宽链路 | AI 专属策略组 + 经 `AI-HomeIP` 的 DoH |
| 🚧 AI QUIC 限制 | 尽量让 AI 使用 TCP/TLS | 已识别 AI 域名的 UDP/443 REJECT，支持时回退 TCP |
| 🐉 国产 AI | DeepSeek / Kimi / 豆包 等 | 显式 DIRECT + 真实 IP + 系统 DNS |
| 🎮 Steam & 游戏加速器 | 游戏流量按规则直连 | 进程与域名 DIRECT，保留原有 TUN 设置 |
| 🏠 内网设备 | 访问 NAS / 打印机 / 路由器 | 局域网 CIDR 直连 |
| 🔒 DNS 与缓存 | 减少系统 hosts 干扰和映射变化 | 不读取系统 hosts、Mihomo DNS 不返回 AAAA、持久化 fake-ip；不等同于全局禁用 IPv6 |

---

## 🚀 快速开始

### 1. 下载脚本

点击仓库中的 [`override.js`](./override.js) → 右上角 **`Raw`** → 全选复制（`Ctrl+A`、`Ctrl+C`）。

### 2. 粘贴到 Clash Verge Rev

1. 打开 **Clash Verge Rev**
2. 进入 **「订阅」** 页面
3. 右键 **「全局扩展脚本 Script」** 编辑文件
4. 粘贴覆盖脚本内容

### 3. 配置节点信息

根据你的情况任选其一：

- 🏠 **默认 VPS + 家宽链路**：填写 VPS 的两个占位符及家宽 SOCKS5 的三个占位符
- ✅ **仅用 VPS**：填写 VPS 信息后，完成下文[仅使用 VPS](#仅使用-vps)的调整
- 🔁 **用其他协议**：参考下文 [切换到其他协议](#-切换到其他协议ss--vmess--vless--trojan-等)
- 🚫 **不自建**：参考下文 [不想自建节点](#-不想自建节点直接使用订阅节点)

### 4. 启用脚本

- 保存 **「全局扩展脚本 Script」** 即可自动启用

---

## 🔧 使用环境

- **客户端**：[Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev)
- **模式**：规则模式 + TUN（虚拟网卡）
- **建议开启**：开机自启
- **默认节点协议**：Hysteria2（可替换为任意协议，见下文）
- **内核**：使用支持 `direct-nameserver`、DNS `#节点名` 和逻辑组合规则的 Mihomo；字段参考 [DNS 配置](https://wiki.metacubex.one/config/dns/)
- **DNS 过滤模式**：`blacklist`；其他模式会明确报错，需先检查并转换现有过滤配置

---

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────┐
│          全局覆盖脚本（main 函数）v3.5               │
├─────────────────────────────────────────────────────┤
│  1. 基础结构保护 + 去重/合并/upsert 工具函数          │
│  2. 基础优化（store-selected / store-fake-ip）        │
│  3. sniffer 域名嗅探（HTTP / TLS / QUIC）             │
│  4. DNS fake-ip 分层与系统 DNS 兜底                   │
│  5. Steam / 加速器 / Aspera 进程 DIRECT 清单          │
│  6. 注入 VPS 中转 + HomeIP 家宽节点模板               │
│  7. 创建 AI 专属策略组                                │
│  8. 域名清单定义（海外AI / 国产AI / 教育 / 文献）      │
│  9. 海外 AI QUIC / HTTP3 阻断                         │
│ 10. 规则优先级合并并去重                              │
│ 11. fake-ip-filter + nameserver-policy 增强           │
│ 12. 海外 AI DoH 固定经 HomeIP 家宽链路                │
└─────────────────────────────────────────────────────┘
```

---

## 📘 功能模块详解

### 基础配置优化

```js
config.profile["store-selected"] = true;  // 记住节点选择
config.profile["store-fake-ip"] = true;   // 持久化 fake-ip 映射
config.dns["use-system-hosts"] = false;   // 不读取系统 hosts
config.dns.ipv6 = false;                  // Mihomo DNS 不返回 AAAA
```

### 进程直连（`PROCESS-NAME`）

脚本通过规则让以下进程匹配 `DIRECT`，流量仍可能经过 TUN 与 Mihomo 内核。v3.5 不再自动写入 `exclude-process-name`，也不删除已有排除项：

- **Steam 全家桶**：`Steam.exe`、`steamwebhelper.exe` 等
- **加速器**：网易 UU、腾讯加速器、迅游、奇游、雷神、海豚
- **工具**：Steam++ / Watt Toolkit
- **科研上传**：NCBI Aspera 的 `ascp.exe`

### 自建节点注入

通过 `upsertByName` 注入或更新节点，避免多次应用脚本后重复生成节点。默认包含 Hysteria2 VPS 与经 VPS 中转的 HomeIP SOCKS5 模板，其他协议见下文。

### AI 专属策略组

```
名称：🤖 AI专属分流
类型：select（手动选择）
可选：AI-HomeIP / REJECT
```

> 默认只允许家宽出口与业务连接拒绝。DNS 直接引用 `AI-HomeIP`，不跟随此组的选择；需要其他出口时，应同时修改 AI DNS 引用。

### CF 风控 & 验证码域名分流 🆕

**为什么需要？** 订阅规则常将 `challenges.cloudflare.com` 误分配到 `🐟 Copilot` 等不相关的规则，导致 CF Turnstile 验证码加载异常，部分海外网站出现无限循环人机验证。

**解决方案：** 将 Cloudflare Turnstile / Google reCAPTCHA 从订阅规则中独立出来，统一 DIRECT + system DNS，且规则前置确保不会被订阅规则覆盖。这样文献库、校园站点和验证码资源保持同一主体出口，减少 IP 指纹不一致。

| 域名 | 用途 |
|------|------|
| `challenges.cloudflare.com` | Cloudflare Turnstile 验证 |
| `nel.cloudflare.com` / `cloudflareinsights.com` | CF 遥测（参与风控指纹） |
| `recaptcha.net` / `www.recaptcha.net` | Google reCAPTCHA 服务 |

### 域名分流清单

| 列表 | 走向 | 域名数 | 说明 |
|------|------|--------|------|
| `cfChallengeDomains` | DIRECT + 系统 DNS | 5 | CF Turnstile / reCAPTCHA 风控域名 |
| `aiDomainsOverseas` | 🤖 AI专属分流 + 家宽 DoH | 57 | OpenAI / Claude / Gemini / Grok / Perplexity / HuggingFace 等 |
| `aiQuicRejectRules` | REJECT | 跟随海外 AI 域名 | 仅阻断海外 AI UDP/443，促使回退 TCP/TLS |
| `aiDomainsCN` | DIRECT + 系统 DNS | 32 | DeepSeek / Kimi / 通义 / 文心 / 豆包 / 混元 等 |
| `eduDomains` | DIRECT + 系统 DNS | 5 | edu.cn / cernet 等教育网 |
| `literatureDomains` | DIRECT + 系统 DNS | 86 | Zotero、NCBI、知网、WOS、Elsevier、Springer、IEEE、PubMed 等 |
| `steamDomains` | DIRECT + 系统 DNS | 9 | Steam 平台域名 |
| `directProcesses` | DIRECT | 23 | Steam、游戏加速器、Watt Toolkit 与 Aspera |
| `lanCIDRs` / `lanCIDRs6` | DIRECT（no-resolve） | 6 / 3 | 内网 IPv4/IPv6 段 |

### DNS 增强

```
fake-ip-filter     → 国内 / 私有 / 教育 / 文献 / Zotero / Steam / 验证码 / 国产 AI 返回真实 IP
nameserver-policy  → 上述直连域名使用 system；海外 AI 使用经 AI-HomeIP 的 DoH
direct-nameserver  → [system]，direct-nameserver-follow-policy: false
```

> 文献库的机构授权取决于网站看到的出口 IP。系统 DNS 有助于保留校内解析结果，仍需连接有授权的校园网络，或使用学校提供的远程访问方式。系统 DNS 本身不能赋予机构授权。

`default-nameserver`、`proxy-server-nameserver`、`nameserver` 仅在缺失或空数组时补充；`direct-nameserver` 会按脚本策略覆盖。已有订阅过滤项会合并保留，所以海外 AI 不保证始终使用 fake-ip。广告域名加入过滤表只表示返回真实 IP，不执行广告拦截。

---

## 📑 规则优先级顺序

脚本使用 `unique(customRules.concat(config.rules))` 把自定义规则放在订阅规则**最前面**并去重，压过订阅尾部的 `MATCH` 兜底规则：

```
① 局域网 IP-CIDR / IP-CIDR6（no-resolve）
② CF 风控 & 验证码 DIRECT
③ 教育网 / 文献库 / Zotero / Steam 域名 DIRECT
④ 进程名直连（Steam + 加速器 + Aspera）
⑤ 国产 AI DIRECT
⑥ 海外 AI UDP/443 REJECT（阻断 QUIC / HTTP3）
⑦ 海外 AI TCP/TLS → 🤖 AI专属分流
⑧ AI IP 段兜底 → 🤖 AI专属分流
⑨ GEOSITE/GEOIP 国内兜底 DIRECT
⑩ ────── 以下为订阅原规则 ──────
```

---

## 🛠️ 自建节点配置

脚本默认包含两个节点模板：**Hysteria2 VPS 中转**和 **HomeIP SOCKS5 家宽出口**。默认方案必须同时配置两者；仅使用 VPS 时按后面的步骤修改。

```js
const VPS_NODE = "AI-MyVPS";
const HOMEIP_NODE = "AI-HomeIP";

upsertByName(config.proxies, {
  name: VPS_NODE,
  type: "hysteria2",
  server: "YOUR_VPS_SERVER_IP_HERE",
  port: 8443,
  password: "YOUR_HYSTERIA2_PASSWORD_HERE",
  sni: "bing.com",
  "skip-cert-verify": true
});

upsertByName(config.proxies, {
  name: HOMEIP_NODE,
  type: "socks5",
  server: "YOUR_HOMEIP_SOCKS_SERVER_HERE",
  port: 443,
  username: "YOUR_HOMEIP_USERNAME_HERE",
  password: "YOUR_HOMEIP_PASSWORD_HERE",
  udp: false,
  "dialer-proxy": VPS_NODE
});
```

### 字段说明

| 字段 | 占位符 / 默认值 | 说明 | 是否必填 |
|------|----------------|------|---------|
| `AI-MyVPS.server` | `YOUR_VPS_SERVER_IP_HERE` | VPS 的 IP 或域名 | ✅ |
| `AI-MyVPS.password` | `YOUR_HYSTERIA2_PASSWORD_HERE` | Hysteria2 认证密码 | ✅ |
| `AI-MyVPS.sni` | `bing.com` | TLS 伪装域名，可自定义 | ⚠️ 建议 |
| `AI-HomeIP.server` | `YOUR_HOMEIP_SOCKS_SERVER_HERE` | 家宽 SOCKS5 服务器 IP 或域名 | 默认方案必填 |
| `AI-HomeIP.username` | `YOUR_HOMEIP_USERNAME_HERE` | 家宽 SOCKS5 用户名 | 默认方案必填 |
| `AI-HomeIP.password` | `YOUR_HOMEIP_PASSWORD_HERE` | 家宽 SOCKS5 密码 | 默认方案必填 |
| `AI-HomeIP.dialer-proxy` | `AI-MyVPS` | 先经 VPS 隧道连接 HomeIP | 默认方案保留 |

### 替换步骤

1. 打开 `override.js`，定位到 `AI-MyVPS` 和 `AI-HomeIP` 两个节点模板
2. 把 `YOUR_VPS_SERVER_IP_HERE` 替换为你的 VPS 公网 IP 或域名
3. 把 `YOUR_HYSTERIA2_PASSWORD_HERE` 替换为 Hysteria2 认证密码
4. 默认家宽方案继续替换 `YOUR_HOMEIP_*` 三个占位符，并按实际服务修改端口
5. 保存 → 订阅页「重新应用」

### 仅使用 VPS

1. 删除 `upsertByName(config.proxies, { name: HOMEIP_NODE, ... })` 对应的整段家宽节点注入。
2. 将 AI 策略组的列表改为 `proxies: [VPS_NODE, "REJECT"]`。
3. 将 `aiNameservers` 的两个出口引用同时改为 VPS：

```js
const aiNameservers = [
  `https://1.1.1.1/dns-query#${VPS_NODE}`,
  `https://8.8.8.8/dns-query#${VPS_NODE}`
];
```

此时业务连接和 AI DNS 均使用 VPS。不要仅修改策略组，否则 DNS 仍会引用已经删除或未配置的家宽节点。

---

## 🔁 切换到其他协议（SS / VMess / VLESS / Trojan 等）

脚本默认 VPS 模板使用 **Hysteria2**。如果你的服务器使用其他协议，请**完整替换** `upsertByName(config.proxies, { ... })` 里的 `AI-MyVPS` 节点代码为下方对应模板。

> 所有模板保持 `name: "AI-MyVPS"`，这样家宽节点的 `dialer-proxy` 无需修改。默认 AI 策略组仍选择 `AI-HomeIP`；不使用家宽时还需完成上面的“仅使用 VPS”步骤。

### 📦 Shadowsocks (SS)

```js
upsertByName(config.proxies, {
  name: "AI-MyVPS",
  type: "ss",
  server: "YOUR_SERVER_IP",
  port: 8388,
  cipher: "aes-256-gcm",
  password: "YOUR_PASSWORD",
  udp: true
});
```

### 📦 ShadowsocksR (SSR)

```js
upsertByName(config.proxies, {
  name: "AI-MyVPS",
  type: "ssr",
  server: "YOUR_SERVER_IP",
  port: 8388,
  cipher: "aes-256-cfb",
  password: "YOUR_PASSWORD",
  obfs: "plain",
  protocol: "origin"
});
```

### 📦 VMess

```js
upsertByName(config.proxies, {
  name: "AI-MyVPS",
  type: "vmess",
  server: "YOUR_SERVER_IP",
  port: 443,
  uuid: "YOUR_UUID_HERE",
  alterId: 0,
  cipher: "auto",
  tls: true,
  servername: "your.domain.com",
  network: "ws",
  "ws-opts": {
    path: "/path",
    headers: { Host: "your.domain.com" }
  }
});
```

### 📦 VLESS

```js
upsertByName(config.proxies, {
  name: "AI-MyVPS",
  type: "vless",
  server: "YOUR_SERVER_IP",
  port: 443,
  uuid: "YOUR_UUID_HERE",
  tls: true,
  servername: "your.domain.com",
  network: "ws",
  "ws-opts": {
    path: "/path",
    headers: { Host: "your.domain.com" }
  }
});
```

### 📦 Trojan

```js
upsertByName(config.proxies, {
  name: "AI-MyVPS",
  type: "trojan",
  server: "YOUR_SERVER_IP",
  port: 443,
  password: "YOUR_PASSWORD",
  sni: "your.domain.com",
  "skip-cert-verify": false
});
```

### 📦 Hysteria v1

```js
upsertByName(config.proxies, {
  name: "AI-MyVPS",
  type: "hysteria",
  server: "YOUR_SERVER_IP",
  port: 8443,
  "auth-str": "YOUR_AUTH",
  protocol: "udp",
  up: "30 Mbps",
  down: "200 Mbps",
  sni: "bing.com",
  "skip-cert-verify": true
});
```

### 📦 TUIC v5

```js
upsertByName(config.proxies, {
  name: "AI-MyVPS",
  type: "tuic",
  server: "YOUR_SERVER_IP",
  port: 443,
  uuid: "YOUR_UUID",
  password: "YOUR_PASSWORD",
  sni: "your.domain.com",
  "skip-cert-verify": false,
  "congestion-controller": "bbr"
});
```

### 📦 WireGuard

```js
upsertByName(config.proxies, {
  name: "AI-MyVPS",
  type: "wireguard",
  server: "YOUR_SERVER_IP",
  port: 51820,
  "private-key": "YOUR_PRIVATE_KEY",
  "public-key": "SERVER_PUBLIC_KEY",
  ip: "10.0.0.2",
  udp: true
});
```

> 📚 **协议字段完整参考**：[Mihomo Wiki - configuration](https://wiki.metacubex.one/config/proxies/)

---

## 🚫 不想自建节点？直接使用订阅节点

如果你没有 VPS，只想使用订阅里的节点，请按以下步骤修改：

### 第 1 步：删除节点注入代码

在 `override.js` 中找到并**整段删除** `AI-MyVPS` 和 `AI-HomeIP` 两个节点注入代码：

```js
upsertByName(config.proxies, {
  name: VPS_NODE,
  type: "hysteria2",
  server: "YOUR_VPS_SERVER_IP_HERE",
  port: 8443,
  password: "YOUR_HYSTERIA2_PASSWORD_HERE",
  sni: "bing.com",
  "skip-cert-verify": true
});

upsertByName(config.proxies, {
  name: HOMEIP_NODE,
  type: "socks5",
  server: "YOUR_HOMEIP_SOCKS_SERVER_HERE",
  port: 443,
  username: "YOUR_HOMEIP_USERNAME_HERE",
  password: "YOUR_HOMEIP_PASSWORD_HERE",
  udp: false,
  "dialer-proxy": VPS_NODE
});
```

### 第 2 步：修改 AI 策略组

把策略组里的 `proxies` 改为你订阅中的节点名：

```js
upsertByName(config["proxy-groups"], {
  name: AI_GROUP,
  type: "select",
  proxies: [
    "你订阅里的节点名-1",
    "你订阅里的节点名-2",
    "你订阅里的节点名-3",
    "REJECT"
  ]
});
```

### 第 3 步：同步修改 AI DNS 出口

删除家宽节点后，必须将 `aiNameservers` 中的 `#${HOMEIP_NODE}` 改为上一步的 AI 策略组，让 DNS 跟随所选订阅出口：

```js
const aiNameservers = [
  `https://1.1.1.1/dns-query#${AI_GROUP}`,
  `https://8.8.8.8/dns-query#${AI_GROUP}`
];
```

订阅出口需要支持 TCP/TLS 到 DoH 服务。保留 `proxy-server-nameserver` 的独立解析配置，避免解析节点域名时依赖代理自身。

### 第 4 步：查看订阅中的节点名

- Clash Verge Rev → **代理** 页面
- 点击每个节点，节点名就是策略组需要填入的内容
- **完全复制**（包括 emoji 和空格），大小写敏感

### 🎯 进阶：用策略组引用订阅里的分组

如果你订阅里已经有 `🚀 节点选择` 之类的分组，可以直接引用：

```js
proxies: ["🚀 节点选择", "♻️ 自动选择", "REJECT"]
```

完成上面的 DNS 修改后，AI 业务与 DNS 都会跟随所引用分组的出口。选择 `REJECT` 时，两者都会被拒绝；不要引用回 `🤖 AI专属分流` 形成循环。

---

## 🔧 维护指南

### 新增一个海外 AI 服务

在 `aiDomainsOverseas` 数组末尾添加域名即可：

```js
const aiDomainsOverseas = [
  // ...已有内容
  "newai.com"   // ← 新增
];
```

### 新增一个文献数据库

在 `literatureDomains` 中添加：

```js
"newdb.com", "newdb.cn"
```

> ⚠️ 添加后会**自动**进入 `fake-ip-filter` 和 `nameserver-policy`，无需其他操作。

### 新增一个游戏加速器

在 `directProcesses` 中添加进程名即可生成 `PROCESS-NAME` 直连规则；不会自动添加 TUN 进程排除。

### 切换 AI 出口节点

默认只能在 `AI-HomeIP` 与 `REJECT` 之间选择。若增加其他出口，须同步检查 `aiNameservers`：默认 DNS 固定引用 `HOMEIP_NODE`，不会随组选择改变。希望 DNS 跟随策略组时，可按订阅方案改为 `#${AI_GROUP}`，并保留独立的节点域名解析器。

### 更换自建 VPS

修改脚本中 `AI-MyVPS` 节点的 `server` / `port` / `password` 字段。如需切换协议，参考上文 [切换到其他协议](#-切换到其他协议ss--vmess--vless--trojan-等)。

---

## ❓ 常见问题排查

### ❌ 文献库提示"非授权用户"

**原因**：出口 IP 不是校园 IP。
**排查**：
1. 确认校园网已连接（Wi-Fi / 宽带）
2. 在 Clash 的 **连接** 页搜索文献域名，查看是否匹配到 `DIRECT`
3. 在 cmd 执行 `nslookup www.cnki.net`，确认返回的是校园网 DNS 解析结果

### ❌ ChatGPT 无法访问

**排查**：
1. 面板 → 代理 → `🤖 AI专属分流` 选择了节点（不是 `REJECT`）
2. 默认链路需要 VPS 与家宽 SOCKS5 都可用，检查五个占位符及端口是否配置完成
3. 检查 `chatgpt.com` 规则是否匹配到该策略组；查看 DNS 日志是否存在 DoH 连接失败
4. 若仅用 VPS / 订阅节点，确认 AI DNS 中没有遗留 `#AI-HomeIP` 引用

### ❌ CF Turnstile 验证码无限循环

**原因**：`challenges.cloudflare.com` 被订阅规则误分配到不合适的出口，或验证码资源与主体站点出口不一致。
**排查**：
1. Clash 的 **连接** 页搜索 `challenges.cloudflare`，确认是否匹配到 `DIRECT`
2. 文献/校园站点也走 DIRECT；AI 主站走代理时，两者出口可能不同，需按具体网站调整验证域名策略
3. 检查最终配置中是否有后续覆写重新排列规则；域名分流不能保证通过所有风控验证

### ❌ 节点注入失败 / 启动报错

**排查**：
1. 确认 `type` 字段与你的协议匹配（`hysteria2` ≠ `hysteria` ≠ `vmess`）
2. 检查必填字段是否齐全（不同协议字段不同）
3. Clash 日志页查看具体错误信息

### ❌ Steam 下载速度异常

**排查**：
1. 任务管理器查看 Steam 进程名是否与 `directProcesses` 一致
2. 在连接页确认进程或域名命中 `DIRECT`；v3.5 不自动添加 TUN 排除项
3. 检查客户端与加速器的虚拟网卡配置；已有排除项可能让流量绕开脚本，需要按实际需求调整

### ❌ 内网设备（NAS / 打印机）无法访问

**原因**：TUN 劫持了局域网流量。
**验证**：脚本已内置 `lanCIDRs` 直连规则，若仍无法访问，请确认 Clash Verge 的 **"绕过局域网"** 开关已打开。

### ❌ 脚本报错 / 不生效

1. 打开 Clash Verge → **设置 → 日志** 查看报错信息
2. 检查是否有语法错误（逗号、引号、括号）
3. 点击订阅右上角 **"重新应用"** 按钮刷新覆盖脚本

### ❌ 提示 `fake-ip-filter-mode: blacklist`

脚本检测到订阅使用 `whitelist` / `rule` 等其他过滤模式。请先按当前模式检查并转换过滤列表，再使用 blacklist 版本；仅改模式名会改变原列表的含义。

### ❌ AI 实时语音 / WebRTC 异常

AI 域名 UDP/443 会被拒绝，家宽 SOCKS5 模板也设置了 `udp: false`。实时音视频可能使用其他 UDP 端口或动态域名，不保证支持。请结合连接日志和客户端回退能力排查，不能将此配置视为完整的 UDP 或泄漏防护方案。

---

## 📎 快速检查清单

- [ ] 开机自启已开启
- [ ] TUN 模式已开启
- [ ] "绕过局域网"已开启
- [ ] 订阅已更新到最新
- [ ] 覆盖脚本已启用
- [ ] 节点占位符已替换（或已切换到订阅节点方案）
- [ ] AI 策略组已选中节点
- [ ] AI DNS 出口与所用方案一致，不引用已删除的节点
- [ ] DNS 过滤模式为 blacklist，已检查继承的过滤项
- [ ] 已检查旧 TUN 排除进程是否符合当前需求
- [ ] 系统 DNS 为校园网自动获取（非手动 8.8.8.8）

---

## 🧪 本地验证

使用 Node.js 22 或更新版本，无需安装依赖：

```sh
node --check override.js
node --test tests/override.test.cjs
```

测试覆盖 AI 与国产 AI DNS、Zotero / NCBI 直连、进程规则、过滤模式保护、订阅配置合并、规则优先级、重复应用与公开节点占位符。测试验证配置生成逻辑；实际线路可用性、校园授权和网站风控仍需在自己的 Clash Verge Rev 环境验证。

---

## 🤝 贡献

欢迎 Issue / PR 补充：

- 新增文献数据库域名
- 新增 AI 服务域名
- 新增 CF 风控相关域名
- 新增游戏加速器进程名
- 其他协议模板 / 分流场景

---

## 📄 License

本项目采用 [MIT License](./LICENSE) 开源协议。

作者：**Sehaie**

---

## ⚠️ 免责声明

- 本脚本仅供个人学习、研究、科研与合法场景使用
- 使用本脚本所产生的任何后果由使用者自行承担
- 请遵守所在地的法律法规及所在学校 / 机构的网络使用条款
- 切勿将本脚本用于任何违法活动

---
