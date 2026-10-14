// Clash Verge Rev 全局覆盖脚本 v3.5
// 公开模板：使用前请替换 YOUR_* 占位符；真实节点配置请保留在仓库之外。

function main(config) {

  // ================================================================
  // 基础数据结构保护
  // ================================================================
  if (!config) config = {};
  if (!config.proxies) config.proxies = [];
  if (!config["proxy-groups"]) config["proxy-groups"] = [];
  if (!config.rules) config.rules = [];
  if (!config.profile) config.profile = {};
  if (!config.dns) config.dns = {};
  if (!config.tun) config.tun = {};
  if (!config.sniffer) config.sniffer = {};

  // ================================================================
  // 通用工具函数
  // ================================================================
  const unique = arr => Array.from(new Set(arr));

  const mergeArray = (base, extra) =>
    unique([
      ...(Array.isArray(base) ? base : []),
      ...extra
    ]);

  const upsertByName = (list, item) => {
    const idx = list.findIndex(x => x && x.name === item.name);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
  };

  const toDomainRules = (domains, target) =>
    domains.map(d => `DOMAIN-SUFFIX,${d},${target}`);

  // ================================================================
  // 常量：节点名 / 策略组名
  // ================================================================
  const AI_GROUP = "🤖 AI专属分流";
  const VPS_NODE = "AI-MyVPS";
  const HOMEIP_NODE = "AI-HomeIP";

  // ================================================================
  // 全局基础配置
  // ================================================================
  config.profile["store-selected"] = true;           // 记忆手动选择的节点
  config.profile["store-fake-ip"] = true;            // 持久化 fake-ip 映射，减少重启后映射变化
  config.dns["use-system-hosts"] = false;            // 不读取系统 hosts
  config.dns.ipv6 = false;                           // Mihomo DNS 不返回 AAAA 记录
  config["tcp-concurrent"] = true;                   // 启用 TCP 并发
  config["find-process-mode"] = "strict";            // 由内核按规则需要决定是否查找进程

  // ================================================================
  // 域名嗅探 — 从 HTTP Host / TLS SNI / QUIC 中识别域名
  // 无法取得域名信息时，域名规则可能无法匹配。
  // ================================================================
  config.sniffer["enable"] = true;
  config.sniffer["force-dns-mapping"] = true;
  config.sniffer["parse-pure-ip"] = true;
  config.sniffer["override-destination"] = false;

  if (!config.sniffer["sniff"]) config.sniffer["sniff"] = {};
  config.sniffer["sniff"]["HTTP"] = { "ports": [80, "8080-8880"], "override-destination": true };
  config.sniffer["sniff"]["TLS"] = { "ports": [443, 8443] };
  config.sniffer["sniff"]["QUIC"] = { "ports": [443, 8443] };

  config.sniffer["skip-domain"] = mergeArray(config.sniffer["skip-domain"], [
    "Mijia Cloud",
    "dlg.io.mi.com",
    "+.push.apple.com"
  ]);

  // ================================================================
  // DNS 配置 — fake-ip 模式
  //
  //   国内 / 私有域名       → 真实 IP + 系统 DNS
  //   文献 / Zotero / Steam → 真实 IP + 系统 DNS + DIRECT
  //   国产 AI / CF 验证     → 真实 IP + 系统 DNS + DIRECT
  //   海外 AI              → AI 专属出口 + 经家宽链路的 DoH
  //
  // fake-ip 过滤项与订阅合并；是否返回真实 IP 取决于最终过滤列表。
  // ================================================================
  config.dns["enable"] = true;
  config.dns["enhanced-mode"] = "fake-ip";
  config.dns["fake-ip-range"] = "198.18.0.1/16";

  // DNS 服务器域名的引导解析器
  if (!Array.isArray(config.dns["default-nameserver"]) || config.dns["default-nameserver"].length === 0) {
    config.dns["default-nameserver"] = ["223.5.5.5", "119.29.29.29"];
  }

  // 代理服务器域名使用独立解析器，避免解析依赖代理自身
  if (!Array.isArray(config.dns["proxy-server-nameserver"]) || config.dns["proxy-server-nameserver"].length === 0) {
    config.dns["proxy-server-nameserver"] = ["223.5.5.5", "119.29.29.29"];
  }

  // 普通域名默认解析器：订阅未配置时补充
  if (!Array.isArray(config.dns["nameserver"]) || config.dns["nameserver"].length === 0) {
    config.dns["nameserver"] = ["223.5.5.5", "119.29.29.29"];
  }

  // DIRECT 出口使用系统 DNS，不再跟随 nameserver-policy。
  // 校园网环境下，系统 DNS 应由当前校园网络提供。
  config.dns["direct-nameserver"] = ["system"];
  config.dns["direct-nameserver-follow-policy"] = false;

  // ================================================================
  // Steam / 加速器进程直连清单
  // 通过 PROCESS-NAME 规则指定 DIRECT，流量仍经过内核处理。
  // ================================================================
  const directProcesses = [
    "Steam.exe",
    "steamwebhelper.exe",
    "steamservice.exe",
    "GameOverlayUI.exe",

    "UUGameAssistant.exe",
    "UU.exe",
    "uu.exe",
    "UUBooster.exe",

    "TenioDL.exe",
    "QQGameAcc.exe",
    "TAccelerator.exe",
    "SNGAccelerator.exe",

    "XunYou.exe",
    "xunyou.exe",
    "qyacc.exe",
    "QiyuAcc.exe",

    "LeiShen.exe",
    "ThunderVPN.exe",
    "haitun.exe",

    "Steam++.exe",
    "Steam++.Core.exe",
    "WattToolkit.exe",

    // NCBI Aspera：微生物数据上传
    "ascp.exe"
  ];

  // ================================================================
  // 自建 Hysteria2 VPS 节点
  // ================================================================
  upsertByName(config.proxies, {
    name: VPS_NODE,
    type: "hysteria2",
    server: "YOUR_VPS_SERVER_IP_HERE",
    port: 8443,
    password: "YOUR_HYSTERIA2_PASSWORD_HERE",
    sni: "bing.com",
    "skip-cert-verify": true
  });

  // ================================================================
  // 家宽 IP 代理节点（经 VPS 中转）
  // udp: false — 此 SOCKS5 节点不承载 UDP。
  // dialer-proxy — 经 VPS 的 Hysteria2 隧道连接家宽 SOCKS5。
  // ================================================================
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

  // ================================================================
  // AI 专属策略组
  // select 类型，手动选择家宽出口或 REJECT。
  // ================================================================
  upsertByName(config["proxy-groups"], {
    name: AI_GROUP,
    type: "select",
    proxies: [
      HOMEIP_NODE,
      "REJECT"
    ]
  });

  // ================================================================
  // 海外 AI 域名清单（AI 专属出口）
  // ================================================================
  const aiDomainsOverseas = [
    // OpenAI
    "chatgpt.com",
    "openai.com",
    "oaistatic.com",
    "oaistatsig.com",
    "openaimerge.com",
    "oaiusercontent.com",
    "chatgpt.livekit.cloud",
    "livekit.cloud",

    // Anthropic / Claude
    "anthropic.com",
    "claude.ai",
    "claude.com",
    "clau.de",
    "claudemcpclient.com",
    "claudemcpcontent.com",
    "claudeusercontent.com",
    "cdn.anthropic.com",
    "anthropic.com.cdn.cloudflare.net",
    "servd-anthropic-website.b-cdn.net",
    "anthropic.auth0.com",
    "anthropic-com.ghost.io",
    "statsigapi.net",
    "browser-intake-us5-datadoghq.com",

    // Google AI
    "gemini.google.com",
    "bard.google.com",
    "aistudio.google.com",
    "generativelanguage.googleapis.com",
    "makersuite.google.com",
    "ai.google.dev",
    "alkalimakersuite-pa.clients6.google.com",

    // xAI
    "x.ai",
    "grok.com",

    // Perplexity / Mistral / Meta / Character / Poe
    "perplexity.ai",
    "mistral.ai",
    "meta.ai",
    "llama.meta.com",
    "character.ai",
    "character.io",
    "poe.com",
    "quoracdn.net",

    // HuggingFace / Cohere
    "huggingface.co",
    "hf.co",
    "cohere.ai",
    "cohere.com",

    // 多模态生成
    "midjourney.com",
    "runwayml.com",
    "stability.ai",
    "elevenlabs.io",
    "suno.ai",
    "suno.com",
    "leonardo.ai",

    // API 聚合平台
    "openrouter.ai",
    "together.ai",
    "groq.com",
    "replicate.com",
    "featherless.ai",

    // Google Scholar
    "scholar.google.com",

    // AI 路线检测
    "ip.net.coffee"
  ];

  // ================================================================
  // AI QUIC / HTTP3 阻断规则 — 海外 AI 域名的 UDP/443
  // 拒绝后由支持回退的客户端改用 TCP/TLS，再匹配 AI_GROUP。
  // 其他 UDP 端口和无法识别域名的连接不在此规则范围内。
  // ================================================================
  const aiQuicRejectRules = aiDomainsOverseas.map(d =>
    `AND,((NETWORK,UDP),(DST-PORT,443),(DOMAIN-SUFFIX,${d})),REJECT`
  );

  // ================================================================
  // AI IP 兜底规则
  // Anthropic IPv4 网段补充匹配，不覆盖全部 AI 服务地址。
  // ================================================================
  const aiIPRules = [
    `IP-CIDR,160.79.104.0/23,${AI_GROUP},no-resolve`
  ];

  // ================================================================
  // 国产 AI 域名（直连）
  // 显式配置 DIRECT、真实 IP 和系统 DNS，不依赖 GeoSite 收录。
  // ================================================================
  const aiDomainsCN = [
    "deepseek.com",
    "deepseek.ai",

    "moonshot.cn",
    "kimi.com",
    "kimi.ai",

    "tongyi.aliyun.com",
    "qwen.ai",
    "dashscope.aliyuncs.com",

    "yiyan.baidu.com",
    "wenxin.baidu.com",
    "ernie.baidu.com",

    "doubao.com",
    "volcengine.com",
    "volces.com",

    "chatglm.cn",
    "zhipuai.cn",
    "bigmodel.cn",

    "hunyuan.tencent.com",
    "yuanbao.tencent.com",

    "xfyun.cn",
    "xinghuo.xfyun.cn",
    "iflytek.com",

    "minimax.chat",
    "minimaxi.com",
    "hailuoai.com",

    "baichuan-ai.com",
    "baichuanai.com",

    "01.ai",
    "lingyiwanwu.com",

    "stepfun.com",
    "yuewen.cn",

    "siliconflow.cn"
  ];

  // ================================================================
  // 校园网 / 教育网（直连）
  // ================================================================
  const eduDomains = [
    "edu.cn",
    "cernet.com",
    "cernet.net",
    "calis.edu.cn",
    "nstl.gov.cn"
  ];

  // ================================================================
  // 文献数据库与 Zotero（直连）
  //
  //   路由规则          → DIRECT
  //   fake-ip-filter    → 真实 IP
  //   nameserver-policy → system
  //
  // 文献数据库的机构 IP 授权取决于网站看到的出口 IP。
  // ================================================================
  const literatureDomains = [
    // Zotero：官网、API、同步与官方附件存储
    // 坚果云 WebDAV 由 GEOSITE,cn,DIRECT 分流
    "zotero.org",
    "zotero.net",
    "zoterofilestorage.s3.amazonaws.com",
    "zoterofilestorage.s3.us-east-1.amazonaws.com",

    // 中文文献
    "cnki.net",
    "cnki.com.cn",
    "wanfangdata.com.cn",
    "wanfangtech.net",
    "cqvip.com",
    "chaoxing.com",
    "duxiu.com",
    "sslibrary.com",
    "airitilibrary.cn",
    "pkulaw.com",
    "nlc.cn",

    // Web of Science
    "webofscience.com",
    "webofknowledge.com",
    "clarivate.com",

    // Elsevier
    "sciencedirect.com",
    "elsevier.com",
    "scopus.com",
    "embase.com",
    "mendeley.com",
    "ssrn.com",

    // Springer Nature
    "springer.com",
    "springernature.com",
    "springeropen.com",
    "nature.com",
    "biomedcentral.com",

    // Wiley / AAAS / T&F / SAGE
    "wiley.com",
    "onlinelibrary.wiley.com",
    "science.org",
    "sciencemag.org",
    "aaas.org",
    "tandfonline.com",
    "taylorandfrancis.com",
    "sagepub.com",
    "sagepublishing.com",

    // 计算机 / 化学 / 物理
    "ieee.org",
    "computer.org",
    "acm.org",
    "acs.org",
    "rsc.org",
    "cas.org",
    "reaxys.com",
    "aps.org",
    "aip.org",
    "scitation.org",

    // 综合检索
    "jstor.org",
    "proquest.com",
    "ebscohost.com",
    "ebsco.com",

    // 医学
    "nih.gov",
    "nlm.nih.gov",

    // 牛津 / 剑桥
    "oup.com",
    "cambridge.org",

    // 开源期刊
    "mdpi.com",
    "frontiersin.org",
    "plos.org",

    // 顶级医学期刊
    "bmj.com",
    "thelancet.com",
    "nejm.org",
    "cell.com",
    "jamanetwork.com",

    // 预印本 / 学术搜索
    "arxiv.org",
    "biorxiv.org",
    "medrxiv.org",
    "researchgate.net",
    "semanticscholar.org",
    "doi.org",
    "crossref.org",

    // 顶级学会期刊
    "pnas.org",
    "royalsocietypublishing.org",
    "physiology.org",
    "asm.org",
    "annualreviews.org",
    "ams.org",
    "aeaweb.org",

    // 中型出版商
    "karger.com",
    "hindawi.com",
    "degruyter.com",
    "emerald.com",

    // 冷泉港 / 洛克菲勒
    "cshlpress.com",
    "cshlp.org",
    "rupress.org",

    // NCBI 微生物与生物信息数据库
    "ncbi.nlm.nih.gov"
  ];

  // ================================================================
  // CF 风控 & 验证码相关域名（直连）
  // 使用系统 DNS 和真实 IP；AI 主站走代理时，验证请求可能与主站出口不同。
  // nel.cloudflare.com / cloudflareinsights.com 用于报告和分析。
  // ================================================================
  const cfChallengeDomains = [
    "challenges.cloudflare.com",
    "nel.cloudflare.com",
    "cloudflareinsights.com",
    "recaptcha.net",
    "www.recaptcha.net"
  ];

  // ================================================================
  // Steam 平台域名（直连）
  // ================================================================
  const steamDomains = [
    "steampowered.com",
    "steamcommunity.com",
    "steamstatic.com",
    "steamcontent.com",
    "steamserver.net",
    "steamusercontent.com",
    "steam-chat.com",
    "steamcdn-a.akamaihd.net",
    "valvesoftware.com"
  ];

  // ================================================================
  // 局域网 IP 段
  // ================================================================
  const lanCIDRs = [
    "127.0.0.0/8",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "100.64.0.0/10",
    "169.254.0.0/16"
  ];

  const lanCIDRs6 = [
    "::1/128",
    "fc00::/7",
    "fe80::/10"
  ];

  // ================================================================
  // 规则合并（顺序即优先级）
  //
  //   1. 局域网 DIRECT
  //   2. CF 验证码 DIRECT
  //   3. 校园 / 文献 / Zotero / Steam DIRECT
  //   4. 进程 DIRECT
  //   5. 国产 AI DIRECT
  //   6. 海外 AI UDP/443 REJECT
  //   7. 海外 AI TCP/TLS → AI_GROUP
  //   8. AI IP 兜底
  //   9. 国内兜底
  // ================================================================
  const customRules = [
    // 局域网优先
    ...lanCIDRs.map(c => `IP-CIDR,${c},DIRECT,no-resolve`),
    ...lanCIDRs6.map(c => `IP-CIDR6,${c},DIRECT,no-resolve`),

    // CF 验证码走 DIRECT
    ...toDomainRules(cfChallengeDomains, "DIRECT"),

    // 校园网 / 文献 / Zotero / Steam 直连
    ...toDomainRules(eduDomains, "DIRECT"),
    ...toDomainRules(literatureDomains, "DIRECT"),
    ...toDomainRules(steamDomains, "DIRECT"),

    // 进程直连
    ...directProcesses.map(p => `PROCESS-NAME,${p},DIRECT`),

    // 国产 AI 直连
    ...toDomainRules(aiDomainsCN, "DIRECT"),

    // 海外 AI QUIC / HTTP3 阻断：只影响 AI 域名 UDP/443
    ...aiQuicRejectRules,

    // 海外 AI TCP/TLS 走专属家宽出口
    ...toDomainRules(aiDomainsOverseas, AI_GROUP),

    // AI IP 兜底
    ...aiIPRules,

    // 国内域名兜底
    // 按域名收录和目标 IP 判断国内 / 私有地址
    "GEOSITE,cn,DIRECT",
    "GEOIP,CN,DIRECT",
    "GEOIP,PRIVATE,DIRECT"
  ];

  // 自定义规则前置，压过订阅原规则
  config.rules = unique(customRules.concat(config.rules));

  // ================================================================
  // DNS 增强：fake-ip-filter + nameserver-policy
  //
  // 国内、私有、校园、文献、Zotero、Steam、CF 及国产 AI 域名：
  //   fake-ip-filter 排除映射，nameserver-policy 指定系统 DNS。
  //
  // 海外 AI 不主动加入过滤表；订阅的过滤项仍可能使其返回真实 IP。
  // ================================================================

  // 使用真实 IP 和系统 DNS 的域名
  const directDnsDomains = [
    ...eduDomains,
    ...literatureDomains,
    ...steamDomains,
    ...cfChallengeDomains,
    ...aiDomainsCN
  ];

  // 按 blacklist 语义合并过滤项；其他模式需单独处理。
  const inheritedFilterMode = config.dns["fake-ip-filter-mode"] || "blacklist";
  if (inheritedFilterMode !== "blacklist") {
    throw new Error("本脚本适用于 fake-ip-filter-mode: blacklist；请先检查新订阅的 DNS 过滤模式。");
  }
  config.dns["fake-ip-filter-mode"] = "blacklist";

  // fake-ip-filter：这些域名获取真实 IP
  if (!Array.isArray(config.dns["fake-ip-filter"])) {
    config.dns["fake-ip-filter"] = [];
  }
  const filterSet = new Set(config.dns["fake-ip-filter"]);

  // 国内 / 私有 / 广告域名返回真实 IP；此处不执行广告拦截
  filterSet.add("geosite:cn");
  filterSet.add("geosite:private");
  filterSet.add("geosite:category-ads-all");

  // 显式直连域名返回真实 IP
  directDnsDomains.forEach(d => filterSet.add(`+.${d}`));

  // 通用 real-ip 过滤
  filterSet.add("+.lan");
  filterSet.add("+.local");
  filterSet.add("+.localdomain");
  filterSet.add("time.*.com");
  filterSet.add("ntp.*.com");
  filterSet.add("+.market.xiaomi.com");
  filterSet.add("localhost.ptlogin2.qq.com");
  filterSet.add("+.msftconnecttest.com");
  filterSet.add("+.msftncsi.com");
  config.dns["fake-ip-filter"] = Array.from(filterSet);

  // nameserver-policy：直连域名使用系统 DNS
  if (!config.dns["nameserver-policy"]) {
    config.dns["nameserver-policy"] = {};
  }

  // 国内 / 私有域名使用系统 DNS
  config.dns["nameserver-policy"]["geosite:cn"] = "system";
  config.dns["nameserver-policy"]["geosite:private"] = "system";

  // 显式直连域名使用系统 DNS
  directDnsDomains.forEach(d => {
    config.dns["nameserver-policy"][`+.${d}`] = "system";
  });

  // ================================================================
  // 海外 AI DNS — DoH 查询经 VPS + 家宽链路
  // 使用 IP 形式的 DoH 地址，避免先解析 DNS 服务器域名。
  // #节点名指定 DNS 查询出口；网站连接仍按 rules 分流。
  // 应用自行发出的 DoH 请求不一定经过此 DNS 配置。
  // ================================================================
  const aiNameservers = [
    `https://1.1.1.1/dns-query#${HOMEIP_NODE}`,
    `https://8.8.8.8/dns-query#${HOMEIP_NODE}`
  ];

  // 为 AI 域名设置精确匹配和后缀匹配的解析策略
  aiDomainsOverseas.forEach(d => {
    config.dns["nameserver-policy"][d] = aiNameservers.slice();
    config.dns["nameserver-policy"][`+.${d}`] = aiNameservers.slice();
  });

  // 精确主机策略优先，单独指定此主机的解析器
  config.dns["nameserver-policy"]["api.oaistatsig.com"] = aiNameservers.slice();

  return config;
}
