# Clash Verge Rev 全局覆盖脚本 · v3.0

> 针对 **校园网 / 文献下载 / AI 分流 / Steam & 游戏加速器 / CF风控绕过** 共存场景的 Clash Verge Rev 覆盖脚本。
>
> A Clash Verge Rev override script for CN campus network, academic databases, AI routing, game accelerator coexistence & Cloudflare challenge bypass.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-Clash%20Verge%20Rev-green)
![Language](https://img.shields.io/badge/language-JavaScript-yellow)
![Version](https://img.shields.io/badge/version-3.0-orange)

## Related Repositories
[VPS-Builder](https://github.com/SehAie/VPS-Builder) - 🚀 一键部署 VPS 的 Windows 命令行工具 | A Windows CLI tool to bootstrap VPS

---

## 📖 目录

- [🆕 v3.0 更新说明](#-v30-更新说明)
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
- [🤝 贡献](#-贡献)
- [📄 License](#-license)
- [⚠️ 免责声明](#️-免责声明)

---

## 🆕 v3.0 更新说明

> **发布于 2026-06-22**

### 重大更新

| 更新项 | 说明 |
|--------|------|
| 🧠 **fake-ip DNS 分层重构** | 启用 fake-ip 模式，国内/私有/文献/教育/Steam/验证码域名走 real-ip + system DNS，海外 AI 域名保留 fake-ip 并进入专属出口 |
| 🛰️ **域名嗅探增强** | 开启 HTTP/TLS/QUIC sniffer，TUN 下的纯 IP 连接也能通过 SNI 还原域名后命中规则 |
| 🏠 **VPS + 家宽 IP 双出口模板** | 新增 HomeIP SOCKS5 节点模板，可经 Hysteria2 VPS `dialer-proxy` 中转，AI 策略组可在 HomeIP/VPS/REJECT 间选择 |
| 🚧 **海外 AI QUIC 阻断** | 仅对海外 AI 域名的 UDP/443 生成 REJECT 规则，促使浏览器回退 TCP/TLS，减少 HTTP/3/QUIC 绕过专属出口 |
| 🧩 **合并逻辑更安全** | 使用 `upsertByName` 和去重合并，避免重复注入节点/策略组/规则，也不覆盖原配置已有的 TUN 排除项 |

### 详细变更

**1. DNS 与 sniffer 完整重构**

v3.0 将 DNS 策略明确拆成两层：海外 AI 域名保持 fake-ip，确保进入 `🤖 AI专属分流`；国内、私有、文献、教育、Steam 和验证码域名进入 `fake-ip-filter` 与 `nameserver-policy`，尽量使用系统 DNS 与真实 IP。

同时启用 HTTP/TLS/QUIC 嗅探，TUN 模式下即使应用先连接 IP，也能尽量从 SNI 还原域名并命中域名规则。

```js
config.dns["enhanced-mode"] = "fake-ip";
config.dns["fake-ip-filter"].push("geosite:cn", "geosite:private");
config.dns["nameserver-policy"]["geosite:cn"] = "system";
```

**2. 双出口节点模板**

公开模板保留两个可选节点：

- `AI-MyVPS`：Hysteria2 VPS 基础节点
- `AI-HomeIP`：经 `AI-MyVPS` 中转的 SOCKS5 家宽 IP 节点，`udp: false`，避免 QUIC/UDP 泄漏

`🤖 AI专属分流` 默认包含 `AI-HomeIP`、`AI-MyVPS` 和 `REJECT`，可按自己的线路选择。

**3. 规则优先级重组**

```
v2:  CF验证 → 局域网 → 教育/文献/Steam → 国产AI → 海外AI
v3:  局域网 → CF验证 → 教育/文献/Steam → 进程 → 国产AI → AI QUIC阻断 → 海外AI → AI IP兜底 → 国内兜底
```

局域网 IP 段优先直连；CF / reCAPTCHA 验证域名改为 DIRECT，与文献/校园主体流量同出口，减少验证码场景的 IP 指纹不一致。

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

- **方案 A**：只使用 **Hysteria2 VPS**，填写 `AI-MyVPS` 并在策略组中选择它
- **方案 B**：使用 **VPS + 家宽 IP**，同时填写 `AI-MyVPS` 和 `AI-HomeIP`
- **方案 C**：把节点注入改成 **其他协议**（SS / VMess / VLESS / Trojan 等，见下文模板）
- **方案 D**：完全**不自建**，只用现用订阅里的节点（见下文"不想自建节点？"章节）

> 🔐 **安全提示**：真实服务器信息切勿提交到任何公开仓库！

---

## ✨ 功能特性

| 场景 | 需求 | 解决方案 |
|------|------|----------|
| 🔒 CF 风控绕过 | Turnstile / reCAPTCHA 国别检测 | 验证域名 DIRECT + 系统 DNS，压过订阅误匹配 |
| 🎓 校园网 & 文献下载 | 需走校园 IP 出口才能识别授权 | 域名直连 + 系统 DNS |
| 🤖 海外 AI 服务 | ChatGPT / Claude / Gemini 等被封锁 | fake-ip + AI 专属出口 |
| 🚧 AI QUIC 防漏 | HTTP/3/QUIC 可能绕过策略组 | 海外 AI UDP/443 精准 REJECT，回退 TCP/TLS |
| 🐉 国产 AI | DeepSeek / Kimi / 豆包 等 | 直连，避免绕路 |
| 🎮 Steam & 游戏加速器 | 避免与 TUN 冲突 | 进程排除 + 域名直连 |
| 🏠 内网设备 | 访问 NAS / 打印机 / 路由器 | 局域网 CIDR 直连 |
| 🔒 隐私保护 | 防 IPv6 泄漏、hosts 污染、fake-ip 抖动 | IPv6 DNS 关闭 + fake-ip 映射持久化 |

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

- ✅ **用 Hysteria2 VPS**：替换脚本中的 `YOUR_VPS_SERVER_IP_HERE` 和 `YOUR_HYSTERIA2_PASSWORD_HERE`
- 🏠 **用家宽 IP**：继续填写 `YOUR_HOMEIP_SOCKS_SERVER_HERE`、`YOUR_HOMEIP_USERNAME_HERE` 和 `YOUR_HOMEIP_PASSWORD_HERE`
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

---

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────┐
│          全局覆盖脚本（main 函数）v3.0               │
├─────────────────────────────────────────────────────┤
│  1. 基础结构保护 + 去重/合并/upsert 工具函数          │
│  2. 基础优化（store-selected / fake-ip / 指纹）       │
│  3. sniffer 域名嗅探（HTTP / TLS / QUIC）             │
│  4. DNS fake-ip 分层与系统 DNS 兜底                   │
│  5. TUN 排除进程合并                                  │
│  6. 注入 VPS + HomeIP 双节点模板                      │
│  7. 创建 AI 专属策略组                                │
│  8. 域名清单定义（海外AI / 国产AI / 教育 / 文献）      │
│  9. 海外 AI QUIC / HTTP3 阻断                         │
│ 10. 规则优先级合并并去重                              │
│ 11. fake-ip-filter + nameserver-policy 增强           │
└─────────────────────────────────────────────────────┘
```

---

## 📘 功能模块详解

### 基础配置优化

```js
config.profile["store-selected"] = true;  // 记住节点选择
config.profile["store-fake-ip"] = true;   // 持久化 fake-ip 映射
config.dns["use-system-hosts"] = false;   // 防 hosts 污染
config.dns.ipv6 = false;                  // 禁用 IPv6 DNS，防泄漏
```

### TUN 排除进程（`exclude-process-name`）

让**游戏加速器、Steam**等自带虚拟网卡的软件完全绕开 Clash 的 TUN，避免双网卡冲突：

- **Steam 全家桶**：`Steam.exe`、`steamwebhelper.exe` 等
- **加速器**：网易 UU、腾讯加速器、迅游、奇游、雷神、海豚
- **工具**：Steam++ / Watt Toolkit

### 自建节点注入

通过 `upsertByName` 注入或更新节点，避免多次应用脚本后重复生成节点。默认包含 Hysteria2 VPS 与经 VPS 中转的 HomeIP SOCKS5 模板，其他协议见下文。

### AI 专属策略组

```
名称：🤖 AI专属分流
类型：select（手动选择）
可选：AI-HomeIP / AI-MyVPS / REJECT
```

> 💡 **不含 DIRECT**，避免因误选导致 AI 请求走本地泄漏身份；`REJECT` 提供紧急熔断。

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
| `aiDomainsOverseas` | 🤖 AI专属分流 | ~60 | OpenAI / Claude / Gemini / Grok / Perplexity / HuggingFace 等 |
| `aiQuicRejectRules` | REJECT | 跟随海外 AI 域名 | 仅阻断海外 AI UDP/443，促使回退 TCP/TLS |
| `aiDomainsCN` | DIRECT | ~35 | DeepSeek / Kimi / 通义 / 文心 / 豆包 / 混元 等 |
| `eduDomains` | DIRECT + 系统 DNS | 5 | edu.cn / cernet 等教育网 |
| `literatureDomains` | DIRECT + 系统 DNS | ~95 | 知网、万方、WOS、Elsevier、Springer、IEEE、PubMed、PNAS、Cell、JAMA 等 |
| `steamDomains` | DIRECT + 系统 DNS | 9 | Steam 平台域名 |
| `directProcesses` | DIRECT | 20+ | Steam 与主流游戏加速器进程名 |
| `lanCIDRs` / `lanCIDRs6` | DIRECT（no-resolve） | 6 / 3 | 内网 IPv4/IPv6 段 |

### DNS 增强

```
fake-ip-filter     → 国内 / 私有 / 教育 / 文献 / Steam / 验证码域名跳过 fake-ip
nameserver-policy  → 国内 / 私有 / 教育 / 文献 / Steam / 验证码域名强制使用「系统 DNS」
```

> ⚠️ **关键点**：文献库通过 IP 识别校园授权，必须让校园网 DHCP 下发的 DNS 去解析，拿到校内解析结果，出口才能被识别为校内 IP。

---

## 📑 规则优先级顺序

脚本使用 `unique(customRules.concat(config.rules))` 把自定义规则放在订阅规则**最前面**并去重，压过订阅尾部的 `MATCH` 兜底规则：

```
① 局域网 IP-CIDR / IP-CIDR6（no-resolve）
② CF 风控 & 验证码 DIRECT
③ 教育网 / 文献库 / Steam 域名 DIRECT
④ 进程名直连（Steam + 加速器）
⑤ 国产 AI DIRECT
⑥ 海外 AI UDP/443 REJECT（阻断 QUIC / HTTP3）
⑦ 海外 AI TCP/TLS → 🤖 AI专属分流
⑧ AI IP 段兜底 → 🤖 AI专属分流
⑨ GEOSITE/GEOIP 国内兜底 DIRECT
⑩ ────── 以下为订阅原规则 ──────
```

---

## 🛠️ 自建节点配置

脚本默认包含两个节点模板：**Hysteria2 VPS** 和 **HomeIP SOCKS5**。只使用 VPS 时，填写 `AI-MyVPS` 后在策略组里选择 `AI-MyVPS` 即可；使用家宽 IP 时，再填写 `AI-HomeIP`。

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
| `AI-HomeIP.server` | `YOUR_HOMEIP_SOCKS_SERVER_HERE` | 家宽 SOCKS5 服务器 IP 或域名 | 仅家宽方案 |
| `AI-HomeIP.username` | `YOUR_HOMEIP_USERNAME_HERE` | 家宽 SOCKS5 用户名 | 仅家宽方案 |
| `AI-HomeIP.password` | `YOUR_HOMEIP_PASSWORD_HERE` | 家宽 SOCKS5 密码 | 仅家宽方案 |
| `AI-HomeIP.dialer-proxy` | `AI-MyVPS` | 先经 VPS 隧道连接 HomeIP | 仅家宽方案 |

### 替换步骤

1. 打开 `override.js`，定位到 `AI-MyVPS` 和 `AI-HomeIP` 两个节点模板
2. 把 `YOUR_VPS_SERVER_IP_HERE` 替换为你的 VPS 公网 IP 或域名
3. 把 `YOUR_HYSTERIA2_PASSWORD_HERE` 替换为 Hysteria2 认证密码
4. 如使用家宽 IP，继续替换 `YOUR_HOMEIP_*` 三个占位符
5. 保存 → 订阅页「重新应用」

---

## 🔁 切换到其他协议（SS / VMess / VLESS / Trojan 等）

脚本默认 VPS 模板使用 **Hysteria2**。如果你的服务器使用其他协议，请**完整替换** `upsertByName(config.proxies, { ... })` 里的 `AI-MyVPS` 节点代码为下方对应模板。

> 💡 所有模板都保持 `name: "AI-MyVPS"`，这样 AI 策略组无需修改即可识别。

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

### 第 3 步：查看订阅中的节点名

- Clash Verge Rev → **代理** 页面
- 点击每个节点，节点名就是策略组需要填入的内容
- **完全复制**（包括 emoji 和空格），大小写敏感

### 🎯 进阶：用策略组引用订阅里的分组

如果你订阅里已经有 `🚀 节点选择` 之类的分组，可以直接引用：

```js
proxies: ["🚀 节点选择", "♻️ 自动选择", "REJECT"]
```

这样切换订阅分组时，AI 分流会自动跟随。

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

在 `directProcesses` 中添加进程名即可。脚本会同时把它合并进 TUN 排除进程，并生成 `PROCESS-NAME` 直连规则。

### 切换 AI 出口节点

在 `🤖 AI专属分流` 策略组中，手动选择其他订阅节点即可（`store-selected` 会记住选择）。

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
2. 测试节点延迟是否正常
3. 检查 `chatgpt.com` 规则是否匹配到该策略组

### ❌ CF Turnstile 验证码无限循环 🆕

**原因**：`challenges.cloudflare.com` 被订阅规则误分配到不合适的出口，或验证码资源与主体站点出口不一致。
**排查**：
1. Clash 的 **连接** 页搜索 `challenges.cloudflare`，确认是否匹配到 `DIRECT`
2. 确认当前网络出口与正在访问的主体站点场景一致
3. 若仍异常，检查订阅规则中是否有 `DOMAIN,challenges.cloudflare.com` 覆盖了脚本规则（脚本已置顶，理论上不会）

### ❌ 节点注入失败 / 启动报错

**排查**：
1. 确认 `type` 字段与你的协议匹配（`hysteria2` ≠ `hysteria` ≠ `vmess`）
2. 检查必填字段是否齐全（不同协议字段不同）
3. Clash 日志页查看具体错误信息

### ❌ Steam 下载速度异常

**排查**：
1. 任务管理器查看 Steam 进程名是否与 `directProcesses` 一致
2. 确认 TUN 的 `exclude-process-name` 已生效（重启 Clash）
3. 必要时在 GUI 内开启 **TUN Bypass** 增强

### ❌ 内网设备（NAS / 打印机）无法访问

**原因**：TUN 劫持了局域网流量。
**验证**：脚本已内置 `lanCIDRs` 直连规则，若仍无法访问，请确认 Clash Verge 的 **"绕过局域网"** 开关已打开。

### ❌ 脚本报错 / 不生效

1. 打开 Clash Verge → **设置 → 日志** 查看报错信息
2. 检查是否有语法错误（逗号、引号、括号）
3. 点击订阅右上角 **"重新应用"** 按钮刷新覆盖脚本

---

## 📎 快速检查清单

- [ ] 开机自启已开启
- [ ] TUN 模式已开启
- [ ] "绕过局域网"已开启
- [ ] 订阅已更新到最新
- [ ] 覆盖脚本已启用
- [ ] 节点占位符已替换（或已切换到订阅节点方案）
- [ ] AI 策略组已选中节点
- [ ] 系统 DNS 为校园网自动获取（非手动 8.8.8.8）

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
