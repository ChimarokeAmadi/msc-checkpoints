// Builds report.html from network.js. Run with: node build-report.js

import { writeFileSync } from 'node:fs';
import {
  SUBNETS, DEVICES, byId, subnetInfo, toBinary, ROUTING_TABLE, lookupRoute,
  DNS_SERVERS, WEBSITE, ISP_ROUTER, BASE_NETWORK, intToIp, ipToInt,
} from './network.js';

const AUTHOR = 'Chimaroke Amadi';
const wired = subnetInfo(SUBNETS.wired.cidr);
const wireless = subnetInfo(SUBNETS.wireless.cidr);
const reserved = subnetInfo(SUBNETS.reserved.cidr);
const wan = subnetInfo(SUBNETS.wan.cidr);

const pc1 = byId('PC1');
const printer = byId('PRN');
const laptop = byId('LAPTOP');
const apRadio = byId('AP-RADIO');
const rWan = byId('R1-G0/0');
const rWired = byId('R1-G0/1');
const rWireless = byId('R1-G0/2');

// ---------- Topology diagram ----------
function topology() {
  const node = (x, y, title, lines, color) => `
    <g transform="translate(${x},${y})">
      <rect x="-62" y="-17" width="124" height="34" rx="7" fill="${color}" stroke="#1e293b" stroke-width="1.2"/>
      <text y="5" text-anchor="middle" class="nodeTitle">${title}</text>
      ${lines.map((l, i) => `<text y="${31 + i * 12}" text-anchor="middle" class="nodeInfo">${l}</text>`).join('')}
    </g>`;
  // labelAt = where along the line the port label goes (0 = start, 1 = end)
  const link = (x1, y1, x2, y2, label = '', dashed = false, labelAt = 0.5) => `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#334155" stroke-width="2" ${dashed ? 'stroke-dasharray="6 5"' : ''}/>
    ${label ? `<text x="${x1 + (x2 - x1) * labelAt + 6}" y="${y1 + (y2 - y1) * labelAt - 4}" class="port">${label}</text>` : ''}`;
  const info = (d) => [d.ip ?? '', d.mac];

  return `<svg viewBox="0 0 760 590" class="topo" role="img" aria-label="Network diagram">
    <rect x="12" y="212" width="488" height="370" rx="12" fill="#eff6ff" stroke="#93c5fd"/>
    <text x="26" y="232" class="area">Wired subnet ${SUBNETS.wired.cidr}</text>
    <rect x="512" y="212" width="236" height="250" rx="12" fill="#f0fdf4" stroke="#86efac"/>
    <text x="526" y="232" class="area">Wireless subnet ${SUBNETS.wireless.cidr}</text>

    <!-- links -->
    ${link(380, 52, 380, 123, 'G0/0  ' + rWan.ip)}
    ${link(380, 157, 190, 263, 'G0/1', false, 0.25)}
    ${link(380, 157, 620, 263, 'G0/2', false, 0.25)}
    ${link(190, 330, 80, 383)}
    ${link(190, 330, 200, 383)}
    ${link(190, 330, 380, 383)}
    ${link(380, 450, 250, 503)}
    ${link(380, 450, 380, 503)}
    ${link(380, 450, 510, 503)}
    ${link(620, 330, 570, 393, '', true)}
    ${link(620, 330, 700, 393, '', true)}

    <!-- internet -->
    <g transform="translate(380,30)">
      <ellipse rx="110" ry="24" fill="#f1f5f9" stroke="#64748b"/>
      <text y="-2" text-anchor="middle" class="nodeTitle" fill="#334155">Internet (ISP)</text>
      <text y="12" text-anchor="middle" class="nodeInfo">ISP gateway ${ISP_ROUTER.ip}</text>
    </g>

    ${node(380, 140, 'Router R1', [], '#fde68a')}
    <text x="452" y="136" class="nodeInfo" text-anchor="start">G0/1 ${rWired.ip}</text>
    <text x="452" y="148" class="nodeInfo" text-anchor="start">G0/2 ${rWireless.ip}</text>
    <text x="452" y="160" class="nodeInfo" text-anchor="start">NAT · DHCP server</text>

    ${node(190, 280, 'Switch SW1', info(byId('SW1')), '#bfdbfe')}
    ${node(80, 400, 'PC1', info(pc1), '#ffffff')}
    ${node(200, 400, 'PC2', info(byId('PC2')), '#ffffff')}
    ${node(380, 400, 'Switch SW2', info(byId('SW2')), '#bfdbfe')}
    ${node(250, 520, 'PC3', info(byId('PC3')), '#ffffff')}
    ${node(380, 520, 'PC4', info(byId('PC4')), '#ffffff')}
    ${node(510, 520, 'Printer', info(printer), '#fbcfe8')}
    <rect x="566" y="503" width="0" height="0"/>

    ${node(620, 280, 'Access point AP1', [byId('AP-ETH').ip, 'BSSID ' + apRadio.mac], '#bbf7d0')}
    ${node(570, 410, 'Laptop (Wi-Fi)', info(laptop), '#ffffff')}
    ${node(700, 410, 'Phone (Wi-Fi)', info(byId('PHONE')), '#ffffff')}
  </svg>`;
}

