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
  config.dns["use-system-hosts"] = false;            // 不使用系统 hosts，避免污染
  config.dns.ipv6 = false;                           // 禁用 IPv6 DNS，防止 AAAA 泄漏
  config["global-client-fingerprint"] = "chrome";    // TLS 指纹伪装为 Chrome
  config["tcp-concurrent"] = true;                   // 启用 TCP 并发
  config["find-process-mode"] = "strict";            // 进程名精确匹配

  // ================================================================
  // 域名嗅探 — TUN 模式下确保 IP 直连也能被识别为域名规则
  // 即使连接以 IP 形式发起，sniffer 也能从 TLS SNI 还原域名
  // QUIC 嗅探是全局识别能力：UDP/443 阻断只作用于海外 AI 域名
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
  //   核心策略（geosite 反向排除）：国内服务不会被误伤，海外域名自动获得 fake-ip
  //   geosite:cn                  → 国内域名拿真实 IP，system DNS
  //   geosite:private             → 私有/局域网域名拿真实 IP，system DNS
  //   geosite:category-ads-all    → 广告域名拿真实 IP，避免 fake-ip 干扰拦截
  //   文献/教育/Steam/验证码域名  → 显式 real-ip + system DNS + DIRECT
  //   海外 AI 域名               → 保持 fake-ip，由规则送入 AI 专属出口
  // ================================================================
  config.dns["enable"] = true;
  config.dns["enhanced-mode"] = "fake-ip";
  config.dns["fake-ip-range"] = "198.18.0.1/16";

  // 解析 DNS 服务器自身域名用；纯 IP，可直连
  if (!Array.isArray(config.dns["default-nameserver"]) || config.dns["default-nameserver"].length === 0) {
    config.dns["default-nameserver"] = ["223.5.5.5", "119.29.29.29"];
  }

  // 解析代理服务器域名用，避免“代理域名也要代理解析”的死循环
  if (!Array.isArray(config.dns["proxy-server-nameserver"]) || config.dns["proxy-server-nameserver"].length === 0) {
    config.dns["proxy-server-nameserver"] = ["223.5.5.5", "119.29.29.29"];
  }

  // 普通域名默认解析器：作为 DNS 基线兜底
  // 只在原配置没有 nameserver 时补充，避免覆盖订阅原有 DNS
  if (!Array.isArray(config.dns["nameserver"]) || config.dns["nameserver"].length === 0) {
    config.dns["nameserver"] = ["223.5.5.5", "119.29.29.29"];
  }

  // 直连出口 DNS：国内、校园、文献、Steam 等 DIRECT 域名尽量走系统 DNS
  // 只在原配置没有 direct-nameserver 时补充
  if (!Array.isArray(config.dns["direct-nameserver"]) || config.dns["direct-nameserver"].length === 0) {
    config.dns["direct-nameserver"] = ["system"];
  }

  // ================================================================
  // TUN 配置 — 排除 Steam / 加速器进程，使其绕过 Clash
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
    "WattToolkit.exe"
  ];

  // TUN 排除进程：合并而不是覆盖，避免破坏原配置已有排除项
  config.tun["exclude-process-name"] = mergeArray(
    config.tun["exclude-process-name"],
    directProcesses
  );

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
  // udp: false — 禁止 UDP 转发，强制 QUIC 回退 TCP，避免 UDP 泄漏
  // dialer-proxy — 先经 VPS 建立 Hysteria2 隧道，再通过隧道连接家宽 SOCKS5
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
  // select 类型，无健康检查，保持长连接，避免频繁断开
  // ================================================================
  upsertByName(config["proxy-groups"], {
    name: AI_GROUP,
    type: "select",
    proxies: [
      HOMEIP_NODE,
      VPS_NODE,
      "REJECT"
    ]
  });

  // ================================================================
  // 海外 AI 域名清单（走 fake-ip + AI 专属出口）
  // ================================================================
  const aiDomainsOverseas = [
    // OpenAI
    "chatgpt.com",
    "openai.com",
    "oaistatic.com",
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
  // AI QUIC / HTTP3 阻断规则： 仅海外 AI 域名，不影响普通网站的 QUIC。
  //   阻止 AI 的 QUIC/HTTP3 连接继续向下匹配到廉价 VPN；
  //   浏览器收到 UDP/443 被拒绝后，会回退到 TCP/TLS；
  //   TCP/TLS 再命中 AI_GROUP，经家宽出口访问。
  // ================================================================
  const aiQuicRejectRules = aiDomainsOverseas.map(d =>
    `AND,((NETWORK,UDP),(DST-PORT,443),(DOMAIN-SUFFIX,${d})),REJECT`
  );

  // ================================================================
  // AI IP 兜底规则
  // Anthropic 自有 IPv4 段兜底。
  // 其他 AI 平台多数使用 Cloudflare/AWS/Azure CDN，无自有 IP 段，无需添加
  // ================================================================
  const aiIPRules = [
    `IP-CIDR,160.79.104.0/23,${AI_GROUP},no-resolve`
  ];

  // ================================================================
  // 国产 AI 域名（直连）
  // 这些域名在 geosite:cn 中 → 自动拿真实 IP + 系统 DNS
  // 此处显式列出是为了确保规则优先级最高（在 GEOSITE,cn 兜底之前命中）
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
  // 文献数据库（直连，依赖校园 IP 授权）
  //
  // 这些海外域名不一定在 geosite:cn 中，必须显式处理：
  //   1. 路由规则 → DIRECT
  //   2. fake-ip-filter → 真实 IP
  //   3. nameserver-policy → system
  //
  // 保留校园 DNS / 校园出口 / 机构授权逻辑。
  // ================================================================
  const literatureDomains = [
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
    "rupress.org"
  ];

  // ================================================================
  // CF 风控 & 验证码域名
  // 走 DIRECT — 与文献主体流量同出口，消除 IP 指纹不一致
  // 对 AI 平台影响极小：Turnstile 是 token 验证，不比对 IP
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
  //   3. 校园 / 文献 / Steam DIRECT
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

    // 校园网 / 文献 / Steam 直连
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
    // 即使某个国内域名没被 fake-ip-filter 排除，sniffer 还原域名后也能命中 DIRECT
    "GEOSITE,cn,DIRECT",
    "GEOIP,CN,DIRECT",
    "GEOIP,PRIVATE,DIRECT"
  ];

  // 自定义规则前置，压过订阅原规则
  config.rules = unique(customRules.concat(config.rules));

  // ================================================================
  // DNS 增强：fake-ip-filter + nameserver-policy
  //
  // 直连域名需真实 IP + 系统 DNS：
  //   - 国内域名 (geosite:cn 统一排除所有国内域名)
  //   - 私有域名
  //   - 教育/校园域名
  //   - 文献数据库
  //   - Steam
  //   - CF / reCAPTCHA 验证域名
  //
  // 海外 AI 域名不加入 fake-ip-filter：
  //   - 保持 fake-ip，由规则送入 AI_GROUP。
  // ================================================================

  // 需要真实 IP 的海外直连域名（不在 geosite:cn 中，需显式排除）
  const directDnsDomains = [
    ...eduDomains,
    ...literatureDomains,
    ...steamDomains,
    ...cfChallengeDomains
  ];

  // fake-ip-filter：这些域名获取真实 IP
  if (!Array.isArray(config.dns["fake-ip-filter"])) {
    config.dns["fake-ip-filter"] = [];
  }
  const filterSet = new Set(config.dns["fake-ip-filter"]);

  // 国内 / 私有 / 广告域名统一 real-ip
  filterSet.add("geosite:cn");
  filterSet.add("geosite:private");
  filterSet.add("geosite:category-ads-all");

  // 海外直连域名 real-ip
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

  // 海外直连域名使用系统 DNS
  // 文献数据库依赖校园 DNS / 校园出口授权，不能走远程解析
  directDnsDomains.forEach(d => {
    config.dns["nameserver-policy"][`+.${d}`] = "system";
  });

  return config;
}
