function main(config) {
  // 确保基础数据结构存在，防止报错
  if (!config.proxies) config.proxies = [];
  if (!config["proxy-groups"]) config["proxy-groups"] = [];
  if (!config.rules) config.rules = [];
  if (!config.profile) config.profile = {};
  if (!config.dns) config.dns = {};
  if (!config.tun) config.tun = {};

  // ========== 基础配置 ==========
  config.profile["store-selected"] = true;
  config.dns["use-system-hosts"] = false;
  config.dns.ipv6 = false;  // 防 IPv6 DNS 泄漏

  // ========== TUN 排除进程（避免与游戏加速器虚拟网卡冲突） ==========
  config.tun["exclude-process-name"] = [
    // Steam
    "Steam.exe", "steamwebhelper.exe", "steamservice.exe", "GameOverlayUI.exe",
    // 网易 UU
    "UUGameAssistant.exe", "UU.exe", "uu.exe", "UUBooster.exe",
    // 腾讯加速器
    "TenioDL.exe", "QQGameAcc.exe", "TAccelerator.exe",
    // 迅游
    "SNGAccelerator.exe", "XunYou.exe", "xunyou.exe",
    // 奇游
    "qyacc.exe", "QiyuAcc.exe",
    // 雷神
    "LeiShen.exe", "ThunderVPN.exe",
    // 海豚
    "haitun.exe",
    // Steam++ / Watt Toolkit
    "Steam++.exe", "Steam++.Core.exe", "WattToolkit.exe"
  ];

  // ========== 注入自建 Hysteria2 节点 ==========
  // ⚠️ 请替换为你自己的 VPS 信息，或删除此段
  config.proxies.unshift({
    name: "AI-MyVPS",
    type: "hysteria2",
    server: "YOUR_SERVER_IP_HERE",
    port: 8443,
    password: "YOUR_PASSWORD_HERE",
    sni: "bing.com",
    "skip-cert-verify": true
  });

  // ========== AI 专属策略组 ==========
  // 不含 DIRECT，避免误选导致身份泄漏；REJECT 用于紧急熔断
  config["proxy-groups"].unshift({
    name: "🤖 AI专属分流",
    type: "select",
    proxies: ["AI-MyVPS", "REJECT"]
  });

  // ========== 海外 AI 域名（走 VPS） ==========
  const aiDomainsOverseas = [
    // OpenAI / ChatGPT
    "chatgpt.com", "openai.com", "oaistatic.com", "oaiusercontent.com",
    // Anthropic / Claude
    "anthropic.com", "claude.ai",
    // Google Gemini / AI Studio
    "gemini.google.com", "bard.google.com", "aistudio.google.com",
    "generativelanguage.googleapis.com", "makersuite.google.com", "ai.google.dev",
    // Grok / x.ai
    "x.ai", "grok.com",
    // Perplexity / Mistral / Meta AI
    "perplexity.ai", "mistral.ai", "meta.ai", "llama.meta.com",
    // Character.AI / Poe
    "character.ai", "character.io", "poe.com", "quoracdn.net",
    // HuggingFace / Cohere
    "huggingface.co", "hf.co", "cohere.ai", "cohere.com",
    // 绘图 / 音视频 AI
    "midjourney.com", "runwayml.com", "stability.ai",
    "elevenlabs.io", "suno.ai", "suno.com", "leonardo.ai",
    // API 聚合平台
    "openrouter.ai", "together.ai", "groq.com", "replicate.com",
    "featherless.ai", "siliconflow.cn"
  ];

  // ========== 国产 AI 域名（直连） ==========
  const aiDomainsCN = [
    // DeepSeek
    "deepseek.com", "deepseek.ai",
    // Kimi / Moonshot
    "moonshot.cn", "kimi.com", "kimi.ai",
    // 通义千问 / 阿里云
    "tongyi.aliyun.com", "qwen.ai", "dashscope.aliyuncs.com",
    // 文心一言 / 百度
    "yiyan.baidu.com", "wenxin.baidu.com", "ernie.baidu.com",
    // 豆包 / 火山引擎
    "doubao.com", "volcengine.com", "volces.com",
    // 智谱清言 / ChatGLM
    "chatglm.cn", "zhipuai.cn", "bigmodel.cn",
    // 腾讯混元 / 元宝
    "hunyuan.tencent.com", "yuanbao.tencent.com",
    // 讯飞星火
    "xfyun.cn", "xinghuo.xfyun.cn", "iflytek.com",
    // MiniMax / 海螺
    "minimax.chat", "minimaxi.com", "hailuoai.com",
    // 百川 / 零一万物 / 阶跃星辰
    "baichuan-ai.com", "baichuanai.com",
    "01.ai", "lingyiwanwu.com",
    "stepfun.com", "yuewen.cn"
  ];

  // ========== 校园网 & 教育网 ==========
  const eduDomains = [
    "edu.cn", "cernet.com", "cernet.net", "calis.edu.cn", "nstl.gov.cn"
  ];

  // ========== 文献数据库（通过 IP 识别校园授权，必须直连） ==========
  const literatureDomains = [
    // 中文文献库
    "cnki.net", "cnki.com.cn", "wanfangdata.com.cn", "wanfangtech.net",
    "cqvip.com", "chaoxing.com", "duxiu.com", "sslibrary.com",
    "airitilibrary.cn", "pkulaw.com", "nlc.cn",
    // Web of Science / Clarivate
    "webofscience.com", "webofknowledge.com", "clarivate.com",
    // Elsevier 系
    "sciencedirect.com", "elsevier.com", "scopus.com", "embase.com",
    "mendeley.com", "ssrn.com",
    // Springer Nature 系
    "springer.com", "springernature.com", "springeropen.com",
    "nature.com", "biomedcentral.com",
    // Wiley / AAAS / T&F / SAGE
    "wiley.com", "onlinelibrary.wiley.com",
    "science.org", "sciencemag.org",
    "tandfonline.com", "taylorandfrancis.com",
    "sagepub.com", "sagepublishing.com",
    // IEEE / ACM
    "ieee.org", "computer.org", "acm.org",
    // 化学 / 物理
    "acs.org", "rsc.org", "cas.org", "reaxys.com",
    "aps.org", "aip.org", "scitation.org",
    // JSTOR / ProQuest / EBSCO
    "jstor.org", "proquest.com", "ebscohost.com", "ebsco.com",
    // 医学
    "nih.gov", "nlm.nih.gov",
    "bmj.com", "thelancet.com", "nejm.org", "cell.com", "jamanetwork.com",
    // Oxford / Cambridge
    "oup.com", "cambridge.org",
    // 开源期刊
    "mdpi.com", "frontiersin.org", "plos.org",
    // 预印本 & 学术搜索
    "arxiv.org", "biorxiv.org", "medrxiv.org",
    "researchgate.net", "semanticscholar.org", "doi.org", "crossref.org"
  ];

  // ========== Steam 平台域名 ==========
  const steamDomains = [
    "steampowered.com", "steamcommunity.com", "steamstatic.com",
    "steamcontent.com", "steamserver.net", "steamusercontent.com",
    "steam-chat.com", "steamcdn-a.akamaihd.net", "valvesoftware.com"
  ];

  // ========== 进程名直连（Steam + 游戏加速器） ==========
  const directProcesses = [
    // Steam
    "Steam.exe", "steamwebhelper.exe", "steamservice.exe", "GameOverlayUI.exe",
    // 网易 UU
    "UUGameAssistant.exe", "uu.exe", "UU.exe",
    // 腾讯加速器
    "TenioDL.exe", "QQGameAcc.exe", "TAccelerator.exe",
    // 迅游 / 奇游 / 雷神 / 海豚
    "SNGAccelerator.exe", "xunyou.exe", "XunYou.exe",
    "qyacc.exe", "QiyuAcc.exe",
    "LeiShen.exe", "ThunderVPN.exe",
    "haitun.exe",
    // Steam++ / Watt Toolkit
    "Steam++.exe", "Steam++.Core.exe", "WattToolkit.exe"
  ];

  // ========== 局域网 IP 段（保护内网：NAS / 打印机 / 路由器后台） ==========
  const lanCIDRs = [
    "127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16",
    "100.64.0.0/10", "169.254.0.0/16"
  ];
  const lanCIDRs6 = ["::1/128", "fc00::/7", "fe80::/10"];

  // ========== 生成并合并规则 ==========
  const toDomainRules = (domains, target) =>
    domains.map(d => `DOMAIN-SUFFIX,${d},${target}`);

  // 优先级：局域网 → 教育 → 文献 → Steam → 加速器 → 国产AI → 海外AI → 订阅原规则
  const customRules = [
    ...lanCIDRs.map(c => `IP-CIDR,${c},DIRECT,no-resolve`),
    ...lanCIDRs6.map(c => `IP-CIDR6,${c},DIRECT,no-resolve`),
    ...toDomainRules(eduDomains, "DIRECT"),
    ...toDomainRules(literatureDomains, "DIRECT"),
    ...toDomainRules(steamDomains, "DIRECT"),
    "DOMAIN-KEYWORD,steam,DIRECT",
    ...directProcesses.map(p => `PROCESS-NAME,${p},DIRECT`),
    ...toDomainRules(aiDomainsCN, "DIRECT"),
    ...toDomainRules(aiDomainsOverseas, "🤖 AI专属分流")
  ];
  config.rules = customRules.concat(config.rules);

  // ========== DNS 增强 ==========
  // 教育/文献/Steam 需跳过 fake-ip，用真实解析
  // 教育/文献 还需强制使用系统 DNS（校园网 DHCP 下发），确保出口 IP 被识别为校内
  const dnsEduDomains = [...eduDomains, ...literatureDomains, ...steamDomains];

  if (!config.dns["fake-ip-filter"]) config.dns["fake-ip-filter"] = [];
  const filterSet = new Set(config.dns["fake-ip-filter"]);
  dnsEduDomains.forEach(d => filterSet.add(`+.${d}`));
  config.dns["fake-ip-filter"] = Array.from(filterSet);

  if (!config.dns["nameserver-policy"]) config.dns["nameserver-policy"] = {};
  [...eduDomains, ...literatureDomains].forEach(d => {
    config.dns["nameserver-policy"][`+.${d}`] = "system";
  });

  return config;
}