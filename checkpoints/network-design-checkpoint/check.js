// Checks the network design for mistakes. Run with: node check.js

import { BASE_NETWORK, SUBNETS, DEVICES, ipToInt, subnetInfo, lookupRoute, WEBSITE } from './network.js';

let problems = 0;
const ok = (condition, message) => {
  console.log(`${condition ? '✅' : '❌'} ${message}`);
  if (!condition) problems++;
};

// 1. Subnets: inside the /24, no overlap
const base = subnetInfo(BASE_NETWORK);
const ranges = Object.values(SUBNETS)
  .filter((s) => s.cidr.startsWith('192.168.10.'))
  .map((s) => ({ ...s, info: subnetInfo(s.cidr) }));
for (const s of ranges) {
  const i = s.info;
  console.log(`   ${s.cidr.padEnd(18)} mask ${i.mask.padEnd(16)} hosts ${i.firstHost} - ${i.lastHost} (${i.usableHosts}), broadcast ${i.broadcast}`);
  ok(ipToInt(i.network) >= ipToInt(base.network) && ipToInt(i.broadcast) <= ipToInt(base.broadcast), `${s.cidr} is inside ${BASE_NETWORK}`);
}
const sorted = [...ranges].sort((a, b) => ipToInt(a.info.network) - ipToInt(b.info.network));
for (let k = 1; k < sorted.length; k++) {
  ok(ipToInt(sorted[k].info.network) > ipToInt(sorted[k - 1].info.broadcast), `${sorted[k - 1].cidr} and ${sorted[k].cidr} don't overlap`);
}

// 2. Gateways, static ranges and DHCP pools are in the right subnet and don't overlap
for (const key of ['wired', 'wireless']) {
  const s = SUBNETS[key];
  const info = subnetInfo(s.cidr);
  ok(info.contains(s.gateway), `${key}: gateway ${s.gateway} is a usable address of ${s.cidr}`);
  ok(info.contains(s.dhcpPool[0]) && info.contains(s.dhcpPool[1]), `${key}: DHCP pool ${s.dhcpPool.join(' - ')} is inside ${s.cidr}`);
  ok(ipToInt(s.staticRange[1]) < ipToInt(s.dhcpPool[0]), `${key}: static range ends before the DHCP pool starts`);
}

// 3. Every device: unique MAC, unique IP, IP in its subnet, static IPs outside the pool
const macs = DEVICES.map((d) => d.mac.toUpperCase());
ok(new Set(macs).size === macs.length, `all ${macs.length} MAC addresses are unique`);
ok(macs.every((m) => /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(m)), 'all MAC addresses are 48 bits (6 bytes) in the right format');
ok(macs.every((m) => (parseInt(m.slice(0, 2), 16) & 1) === 0), 'all MAC addresses are unicast (first byte is even)');

const ips = DEVICES.filter((d) => d.ip).map((d) => d.ip);
ok(new Set(ips).size === ips.length, `all ${ips.length} IP addresses are unique`);
for (const d of DEVICES.filter((x) => x.ip)) {
  const s = SUBNETS[d.subnet];
  ok(subnetInfo(s.cidr).contains(d.ip), `${d.device} ${d.port}: ${d.ip} is in ${s.cidr}`);
  if (s.dhcpPool) {
    const inPool = ipToInt(d.ip) >= ipToInt(s.dhcpPool[0]) && ipToInt(d.ip) <= ipToInt(s.dhcpPool[1]);
    ok(d.how === 'DHCP' ? inPool : !inPool, `${d.device}: ${d.how === 'DHCP' ? 'DHCP lease is inside' : 'fixed address is outside'} the DHCP pool`);
  }
}

// 4. Routing decisions
ok(lookupRoute(WEBSITE.ip).destination === '0.0.0.0/0', `${WEBSITE.ip} (website) uses the default route`);
ok(lookupRoute('192.168.10.5').iface === 'G0/1', 'the printer (192.168.10.5) is reached through G0/1');
ok(lookupRoute('192.168.10.70').iface === 'G0/2', 'the laptop (192.168.10.70) is reached through G0/2');

console.log(problems === 0 ? '\nThe design has no problems.' : `\n${problems} problem(s) found.`);
process.exitCode = problems === 0 ? 0 : 1;
