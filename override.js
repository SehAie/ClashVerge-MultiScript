function main(config) {
  // 确保基础数据结构存在，防止报错
  if (!config.proxies) config.proxies = [];
  if (!config["proxy-groups"]) config["proxy-groups"] = [];
  if (!config.rules) config.rules = [];
  if (!config.profile) config.profile = {};
  if (!config.dns) config.dns = {};
  if (!config.tun) config.tun = {};

  // ========== 基础配置优化 ==========
  config.profile["store-selected"] = true;       // 存储已选节点
  config.dns["use-system-hosts"] = false;        // 避免 hosts 污染 DNS 决策
  config.dns.ipv6 = false;                       // 关闭 IPv6 DNS，防止泄漏

  // ========== TUN 排除进程：让 Steam / 加速器绕开 TUN ==========
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

  // ========== 1. 注入自建 Hysteria 2 节点 ==========
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

  // ========== 2. AI 专属策略组（无 DIRECT，添加 REJECT 防漏）==========
  config["proxy-groups"].unshift({
    name: "🤖 AI专属分流",
    type: "select",
    proxies: ["AI-MyVPS", "REJECT"]
  });

  // ========== 3. 海外 AI 域名（走 VPS）==========
  const aiDomainsOverseas = [
    // OpenAI / Anthropic / Google / xAI
    "chatgpt.com", "openai.com", "oaistatic.com", "oaiusercontent.com",
    "anthropic.com", "claude.ai",
    "gemini.google.com", "bard.google.com", "aistudio.google.com",
    "generativelanguage.googleapis.com", "makersuite.google.com", "ai.google.dev",
    "x.ai", "grok.com",
    // Perplexity / Mistral / Meta / Character / Poe
    "perplexity.ai", "mistral.ai", "meta.ai", "llama.meta.com",
    "character.ai", "character.io", "poe.com", "quoracdn.net",
    // HuggingFace / Cohere
    "huggingface.co", "hf.co", "cohere.ai", "cohere.com",
    // 多模态生成（Midjourney / Runway / Stability / ElevenLabs / Suno / Leonardo）
    "midjourney.com", "runwayml.com", "stability.ai",
    "elevenlabs.io", "suno.ai", "suno.com", "leonardo.ai",
    // API 聚合平台
    "openrouter.ai", "together.ai", "groq.com", "replicate.com",
    "featherless.ai", "siliconflow.cn"
  ];

  // ========== 4. 国产 AI 域名（直连）==========
  const aiDomainsCN = [
    "deepseek.com", "deepseek.ai",
    "moonshot.cn", "kimi.com", "kimi.ai",
    "tongyi.aliyun.com", "qwen.ai", "dashscope.aliyuncs.com",
    "yiyan.baidu.com", "wenxin.baidu.com", "ernie.baidu.com",
    "doubao.com", "volcengine.com", "volces.com",
    "chatglm.cn", "zhipuai.cn", "bigmodel.cn",
    "hunyuan.tencent.com", "yuanbao.tencent.com",
    "xfyun.cn", "xinghuo.xfyun.cn", "iflytek.com",
    "minimax.chat", "minimaxi.com", "hailuoai.com",
    "baichuan-ai.com", "baichuanai.com",
    "01.ai", "lingyiwanwu.com",
    "stepfun.com", "yuewen.cn"
  ];

  // ========== 5. 校园网 / 教育网（直连，确保校园出口 IP）==========
  const eduDomains = [
    "edu.cn", "cernet.com", "cernet.net", "calis.edu.cn", "nstl.gov.cn"
  ];

  // ========== 6. 文献数据库（直连，依赖校园 IP 授权）==========
  const literatureDomains = [
    // 中文
    "cnki.net", "cnki.com.cn", "wanfangdata.com.cn", "wanfangtech.net",
    "cqvip.com", "chaoxing.com", "duxiu.com", "sslibrary.com",
    "airitilibrary.cn", "pkulaw.com", "nlc.cn",
    // Web of Science
    "webofscience.com", "webofknowledge.com", "clarivate.com",
    // Elsevier
    "sciencedirect.com", "elsevier.com", "scopus.com", "embase.com",
    "mendeley.com", "ssrn.com",
    // Springer Nature
    "springer.com", "springernature.com", "springeropen.com",
    "nature.com", "biomedcentral.com",
    // Wiley / AAAS / T&F / SAGE
    "wiley.com", "onlinelibrary.wiley.com",
    "science.org", "sciencemag.org", "aaas.org",
    "tandfonline.com", "taylorandfrancis.com",
    "sagepub.com", "sagepublishing.com",
    // 计算机 / 化学 / 物理
    "ieee.org", "computer.org", "acm.org",
    "acs.org", "rsc.org", "cas.org", "reaxys.com",
    "aps.org", "aip.org", "scitation.org",
    // 综合检索
    "jstor.org", "proquest.com", "ebscohost.com", "ebsco.com",
    // 医学
    "nih.gov", "nlm.nih.gov",
    // 牛津 / 剑桥
    "oup.com", "cambridge.org",
    // 开源期刊
    "mdpi.com", "frontiersin.org", "plos.org",
    // 顶级医学期刊
    "bmj.com", "thelancet.com", "nejm.org", "cell.com", "jamanetwork.com",
    // 预印本 / 学术搜索
    "arxiv.org", "biorxiv.org", "medrxiv.org",
    "researchgate.net", "semanticscholar.org", "doi.org", "crossref.org",
    // 顶级学会期刊（PNAS、皇家学会、生理/微生物/综述等）
    "pnas.org", "royalsocietypublishing.org",
    "physiology.org", "asm.org", "annualreviews.org",
    "ams.org", "aeaweb.org",
    // 中型出版商
    "karger.com", "hindawi.com", "degruyter.com", "emerald.com",
    // 冷泉港 / 洛克菲勒
    "cshlpress.com", "cshlp.org", "rupress.org"
  ];

  // ========== 7. CF 风控 & 验证码域名（走 VPS，与 AI 同出口避免国别冲突）==========
  const cfChallengeDomains = [
    "challenges.cloudflare.com",                     // Cloudflare Turnstile
    "nel.cloudflare.com", "cloudflareinsights.com",  // CF 遥测（参与风控指纹）
    "recaptcha.net", "www.recaptcha.net",            // Google reCAPTCHA
    "gstatic.com", "www.gstatic.com"                 // reCAPTCHA 依赖资源
  ];

  // ========== 8. Steam 平台域名（直连）==========
  const steamDomains = [
    "steampowered.com", "steamcommunity.com", "steamstatic.com",
    "steamcontent.com", "steamserver.net", "steamusercontent.com",
    "steam-chat.com", "steamcdn-a.akamaihd.net", "valvesoftware.com"
  ];

  // ========== 9. 进程直连（Steam + 加速器，防止被 Clash 劫持）==========
  const directProcesses = [
    // Steam
    "Steam.exe", "steamwebhelper.exe", "steamservice.exe", "GameOverlayUI.exe",
    // 网易 UU
    "UUGameAssistant.exe", "uu.exe", "UU.exe",
    // 腾讯加速器
    "TenioDL.exe", "QQGameAcc.exe", "TAccelerator.exe",
    // 迅游
    "SNGAccelerator.exe", "xunyou.exe", "XunYou.exe",
    // 奇游
    "qyacc.exe", "QiyuAcc.exe",
    // 雷神
    "LeiShen.exe", "ThunderVPN.exe",
    // 海豚
    "haitun.exe",
    // Steam++ / Watt Toolkit
    "Steam++.exe", "Steam++.Core.exe", "WattToolkit.exe"
  ];

  // ========== 10. 局域网 IP 段（保护内网：NAS、打印机、路由器后台）==========
  const lanCIDRs = [
    "127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16",
    "100.64.0.0/10", "169.254.0.0/16"
  ];
  const lanCIDRs6 = ["::1/128", "fc00::/7", "fe80::/10"];

  // ========== 11. 规则合并（顺序即优先级）==========
  const toDomainRules = (domains, target) =>
    domains.map(d => `DOMAIN-SUFFIX,${d},${target}`);

  // 顺序：CF验证 → 局域网 → 校园/文献/Steam → 进程直连 → 国产AI → 海外AI → 订阅原规则
  // CF验证置顶，压过订阅里的 challenges.cloudflare.com → Copilot 规则
  const customRules = [
    ...toDomainRules(cfChallengeDomains, "🤖 AI专属分流"),
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

  // ========== 12. DNS 增强：fake-ip-filter + nameserver-policy ==========
  // 文献/校园/Steam 走真实 DNS；文献/校园额外强制系统 DNS 以拿到校内授权 IP
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