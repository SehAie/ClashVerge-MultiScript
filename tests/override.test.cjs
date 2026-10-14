const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'override.js'), 'utf8');

function apply(config) {
  const context = vm.createContext({ input: structuredClone(config) });
  return JSON.parse(JSON.stringify(vm.runInContext(`${source}\nmain(input);`, context)));
}

test('builds a usable config structure when no subscription config is supplied', () => {
  const config = apply(undefined);
  assert.ok(Array.isArray(config.proxies));
  assert.ok(Array.isArray(config['proxy-groups']));
  assert.ok(Array.isArray(config.rules));
  assert.equal(config.dns['enhanced-mode'], 'fake-ip');
  assert.equal(config.profile['store-fake-ip'], true);
});

test('routes overseas AI DNS through the same residential chain used for AI traffic', () => {
  const config = apply({});
  const resolvers = [
    'https://1.1.1.1/dns-query#AI-HomeIP',
    'https://8.8.8.8/dns-query#AI-HomeIP'
  ];
  for (const domain of ['chatgpt.com', '+.openai.com', 'api.oaistatsig.com',
    '+.oaistatsig.com', '+.openaimerge.com', '+.claude.ai']) {
    assert.deepEqual(config.dns['nameserver-policy'][domain], resolvers, domain);
  }
  const home = config.proxies.find(proxy => proxy.name === 'AI-HomeIP');
  assert.equal(home['dialer-proxy'], 'AI-MyVPS');
  assert.equal(home.udp, false);
  assert.deepEqual(config['proxy-groups'].find(group => group.name === '🤖 AI专属分流').proxies,
    ['AI-HomeIP', 'REJECT']);
  assert.ok(config.rules.includes('DOMAIN-SUFFIX,openaimerge.com,🤖 AI专属分流'));
});

test('gives domestic AI explicit real-IP system DNS even when GeoSite misses a domain', () => {
  const config = apply({});
  for (const domain of ['deepseek.com', 'qwen.ai', 'kimi.com', 'siliconflow.cn']) {
    assert.ok(config.rules.includes(`DOMAIN-SUFFIX,${domain},DIRECT`), domain);
    assert.ok(config.dns['fake-ip-filter'].includes(`+.${domain}`), domain);
    assert.equal(config.dns['nameserver-policy'][`+.${domain}`], 'system', domain);
  }
});

test('keeps Zotero sync, attachment storage and NCBI on the direct system-DNS path', () => {
  const config = apply({});
  for (const domain of ['zotero.org', 'zotero.net', 'zoterofilestorage.s3.amazonaws.com',
    'zoterofilestorage.s3.us-east-1.amazonaws.com', 'ncbi.nlm.nih.gov']) {
    assert.ok(config.rules.includes(`DOMAIN-SUFFIX,${domain},DIRECT`), domain);
    assert.ok(config.dns['fake-ip-filter'].includes(`+.${domain}`), domain);
    assert.equal(config.dns['nameserver-policy'][`+.${domain}`], 'system', domain);
  }
});

test('routes Steam and Aspera directly without adding process exclusions to TUN', () => {
  const config = apply({ tun: { enable: true, 'exclude-process-name': ['existing.exe'] } });
  assert.ok(config.rules.includes('PROCESS-NAME,Steam.exe,DIRECT'));
  assert.ok(config.rules.includes('PROCESS-NAME,ascp.exe,DIRECT'));
  assert.deepEqual(config.tun, { enable: true, 'exclude-process-name': ['existing.exe'] });
  assert.equal(apply({}).tun['exclude-process-name'], undefined);
});

test('uses system DNS for DIRECT even when the subscription specified another resolver', () => {
  const config = apply({ dns: {
    'direct-nameserver': ['8.8.8.8'],
    'direct-nameserver-follow-policy': true
  } });
  assert.deepEqual(config.dns['direct-nameserver'], ['system']);
  assert.equal(config.dns['direct-nameserver-follow-policy'], false);
});

test('rejects incompatible fake-IP modes rather than silently reversing filter semantics', () => {
  for (const mode of ['whitelist', 'rule']) {
    assert.throws(() => apply({ dns: { 'fake-ip-filter-mode': mode } }), /blacklist/);
  }
});

