# Clash Verge Rev 全局覆盖脚本

> 针对 **校园网 / 文献下载 / AI 分流 / Steam & 游戏加速器** 共存场景的 Clash Verge Rev 覆盖脚本。
> 
> A Clash Verge Rev override script for CN campus network, academic databases, AI routing, and game accelerator coexistence.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-Clash%20Verge%20Rev-green)
![Language](https://img.shields.io/badge/language-JavaScript-yellow)

## Related Repositories
[VPS-Builder](https://github.com/SehAie/VPS-Builder) - 🚀 一键部署 VPS 的 Windows 命令行工具 | A Windows CLI tool to bootstrap VPS

---

## 📖 目录

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

## ⚠️ 使用前必读

本脚本中的自建节点信息**已脱敏**：

```js
server: "YOUR_SERVER_IP_HERE",
password: "YOUR_PASSWORD_HERE",
```

在使用前，你需要任选一种方案：

- **方案 A**：替换为你自己的 **Hysteria2** VPS 信息（默认模板）
- **方案 B**：把节点注入改成 **其他协议**（SS / VMess / VLESS / Trojan 等，见下文模板）
- **方案 C**：完全**不自建**，只用现用订阅里的节点（见下文"不想自建节点？"章节）

> 🔐 **安全提示**：真实服务器信息切勿提交到任何公开仓库！

---

## ✨ 功能特性

| 场景 | 需求 | 解决方案 |
|------|------|----------|
| 🎓 校园网 & 文献下载 | 需走校园 IP 出口才能识别授权 | 域名直连 + 系统 DNS |
| 🤖 海外 AI 服务 | ChatGPT / Claude / Gemini 等被封锁 | 走自建或订阅节点 |
| 🇨🇳 国产 AI | DeepSeek / Kimi / 豆包 等 | 直连，避免绕路 |
| 🎮 Steam & 游戏加速器 | 避免与 TUN 冲突 | 进程排除 + 域名直连 |
| 🏠 内网设备 | 访问 NAS / 打印机 / 路由器 | 局域网 CIDR 直连 |
| 🔒 隐私保护 | 防 IPv6 泄漏、hosts 污染 | 强制关闭 IPv6 DNS |

---

## 🚀 快速开始

### 1. 下载脚本

点击仓库中的 [`override.js`](./override.js) → 右上角 **`Raw`** → 全选复制（`Ctrl+A`、`Ctrl+C`）。

### 2. 粘贴到 Clash Verge Rev

1. 打开 **Clash Verge Rev**
2. 进入 **「订阅」** 页面
3. 右键你的订阅 → **「编辑全局扩展脚本」**
4. 粘贴脚本内容

### 3. 配置节点信息

根据你的情况任选其一：

- ✅ **用 Hysteria2 VPS**：替换脚本中的 `YOUR_SERVER_IP_HERE` 和 `YOUR_PASSWORD_HERE`
- 🔁 **用其他协议**：参考下文 [切换到其他协议](#-切换到其他协议ss--vmess--vless--trojan-等)
- 🚫 **不自建**：参考下文 [不想自建节点](#-不想自建节点直接使用订阅节点)

### 4. 启用脚本

- 保存脚本
- 订阅页 → **「重新应用」**
- 代理列表中选择 `🤖 AI专属分流` → 指定希望使用的海外节点

---

## 🔧 使用环境

- **客户端**：[Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev)
- **模式**：规则模式 + TUN（虚拟网卡）
- **建议开启**：开机自启、绕过局域网
- **默认节点协议**：Hysteria2（可替换为任意协议，见下文）

---

## 🏗️ 架构概览

```
┌──────────────────────────────────────┐
│        全局覆盖脚本（main 函数）      │
├──────────────────────────────────────┤
│  1. 基础优化（store-selected / DNS） │
│  2. TUN 排除进程（游戏加速器）        │
│  3. 注入自建节点（默认 Hysteria2）    │
│  4. 创建 AI 专属策略组                │
│  5. 合并自定义规则 → 订阅规则         │
│  6. DNS 增强（fake-ip-filter）       │
└──────────────────────────────────────┘
```

---

## 📘 功能模块详解

### 基础配置优化

```js
config.profile["store-selected"] = true;  // 记住节点选择
config.dns["use-system-hosts"] = false;   // 防 hosts 污染
config.dns.ipv6 = false;                  // 禁用 IPv6 DNS，防泄漏
```

### TUN 排除进程（`exclude-process-name`）

让**游戏加速器、Steam**等自带虚拟网卡的软件完全绕开 Clash 的 TUN，避免双网卡冲突：

- **Steam 全家桶**：`Steam.exe`、`steamwebhelper.exe` 等
- **加速器**：网易 UU、腾讯加速器、迅游、奇游、雷神、海豚
- **工具**：Steam++ / Watt Toolkit

### 自建节点注入

通过 `unshift` 把自建节点塞到节点列表最前面，方便快速选择。默认使用 Hysteria2，其他协议见下文。

### AI 专属策略组

```
名称：🤖 AI专属分流
类型：select（手动选择）
可选：AI-MyVPS / REJECT
```

> 💡 **不含 DIRECT**，避免因误选导致 AI 请求走本地泄漏身份；`REJECT` 提供紧急熔断。

### 域名分流清单

| 列表 | 走向 | 说明 |
|------|------|------|
| `aiDomainsOverseas` | 🤖 AI专属分流 | OpenAI / Claude / Gemini / Grok / Perplexity / HuggingFace 等 |
| `aiDomainsCN` | DIRECT | DeepSeek / Kimi / 通义 / 文心 / 豆包 / 混元 等 |
| `eduDomains` | DIRECT + 系统 DNS | edu.cn / cernet 等教育网 |
| `literatureDomains` | DIRECT + 系统 DNS | 知网、万方、WOS、Elsevier、Springer、IEEE、PubMed 等 |
| `steamDomains` | DIRECT | Steam 平台域名（含 `DOMAIN-KEYWORD,steam`） |
| `directProcesses` | DIRECT | 游戏加速器进程名 |
| `lanCIDRs` / `lanCIDRs6` | DIRECT（no-resolve） | 内网 IPv4/IPv6 段 |

### DNS 增强

```
fake-ip-filter     → 教育 / 文献 / Steam 域名跳过 fake-ip
nameserver-policy  → 教育 / 文献域名强制使用「系统 DNS」
```

> ⚠️ **关键点**：文献库通过 IP 识别校园授权，必须让校园网 DHCP 下发的 DNS 去解析，拿到校内解析结果，出口才能被识别为校内 IP。

---

## 📑 规则优先级顺序

脚本使用 `concat` 把自定义规则放在订阅规则**最前面**，压过订阅尾部的 `MATCH` 兜底规则：

```
① 局域网 IP-CIDR（no-resolve）
② 教育网域名 DIRECT
③ 文献库域名 DIRECT
④ Steam 域名 DIRECT + DOMAIN-KEYWORD,steam
⑤ 进程名直连（Steam + 加速器）
⑥ 国产 AI DIRECT
⑦ 海外 AI → 🤖 AI专属分流
⑧ ────── 以下为订阅原规则 ──────
```

---

## 🛠️ 自建节点配置

脚本默认使用 **Hysteria2** 协议模板：

```js
config.proxies.unshift({
  name: "AI-MyVPS",
  type: "hysteria2",
  server: "YOUR_SERVER_IP_HERE",
  port: 8443,
  password: "YOUR_PASSWORD_HERE",
  sni: "bing.com",
  "skip-cert-verify": true
});
```

### 字段说明

| 字段 | 占位符 / 默认值 | 说明 | 是否必填 |
|------|----------------|------|---------|
| `name` | `AI-MyVPS` | 节点显示名，可自定义 | ✅ |
| `type` | `hysteria2` | **协议类型，不可省略** | ✅ |
| `server` | `YOUR_SERVER_IP_HERE` | VPS 的 IP 或域名 | ✅ |
| `port` | `8443` | 端口号，按服务端配置填写 | ✅ |
| `password` | `YOUR_PASSWORD_HERE` | 认证密码 | ✅ |
| `sni` | `bing.com` | TLS 伪装域名，可自定义 | ⚠️ 建议 |
| `skip-cert-verify` | `true` | 自签证书填 `true`，正式证书填 `false` | ⚠️ 建议 |

### 替换步骤

1. 打开 `override.js`，定位到 `config.proxies.unshift({ ... })` 代码块
2. 把 `YOUR_SERVER_IP_HERE` 替换为你的 VPS 公网 IP 或域名
3. 把 `YOUR_PASSWORD_HERE` 替换为 Hysteria2 认证密码
4. 按需调整 `port` / `sni` / `skip-cert-verify`
5. 保存 → 订阅页「重新应用」

---

## 🔁 切换到其他协议（SS / VMess / VLESS / Trojan 等）

脚本默认模板仅适用于 **Hysteria2**。如果你的服务器使用其他协议，请**完整替换** `config.proxies.unshift({ ... })` 这段代码为下方对应模板。

> 💡 所有模板都保持 `name: "AI-MyVPS"`，这样 AI 策略组无需修改即可识别。

### 📦 Shadowsocks (SS)

```js
config.proxies.unshift({
  name: "AI-MyVPS",
  type: "ss",
  server: "YOUR_SERVER_IP",
  port: 8388,
  cipher: "aes-256-gcm",   // 常见: aes-128-gcm / chacha20-ietf-poly1305
  password: "YOUR_PASSWORD",
  udp: true
});
```

### 📦 ShadowsocksR (SSR)

```js
config.proxies.unshift({
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
config.proxies.unshift({
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
config.proxies.unshift({
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
config.proxies.unshift({
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
config.proxies.unshift({
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
config.proxies.unshift({
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
config.proxies.unshift({
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

在 `override.js` 中找到并**整段删除**：

```js
config.proxies.unshift({
  name: "AI-MyVPS",
  type: "hysteria2",
  server: "YOUR_SERVER_IP_HERE",
  port: 8443,
  password: "YOUR_PASSWORD_HERE",
  sni: "bing.com",
  "skip-cert-verify": true
});
```

### 第 2 步：修改 AI 策略组

把 `proxies: ["AI-MyVPS", "REJECT"]` 改为你订阅中的节点名：

```js
config["proxy-groups"].unshift({
  name: "🤖 AI专属分流",
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

需要在**两处**同步添加进程名：
1. `config.tun["exclude-process-name"]`（TUN 层排除）
2. `directProcesses`（规则层直连）

### 切换 AI 出口节点

在 `🤖 AI专属分流` 策略组中，手动选择其他订阅节点即可（`store-selected` 会记住选择）。

### 更换自建 VPS

修改脚本中 `unshift` 部分的 `server` / `port` / `password` 字段。如需切换协议，参考上文 [切换到其他协议](#-切换到其他协议ss--vmess--vless--trojan-等)。

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