// ---------- Tables ----------
const macTable = DEVICES.map((d) => `<tr><td>${d.device}</td><td>${d.port}</td><td><code>${d.mac}</code></td><td><code>${d.mac.slice(0, 8)}</code></td><td><code>${d.mac.slice(9)}</code></td></tr>`).join('');

const ipTable = DEVICES.filter((d) => d.ip).map((d) => {
  const s = SUBNETS[d.subnet];
  const info = subnetInfo(s.cidr);
  const gateway = d.type === 'router' ? '—' : s.gateway;
  return `<tr><td>${d.device}</td><td>${d.port}</td><td><b>${d.ip}</b>/${info.prefix}</td><td>${info.mask}</td><td>${gateway}</td><td>${d.how}</td></tr>`;
}).join('');

const subnetRow = (key, use) => {
  const s = SUBNETS[key];
  const i = subnetInfo(s.cidr);
  return `<tr><td class="nw"><b>${s.cidr}</b></td><td class="nw">${i.mask}</td><td class="nw">${i.firstHost} – ${i.lastHost}</td><td class="nw">${i.broadcast}</td><td>${i.usableHosts}</td><td class="nw">${s.gateway ?? '—'}</td><td>${use}</td></tr>`;
};

const routeRows = ROUTING_TABLE.map((r) => `<tr><td>${r.code}</td><td>${r.destination}</td><td>${r.nextHop}</td><td>${r.iface}</td></tr>`).join('');

// Ethernet frame fields (PC1 -> printer)
const frameFields = [
  ['Preamble', '7 B', '10101010 × 7', 'Lets the receiver synchronise its clock'],
  ['SFD', '1 B', '10101011', 'Start Frame Delimiter: "the frame starts now"'],
  ['Destination MAC', '6 B', printer.mac, 'The printer\'s NIC (learned with ARP)'],
  ['Source MAC', '6 B', pc1.mac, 'PC1\'s NIC'],
  ['EtherType', '2 B', '0x0800', 'The payload is an IPv4 packet (0x0806 would be ARP)'],
  ['Payload', '46–1500 B', 'IPv4 packet', `IP header (${pc1.ip} → ${printer.ip}) + TCP header (port 9100) + print data`],
  ['FCS', '4 B', 'CRC-32', 'Frame Check Sequence: the receiver recalculates it to detect damaged frames'],
];
const frameBar = frameFields
  .map(([name, size], i) => `<div class="field f${i}"><b>${name}</b><small>${size}</small></div>`)
  .join('');
const frameRows = frameFields.map(([name, size, value, why]) => `<tr><td><b>${name}</b></td><td>${size}</td><td><code>${value}</code></td><td>${why}</td></tr>`).join('');