test('preserves subscription resolvers, filters, custom policies and unrelated settings', () => {
  const config = apply({
    'mixed-port': 7890,
    dns: {
      'default-nameserver': ['9.9.9.9'],
      'proxy-server-nameserver': ['8.8.4.4'],
      nameserver: ['https://dns.example/dns-query'],
      'fake-ip-filter': ['+.example.org'],
      'nameserver-policy': { '+.example.org': '9.9.9.9' }
    },
    sniffer: { 'skip-domain': ['+.example.org'] }
  });
  assert.equal(config['mixed-port'], 7890);
  assert.deepEqual(config.dns['default-nameserver'], ['9.9.9.9']);
  assert.deepEqual(config.dns['proxy-server-nameserver'], ['8.8.4.4']);
  assert.deepEqual(config.dns.nameserver, ['https://dns.example/dns-query']);
  assert.ok(config.dns['fake-ip-filter'].includes('+.example.org'));
  assert.equal(config.dns['nameserver-policy']['+.example.org'], '9.9.9.9');
  assert.ok(config.sniffer['skip-domain'].includes('+.example.org'));
});

test('fills empty resolver arrays so node domains can resolve without depending on the proxy', () => {
  const config = apply({ dns: {
    'default-nameserver': [], 'proxy-server-nameserver': [], nameserver: []
  } });
  assert.deepEqual(config.dns['default-nameserver'], ['223.5.5.5', '119.29.29.29']);
  assert.deepEqual(config.dns['proxy-server-nameserver'], ['223.5.5.5', '119.29.29.29']);
  assert.deepEqual(config.dns.nameserver, ['223.5.5.5', '119.29.29.29']);
});

test('puts custom DIRECT and AI QUIC rules before subscription catch-all rules', () => {
  const config = apply({ rules: ['DOMAIN-SUFFIX,chatgpt.com,Subscription', 'MATCH,Subscription'] });
  const index = rule => config.rules.indexOf(rule);
  const aiQuicRule = 'AND,((NETWORK,UDP),(DST-PORT,443),(DOMAIN-SUFFIX,chatgpt.com)),REJECT';
  assert.ok(index('DOMAIN-SUFFIX,zotero.org,DIRECT') >= 0);
  assert.ok(index('DOMAIN-SUFFIX,zotero.org,DIRECT') < index('MATCH,Subscription'));
  assert.ok(index(aiQuicRule) >= 0);
  assert.ok(index(aiQuicRule) <
    index('DOMAIN-SUFFIX,chatgpt.com,🤖 AI专属分流'));
  assert.ok(index('DOMAIN-SUFFIX,chatgpt.com,🤖 AI专属分流') <
    index('DOMAIN-SUFFIX,chatgpt.com,Subscription'));
  assert.equal(config.rules.at(-1), 'MATCH,Subscription');
});

test('reapplying the script does not duplicate nodes, groups, rules or DNS filters', () => {
  const first = apply({
    proxies: [{ name: 'Subscription', type: 'socks5', server: 'example.org', port: 1080 }],
    'proxy-groups': [{ name: 'Existing', type: 'select', proxies: ['Subscription'] }],
    rules: ['MATCH,Existing']
  });
  assert.deepEqual(apply(first), first);
  assert.equal(first.proxies.filter(proxy => proxy.name === 'Subscription').length, 1);
  assert.ok(first['proxy-groups'].some(group => group.name === 'Existing'));
});

test('leaves TLS fingerprint choice to the subscription', () => {
  assert.equal(apply({})['global-client-fingerprint'], undefined);
  assert.equal(apply({ 'global-client-fingerprint': 'firefox' })['global-client-fingerprint'], 'firefox');
});

test('ships public node placeholders instead of live endpoints or credentials', () => {
  const config = apply({});
  const vps = config.proxies.find(proxy => proxy.name === 'AI-MyVPS');
  const home = config.proxies.find(proxy => proxy.name === 'AI-HomeIP');
  assert.equal(vps.server, 'YOUR_VPS_SERVER_IP_HERE');
  assert.equal(vps.password, 'YOUR_HYSTERIA2_PASSWORD_HERE');
  assert.equal(home.server, 'YOUR_HOMEIP_SOCKS_SERVER_HERE');
  assert.equal(home.username, 'YOUR_HOMEIP_USERNAME_HERE');
  assert.equal(home.password, 'YOUR_HOMEIP_PASSWORD_HERE');
});