// Hop-by-hop table for Part 3
const ephemeral = 51514;
const natPort = 40001;
const hops = [
  ['1', 'Laptop → AP1 (802.11 Wi-Fi)', `${laptop.mac} → ${apRadio.mac} (BSSID)<br><small>3rd address = router ${rWireless.mac}</small>`, `${laptop.ip}:${ephemeral}`, `${WEBSITE.ip}:443`, '64'],
  ['2', 'AP1 → R1 G0/2 (Ethernet)', `${laptop.mac} → ${rWireless.mac}`, `${laptop.ip}:${ephemeral}`, `${WEBSITE.ip}:443`, '64'],
  ['3', 'R1 G0/0 → ISP gateway', `${rWan.mac} → ${ISP_ROUTER.mac}`, `<b>${rWan.ip}:${natPort}</b> (NAT)`, `${WEBSITE.ip}:443`, '<b>63</b>'],
  ['4…n', 'Internet routers', 'new MACs on every link', `${rWan.ip}:${natPort}`, `${WEBSITE.ip}:443`, '62, 61, …'],
  ['back', 'Reply arrives at R1 G0/0', `ISP MAC → ${rWan.mac}`, `${WEBSITE.ip}:443`, `${rWan.ip}:${natPort}`, '≈ 50'],
  ['back', 'R1 G0/2 → AP1 → Laptop', `${rWireless.mac} → ${laptop.mac}`, `${WEBSITE.ip}:443`, `<b>${laptop.ip}:${ephemeral}</b> (NAT reversed)`, '≈ 49'],
];
const hopRows = hops.map((h) => `<tr>${h.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');

// Longest prefix match explanation
const lpm = (addr) => ROUTING_TABLE.map((r) => {
  const [net, prefix] = r.destination.split('/');
  const size = 2 ** (32 - Number(prefix));
  const match = Math.floor(ipToInt(addr) / size) === Math.floor(ipToInt(net) / size);
  return `<tr class="${match ? 'match' : ''}"><td>${r.destination}</td><td>${match ? '✔ matches' : '✘ no match'}</td><td>/${prefix}</td></tr>`;
}).join('');

const andRow = (ip, mask) => intToIp(Number(BigInt(ipToInt(ip)) & BigInt(ipToInt(mask))));

// ---------- HTML ----------
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Company Floor Network</title>
<style>
  @page { size: A4; margin: 15mm 13mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; font-size: 10.3pt; max-width: 840px; margin: 0 auto; padding: 24px 16px; background: #fff; }
  h1 { font-size: 22pt; margin: 0 0 4px; color: #0f4c81; }
  h2 { font-size: 15pt; color: #0f4c81; border-bottom: 2px solid #bae6fd; padding-bottom: 4px; margin-top: 26px; break-after: avoid; }
  h3 { font-size: 12pt; margin: 16px 0 6px; break-after: avoid; }
  .subtitle { color: #64748b; margin: 0 0 14px; }
  .part { break-before: page; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0 12px; font-size: 9pt; break-inside: avoid; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #e0f2fe; }
  tr.match td { background: #dcfce7; font-weight: 600; }
  code { font-size: 8.8pt; }
  td.nw { white-space: nowrap; }
  table.small { font-size: 8.4pt; }
  pre { background: #0f172a; color: #e2e8f0; padding: 10px 12px; border-radius: 6px; font-size: 8.6pt; line-height: 1.4; break-inside: avoid; white-space: pre-wrap; }
  .box { background: #f1f5f9; border-left: 4px solid #0284c7; padding: 8px 12px; margin: 10px 0; border-radius: 4px; break-inside: avoid; }
  .key { background: #ecfdf5; border-left-color: #16a34a; }
  svg.topo { width: 100%; height: auto; margin: 6px 0; }
  svg .nodeTitle { font-size: 12px; font-weight: 700; fill: #0f172a; }
  svg .nodeInfo { font-size: 9.5px; fill: #334155; font-family: Menlo, monospace; }
  svg .port { font-size: 10px; fill: #b45309; font-weight: 700; }
  svg .area { font-size: 12px; font-weight: 700; fill: #475569; }
  .frame { display: flex; margin: 8px 0 4px; border: 1.5px solid #0f172a; border-radius: 4px; overflow: hidden; break-inside: avoid; }
  .field { padding: 6px 4px; text-align: center; border-right: 1px solid #0f172a; font-size: 8.5pt; display: flex; flex-direction: column; justify-content: center;
           -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .field:last-child { border-right: none; }
  .field small { color: #475569; }
  .f0, .f1 { background: #e2e8f0; flex: 1; } .f2 { background: #fde68a; flex: 1.6; } .f3 { background: #fed7aa; flex: 1.6; }
  .f4 { background: #ddd6fe; flex: 1.1; } .f5 { background: #bbf7d0; flex: 3.6; } .f6 { background: #fecaca; flex: 0.9; }
  .steps li { margin-bottom: 6px; }
  .seq { font-family: Menlo, monospace; font-size: 8.8pt; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 640px) { .two { grid-template-columns: 1fr; } }
  @media print { body { padding: 0; } }
</style></head><body>

<h1>Company Floor Network</h1>
<p class="subtitle">LAN design · data link layer · IP addressing · routing and NAT<br>${AUTHOR} · GoMyCode</p>

<p>For this checkpoint I designed a small network for one company floor. It has one router with internet access, two switches, four employee PCs, a printer, and a Wi-Fi access point with two wireless devices. The report follows a frame and a packet through the network and explains what each layer does with them. All the addresses come from one data file, and a small checking script (<code>check.js</code>) confirms that the subnets don't overlap, every MAC and IP address is unique, every device is in the right subnet, and the DHCP pools don't clash with the fixed addresses.</p>

<h3>Network diagram</h3>
${topology()}
<p>The router connects to the internet on <b>G0/0</b>. Its <b>G0/1</b> port goes to switch SW1, which connects PC1, PC2 and switch SW2. SW2 connects PC3, PC4 and the printer. The router's <b>G0/2</b> port goes to the access point, which serves the laptop and the phone over Wi-Fi (dashed lines). The wired and wireless devices are in two different subnets, so the router sits between them as well as between the LAN and the internet.</p>

<!-- ================= PART 1 ================= -->
<section class="part">
<h2>Part 1: MAC Addresses and Frame Handling</h2>

<h3>1.1 MAC addresses</h3>
<p>A MAC address is the 48-bit (6-byte) hardware address of a network interface, written as six pairs of hex digits. The first 3 bytes are the <b>OUI</b> (Organizationally Unique Identifier, which says who made the card), and the last 3 bytes identify the card itself. MAC addresses are used to deliver frames <i>within one local network</i>. Every interface has its own MAC, so the router has three (one per port) and the access point has two (its wired port, and its radio, whose MAC is the <b>BSSID</b> of the Wi-Fi network). These are example addresses I assigned for the design.</p>
<table><tr><th>Device</th><th>Interface</th><th>MAC address</th><th>OUI (maker)</th><th>Device part</th></tr>${macTable}</table>
<p>All of them are <b>unicast</b> addresses (the lowest bit of the first byte is 0). The special address <code>FF:FF:FF:FF:FF:FF</code> is the <b>broadcast</b> address: a frame sent to it is delivered to every device in the same network. ARP and DHCP use it.</p>

<h3>1.2 A frame from PC1 to the printer</h3>
<p>PC1 (${pc1.ip}) and the printer (${printer.ip}) are in the same subnet, so the data doesn't go through the router. It travels as an Ethernet frame through SW1 and SW2. Before sending, PC1 needs the printer's MAC address. If it isn't in its ARP cache, PC1 sends an <b>ARP request</b>, a broadcast frame (destination <code>FF:FF:FF:FF:FF:FF</code>, EtherType <code>0x0806</code>) asking "who has ${printer.ip}? Tell ${pc1.ip}". Only the printer answers, with a unicast <b>ARP reply</b>: "${printer.ip} is at ${printer.mac}". Then PC1 sends the print job in an Ethernet II frame:</p>
<div class="frame">${frameBar}</div>
<table><tr><th>Field</th><th>Size</th><th>Value in this frame</th><th>Purpose</th></tr>${frameRows}</table>
<p>The payload is the IP packet. Its header has source ${pc1.ip}, destination ${printer.ip}, TTL 64 and protocol 6 (TCP). Inside it is a TCP segment to port <b>9100</b> (raw printing; IPP on port 631 would also work) carrying the document. If the job is bigger than 1500 bytes, it's split into several frames. Very small payloads are padded up to 46 bytes, because an Ethernet frame must be at least 64 bytes for collision detection to work.</p>

<p><b>How the switches deliver it:</b> a switch learns which MAC address is on which port by reading the <i>source</i> MAC of every frame it receives, and stores this in its <b>MAC address table</b> (CAM table). For the <i>destination</i> MAC, it forwards the frame only out of the port where that MAC was learned. If it doesn't know the MAC yet, it floods the frame out of every port except the one it came in on.</p>
<div class="two">
<table><tr><th colspan="2">SW1 MAC address table</th></tr><tr><th>MAC</th><th>Port</th></tr>
<tr><td><code>${pc1.mac}</code> (PC1)</td><td>Fa0/1</td></tr><tr><td><code>${byId('PC2').mac}</code> (PC2)</td><td>Fa0/2</td></tr>
<tr><td><code>${printer.mac}</code> (Printer)</td><td>Gi0/2 (to SW2)</td></tr><tr><td><code>${rWired.mac}</code> (Router)</td><td>Gi0/1 (to R1)</td></tr></table>
<table><tr><th colspan="2">SW2 MAC address table</th></tr><tr><th>MAC</th><th>Port</th></tr>
<tr><td><code>${pc1.mac}</code> (PC1)</td><td>Gi0/1 (to SW1)</td></tr><tr><td><code>${byId('PC3').mac}</code> (PC3)</td><td>Fa0/1</td></tr>
<tr><td><code>${byId('PC4').mac}</code> (PC4)</td><td>Fa0/2</td></tr><tr><td><code>${printer.mac}</code> (Printer)</td><td>Fa0/3</td></tr></table>
</div>
<p>So the frame goes PC1 → SW1 (out Gi0/2) → SW2 (out Fa0/3) → printer. The switches <b>don't change the frame</b>: the MAC addresses, the IP packet and the TTL stay exactly the same, because switches work at layer 2. The printer checks the FCS, sees its own MAC as the destination, reads EtherType 0x0800 and passes the packet up to IP and then TCP.</p>

<h3>1.3 Avoiding and handling collisions</h3>
<p>A <b>collision</b> happens when two devices transmit on the same shared medium at the same time and their signals get mixed up.</p>
<p><b>Wired Ethernet: CSMA/CD, and why switches make it unnecessary.</b> Old Ethernet used hubs or one shared cable, where all devices were in one <i>collision domain</i>. It used <b>CSMA/CD</b> (Carrier Sense Multiple Access with Collision Detection). A device listens and only transmits when the cable is quiet. It keeps listening while it transmits, and if it detects a collision it stops, sends a <b>jam signal</b> so everyone knows, and waits a random time before trying again (<b>binary exponential backoff</b>: after the n-th collision it waits a random number of slot times between 0 and 2ⁿ − 1, giving up after 16 attempts). In this design the PCs and the printer are connected to <b>switches in full-duplex mode</b>. Each switch port is its own collision domain with only one device on it, and full duplex uses separate wire pairs for sending and receiving, so <b>collisions can't happen</b> and CSMA/CD is effectively switched off. If two PCs send to the printer at once, the switch <b>buffers</b> the frames in a queue instead of letting them collide. All the wired devices are still in one <i>broadcast domain</i>, which the router limits, so broadcasts don't reach the Wi-Fi subnet.</p>
<p><b>Wi-Fi: CSMA/CA.</b> Wireless is different. All devices share the same radio channel, and a device can't listen while it's transmitting (its own signal is much stronger), so it can't <i>detect</i> collisions. Instead, 802.11 tries to <b>avoid</b> them with <b>CSMA/CA</b> (Collision Avoidance):</p>
<ol class="steps">
<li><b>Listen first:</b> the device checks that the channel is free (physical carrier sense). It also checks the <b>NAV</b> (Network Allocation Vector), a timer set from the "duration" field of frames it overhears, which says how long the channel is already booked (virtual carrier sense).</li>
<li><b>Wait DIFS plus a random backoff:</b> even when the channel is free, it waits a fixed gap (DIFS) and then a random number of slots from its <i>contention window</i>. The countdown pauses whenever someone else transmits. Because the laptop and the phone almost never pick the same number, they rarely start at the same moment.</li>
<li><b>Transmit, then wait for an ACK:</b> the receiver (here the access point) checks the frame and sends an <b>ACK</b> after a short gap (SIFS). If there's no ACK, the sender assumes a collision or interference, <b>doubles its contention window</b> and tries again.</li>
<li><b>RTS/CTS for hidden nodes (optional):</b> if the laptop and phone are far apart and can't hear each other, but both can hear the AP, they could collide at the AP without knowing it. With RTS/CTS the sender first sends a short <i>Request To Send</i>, and the AP answers <i>Clear To Send</i>. Everyone who hears the CTS sets their NAV and stays quiet.</li>
</ol>
<div class="box key"><b>In short:</b> wired Ethernet with switches has no collisions (each full-duplex port is its own collision domain, and CSMA/CD was only needed for shared, half-duplex links), while Wi-Fi shares the air, so it uses CSMA/CA with random backoff and ACKs to <i>avoid</i> collisions it can't detect.</div>
</section>

<!-- ================= PART 2 ================= -->
<section class="part">
<h2>Part 2: IP Addressing and Subnetting</h2>

<h3>2.1 Choosing the address range</h3>
<p>I chose <b>${BASE_NETWORK}</b>, from the 192.168.0.0/16 private block (RFC 1918). Private addresses are free to use inside any organisation and are never routed on the internet, which is why the router needs NAT (Part 3). A /24 gives 256 addresses, which is plenty for one floor.</p>

<h3>2.2 Subnetting: wired and wireless separated</h3>
<p>I split the /24 into smaller subnets so wired and wireless devices are in <b>separate subnets</b>. This means broadcasts from one don't reach the other, a laptop or phone (more likely to be lost or infected) can't reach the PCs and printer directly unless the router allows it, and each subnet can have its own rules and DHCP settings. Borrowing 2 bits from the host part gives /26 subnets of 64 addresses (62 usable). I used two of them, plus the upper half kept as a /25 for later.</p>
<table class="small"><tr><th>Subnet</th><th>Mask</th><th>Usable hosts</th><th>Broadcast</th><th>#</th><th>Gateway</th><th>Used for</th></tr>
${subnetRow('wired', 'PCs, printer, switches')}
${subnetRow('wireless', 'Access point and Wi-Fi devices')}
${subnetRow('reserved', 'Free for later (guest Wi-Fi, servers…)')}
${subnetRow('wan', 'Public link between R1 and the ISP')}</table>
<p><b>How /26 works:</b> the mask is <code>${toBinary(wired.mask)}</code> = ${wired.mask}. The first 26 bits are the network, and the last 6 bits (2⁶ = 64 addresses) are for hosts. The first address of each block is the network address and the last is the broadcast address, so 64 − 2 = <b>62 usable</b> addresses per subnet. The blocks start every 64: .0, .64, .128 and .192. The WAN link is a /30 (4 addresses, 2 usable), the usual size for a link between two routers.</p>

<h3>2.3 Address assignment</h3>
<p>In each subnet, the first addresses are kept for devices that need a <b>fixed address</b>: the router (the gateway is always the first usable address), the switches' management interfaces, the printer and the access point. Everything else gets an address from <b>DHCP</b>. Wired: fixed ${SUBNETS.wired.staticRange.join(' – ')}, DHCP pool ${SUBNETS.wired.dhcpPool.join(' – ')}. Wireless: fixed ${SUBNETS.wireless.staticRange.join(' – ')}, DHCP pool ${SUBNETS.wireless.dhcpPool.join(' – ')}. The DHCP addresses shown are the ones the devices would typically receive.</p>
<table><tr><th>Device</th><th>Interface</th><th>IP address</th><th>Subnet mask</th><th>Default gateway</th><th>How</th></tr>${ipTable}</table>
<p>The <b>default gateway</b> is the router interface in a device's own subnet: <b>${SUBNETS.wired.gateway}</b> for the wired devices and <b>${SUBNETS.wireless.gateway}</b> for the wireless ones. A device sends any packet for another network (the other subnet or the internet) to its gateway. All devices use DNS servers ${DNS_SERVERS.join(' and ')}. The printer has a fixed address so the PCs' printer settings never break. With DHCP, it could also get a <i>reservation</i> (always the same address for its MAC).</p>

<h3>2.4 The role of DHCP</h3>
<p><b>DHCP</b> (Dynamic Host Configuration Protocol) gives devices their network settings automatically when they connect, so nobody has to type them on every PC and phone, and two devices can never be given the same address by mistake. Here the router R1 is the DHCP server, with one pool per subnet. Each pool hands out an <b>IP address</b>, the <b>subnet mask</b>, the <b>default gateway</b>, the <b>DNS servers</b> and a <b>lease time</b>. When the lease runs out, the address goes back to the pool, which suits Wi-Fi devices that come and go. When the laptop joins the Wi-Fi, it goes through the four <b>DORA</b> steps:</p>
<table class="seq"><tr><th>#</th><th>Message</th><th>From → To</th><th>Content</th></tr>
<tr><td>1</td><td><b>D</b>ISCOVER</td><td>0.0.0.0 → 255.255.255.255 (broadcast)<br>MAC ${laptop.mac} → FF:FF:FF:FF:FF:FF</td><td>"I need an address." It has no IP yet, so it broadcasts (UDP 68 → 67).</td></tr>
<tr><td>2</td><td><b>O</b>FFER</td><td>${rWireless.ip} → ${laptop.ip}</td><td>"You can have ${laptop.ip}, mask ${wireless.mask}, gateway ${SUBNETS.wireless.gateway}, DNS ${DNS_SERVERS[0]}, lease 2 h."</td></tr>
<tr><td>3</td><td><b>R</b>EQUEST</td><td>0.0.0.0 → 255.255.255.255</td><td>"I accept ${laptop.ip}." Broadcast, so any other DHCP server knows its offer was declined.</td></tr>
<tr><td>4</td><td><b>A</b>CK</td><td>${rWireless.ip} → ${laptop.ip}</td><td>"Confirmed." The laptop now configures its interface.</td></tr></table>
<p>The configuration on the router, written as Cisco IOS commands:</p>
<pre>ip dhcp excluded-address ${SUBNETS.wired.staticRange.join(' ')}        ! fixed addresses are never handed out
ip dhcp excluded-address ${SUBNETS.wireless.staticRange.join(' ')}
ip dhcp pool WIRED
 network ${wired.network} ${wired.mask}
 default-router ${SUBNETS.wired.gateway}
 dns-server ${DNS_SERVERS.join(' ')}
 lease 0 8                                            ! 8 hours: PCs stay all day
ip dhcp pool WIRELESS
 network ${wireless.network} ${wireless.mask}
 default-router ${SUBNETS.wireless.gateway}
 dns-server ${DNS_SERVERS.join(' ')}
 lease 0 2                                            ! 2 hours: phones come and go</pre>
<p>The router can answer both subnets directly because it has an interface in each one. If the DHCP server were in another subnet, the router would need <code>ip helper-address</code> to forward the broadcast DISCOVER messages, because routers don't forward broadcasts.</p>
</section>

<!-- ================= PART 3 ================= -->
<section class="part">
<h2>Part 3: Routing and Packet Forwarding</h2>
<p>Scenario: the <b>laptop</b> (${laptop.ip}) opens <b>https://${WEBSITE.name}</b>. For the example I use ${WEBSITE.ip} as the website's public IP address (an address reserved for documentation).</p>

<h3>3.1 What happens, step by step</h3>
<ol class="steps">
<li><b>Configuration:</b> the laptop already has its IP, mask, gateway and DNS from DHCP (Part 2).</li>
<li><b>DNS lookup:</b> the laptop asks its DNS server (${DNS_SERVERS[0]}, UDP port 53) for the IP of ${WEBSITE.name} and gets ${WEBSITE.ip}. The DNS query itself travels the same way as the steps below.</li>
<li><b>Local or remote?</b> The laptop ANDs the destination with its mask: ${WEBSITE.ip} AND ${wireless.mask} = <b>${andRow(WEBSITE.ip, wireless.mask)}</b>, which isn't its own network (${wireless.network}). So the packet must go to the <b>default gateway</b> ${SUBNETS.wireless.gateway}. (For the AP at ${byId('AP-ETH').ip}, the result would be ${andRow(byId('AP-ETH').ip, wireless.mask)}, the same network, and it would send directly.)</li>
<li><b>ARP for the gateway:</b> the laptop needs the gateway's MAC, so it ARPs for ${SUBNETS.wireless.gateway} and learns <code>${rWireless.mac}</code>. Note that the IP destination is the website, but the frame's destination MAC is the router.</li>
<li><b>Building the packet:</b> TCP (for HTTPS, port 443) from a random source port ${ephemeral}. The IP header has source ${laptop.ip}, destination ${WEBSITE.ip}, TTL 64 and protocol 6. (The very first packets are the TCP handshake SYN, SYN-ACK and ACK, then the TLS handshake. They all follow this same path.)</li>
<li><b>Over the air to the AP:</b> the packet goes in an <b>802.11 frame</b>. Wi-Fi frames have 3 addresses here: receiver = the AP's BSSID <code>${apRadio.mac}</code>, transmitter = the laptop <code>${laptop.mac}</code>, final destination = the router <code>${rWireless.mac}</code>. CSMA/CA decides when it may transmit, and the AP ACKs it.</li>
<li><b>The AP bridges it to Ethernet:</b> the AP works at layer 2. It turns the 802.11 frame into an Ethernet frame (destination ${rWireless.mac}, source ${laptop.mac}) and sends it up its cable to router port G0/2.</li>
<li><b>The router processes the IP header</b> (3.2): it checks the frame's FCS, sees its own MAC, removes the Ethernet header, checks the IP header checksum, <b>decreases the TTL</b> (64 → 63), and looks up the destination in its <b>routing table</b> (3.3). The result is the default route, out G0/0.</li>
<li><b>NAT</b> (3.4): because the source is a private address, the router replaces <code>${laptop.ip}:${ephemeral}</code> with its public address <code>${rWan.ip}:${natPort}</code>, remembers the translation, and recalculates the checksums.</li>
<li><b>New frame for the next link:</b> the router ARPs for the ISP gateway ${ISP_ROUTER.ip} and puts the packet in a <b>new Ethernet frame</b>: source ${rWan.mac}, destination ${ISP_ROUTER.mac}.</li>
<li><b>Across the internet:</b> every router on the way does the same thing: reads the destination IP, decreases TTL, does a longest-prefix-match lookup (internet routers learn routes with protocols like BGP and OSPF), and builds a new frame for the next link. <b>The MAC addresses change on every hop, but the IP addresses don't</b> (after NAT). If TTL ever reaches 0, the packet is dropped and an ICMP "time exceeded" message is sent back, which prevents endless loops.</li>
<li><b>The way back:</b> the server replies to <code>${rWan.ip}:${natPort}</code>. R1 finds that port in its NAT table, changes the destination back to <code>${laptop.ip}:${ephemeral}</code>, sees in its routing table that ${wireless.cidr} is directly connected on G0/2, and sends it in a frame to the laptop's MAC. The AP converts it to an 802.11 frame, and the laptop's browser receives the web page.</li>
</ol>

<h3>Headers on each part of the path</h3>
<table><tr><th>Hop</th><th>Link</th><th>Layer 2: source → destination MAC</th><th>Source IP:port</th><th>Destination IP:port</th><th>TTL</th></tr>${hopRows}</table>

<h3>3.2 How routers use the IP header</h3>
<p>Switches only look at the MAC addresses in the frame. A router removes the frame and works on the <b>IPv4 header</b>:</p>
<table><tr><th>Field</th><th>What the router does with it</th></tr>
<tr><td><b>Destination IP address</b></td><td>The most important field: it's looked up in the routing table to choose the next hop and the outgoing interface.</td></tr>
<tr><td><b>TTL (Time To Live)</b></td><td>Decreased by 1 at every router. At 0 the packet is dropped and an ICMP "Time Exceeded" is sent back, so packets can't loop forever.</td></tr>
<tr><td><b>Header checksum</b></td><td>Checked when the packet arrives (damaged headers are dropped) and recalculated after TTL or NAT changes.</td></tr>
<tr><td><b>Source IP address</b></td><td>Normally not changed. Here, NAT replaces it at R1. It's also used by ACLs (firewall rules) and for sending ICMP errors.</td></tr>
<tr><td><b>Total length, ID, flags, fragment offset</b></td><td>If the next link's MTU is smaller than the packet, the router can fragment it (unless the "Don't Fragment" flag is set, in which case it drops the packet and tells the sender).</td></tr>
<tr><td><b>Protocol</b> (6 = TCP), <b>DSCP</b></td><td>Protocol tells NAT and firewalls which header comes next (here TCP, for the ports). DSCP can be used to prioritise traffic (QoS).</td></tr></table>

<h3>3.3 How the router chooses the next hop</h3>
<p>R1's routing table. <b>C</b> routes are networks it's directly connected to, and <b>S*</b> is the static <b>default route</b> to the ISP ("gateway of last resort"):</p>
<table><tr><th>Code</th><th>Destination</th><th>Next hop</th><th>Interface</th></tr>${routeRows}</table>
<p>The router compares the destination IP with every route and picks the matching route with the <b>longest prefix</b> (the most specific one). The default route 0.0.0.0/0 matches everything, but it has the shortest prefix, so it's only used when nothing more specific matches.</p>
<div class="two">
<div><b>Outgoing packet to ${WEBSITE.ip}</b><table><tr><th>Route</th><th>Match?</th><th>Prefix</th></tr>${lpm(WEBSITE.ip)}</table>
→ only the default route matches: <b>next hop ${lookupRoute(WEBSITE.ip).nextHop} via ${lookupRoute(WEBSITE.ip).iface}</b>.</div>
<div><b>Reply to ${laptop.ip} (after NAT)</b><table><tr><th>Route</th><th>Match?</th><th>Prefix</th></tr>${lpm(laptop.ip)}</table>
→ /26 beats /0: <b>directly connected, out ${lookupRoute(laptop.ip).iface}</b>, to the laptop itself.</div></div>
<p>When the next hop is "directly connected", the router delivers to the destination host itself and ARPs for <i>its</i> MAC. Otherwise it ARPs for the next-hop router's MAC. Either way, forwarding never changes the destination IP in the packet (only NAT does, at the edge of the network). Only the frame around it changes.</p>

<h3>3.4 The role of NAT at the router</h3>
<p>The 192.168.10.x addresses are private, so the internet can't route replies to them, and the ISP gives the company only <b>one public address</b> (${rWan.ip}). <b>NAT</b> (Network Address Translation) on R1 solves both problems. More precisely, it's <b>PAT</b> (Port Address Translation, "NAT overload"): all ${DEVICES.filter((d) => ['pc', 'wireless'].includes(d.type)).length} PCs and wireless devices share the one public IP, and the router tells their connections apart by <b>port number</b>. It keeps a translation table:</p>
<table><tr><th>Inside local (private)</th><th>Inside global (public)</th><th>Outside (website)</th><th>Device</th></tr>
<tr><td>${laptop.ip}:${ephemeral}</td><td>${rWan.ip}:${natPort}</td><td>${WEBSITE.ip}:443</td><td>Laptop</td></tr>
<tr><td>${byId('PHONE').ip}:60200</td><td>${rWan.ip}:${natPort + 1}</td><td>${WEBSITE.ip}:443</td><td>Phone</td></tr>
<tr><td>${pc1.ip}:${ephemeral}</td><td>${rWan.ip}:${natPort + 2}</td><td>${WEBSITE.ip}:443</td><td>PC1 (same source port as the laptop!)</td></tr></table>
<p>The last row shows why ports are translated too: PC1 and the laptop happen to use the same source port, so the router gives each connection a different public port to keep the replies apart. For outgoing packets, NAT rewrites the <b>source</b> IP and port. For replies, it looks up the destination port and rewrites the <b>destination</b> back. It also protects the LAN, because a packet from the internet that doesn't match an existing entry has nowhere to go, so outside devices can't start connections to the PCs. The router configuration:</p>
<pre>interface G0/0
 ip address ${rWan.ip} ${wan.mask}
 ip nat outside
interface G0/1
 ip address ${rWired.ip} ${wired.mask}
 ip nat inside
interface G0/2
 ip address ${rWireless.ip} ${wireless.mask}
 ip nat inside
access-list 1 permit 192.168.10.0 0.0.0.127        ! both LAN subnets (.0 – .127)
ip nat inside source list 1 interface G0/0 overload
ip route 0.0.0.0 0.0.0.0 ${ISP_ROUTER.ip}            ! default route to the ISP</pre>

<div class="box key"><b>Summary of the path:</b> laptop → (802.11, CSMA/CA) → AP → (Ethernet) → R1 G0/2 → routing table: default route → NAT ${laptop.ip}:${ephemeral} → ${rWan.ip}:${natPort} → G0/0 → ISP → internet routers (TTL − 1 and a new frame at each hop) → ${WEBSITE.ip}. The reply comes back to the public address, NAT translates it back to the laptop's private address, and R1 delivers it through the AP. At layer 2 the addresses change on every link, at layer 3 they stay the same end to end, except where NAT rewrites them at the edge.</div>
</section>
</body></html>`;

writeFileSync(new URL('./report.html', import.meta.url), html);
console.log('Wrote report.html');
