// The whole network design as data. The checker (check.js) and the report
// (build-report.js) both read from this file, so they always agree.

// ---------- Small IPv4 helpers ----------
export const ipToInt = (ip) => ip.split('.').reduce((n, octet) => n * 256 + Number(octet), 0);
export const intToIp = (n) => [24, 16, 8, 0].map((shift) => Math.floor(n / 2 ** shift) % 256).join('.');
export const maskFromPrefix = (prefix) => intToIp(prefix === 0 ? 0 : (2 ** 32 - 2 ** (32 - prefix)));
export const toBinary = (ip) => ip.split('.').map((o) => Number(o).toString(2).padStart(8, '0')).join('.');

export function subnetInfo(cidr) {
  const [ip, prefixText] = cidr.split('/');
  const prefix = Number(prefixText);
  const size = 2 ** (32 - prefix);
  const network = Math.floor(ipToInt(ip) / size) * size;
  return {
    cidr,
    prefix,
    mask: maskFromPrefix(prefix),
    network: intToIp(network),
    broadcast: intToIp(network + size - 1),
    firstHost: intToIp(network + 1),
    lastHost: intToIp(network + size - 2),
    usableHosts: size - 2,
    contains: (addr) => {
      const n = ipToInt(addr);
      return n > network && n < network + size - 1; // a usable host address
    },
  };
}

// ---------- Address plan ----------
export const BASE_NETWORK = '192.168.10.0/24';

export const SUBNETS = {
  wired: { name: 'Wired LAN (PCs, printer, switches)', cidr: '192.168.10.0/26', gateway: '192.168.10.1', routerPort: 'G0/1',
    staticRange: ['192.168.10.1', '192.168.10.9'], dhcpPool: ['192.168.10.10', '192.168.10.62'] },
  wireless: { name: 'Wireless LAN (Wi-Fi devices)', cidr: '192.168.10.64/26', gateway: '192.168.10.65', routerPort: 'G0/2',
    staticRange: ['192.168.10.65', '192.168.10.69'], dhcpPool: ['192.168.10.70', '192.168.10.126'] },
  reserved: { name: 'Reserved for later (e.g. guest Wi-Fi, servers)', cidr: '192.168.10.128/25' },
  wan: { name: 'WAN link to the ISP (public)', cidr: '203.0.113.8/30', gateway: '203.0.113.9', routerPort: 'G0/0' },
};

export const DNS_SERVERS = ['1.1.1.1', '8.8.8.8'];
export const WEBSITE = { name: 'www.example.com', ip: '198.51.100.25' }; // documentation address, for the example
export const ISP_ROUTER = { name: 'ISP gateway', mac: '00:50:56:EE:00:09', ip: '203.0.113.9' };

// ---------- Devices ----------
// "how" = how the device gets its IP address
export const DEVICES = [
  { id: 'R1-G0/0', device: 'Router R1', port: 'G0/0 (WAN, to ISP)', type: 'router', mac: '00:1A:2B:3C:4D:01', ip: '203.0.113.10', subnet: 'wan', how: 'Static (from ISP)' },
  { id: 'R1-G0/1', device: 'Router R1', port: 'G0/1 (wired LAN)', type: 'router', mac: '00:1A:2B:3C:4D:02', ip: '192.168.10.1', subnet: 'wired', how: 'Static (gateway)' },
  { id: 'R1-G0/2', device: 'Router R1', port: 'G0/2 (wireless LAN)', type: 'router', mac: '00:1A:2B:3C:4D:03', ip: '192.168.10.65', subnet: 'wireless', how: 'Static (gateway)' },
  { id: 'SW1', device: 'Switch SW1', port: 'Management', type: 'switch', mac: '00:1B:44:11:3A:01', ip: '192.168.10.2', subnet: 'wired', how: 'Static' },
  { id: 'SW2', device: 'Switch SW2', port: 'Management', type: 'switch', mac: '00:1B:44:11:3A:02', ip: '192.168.10.3', subnet: 'wired', how: 'Static' },
  { id: 'PRN', device: 'Printer', port: 'Ethernet', type: 'printer', mac: '00:80:77:5E:10:20', ip: '192.168.10.5', subnet: 'wired', how: 'Static (so it never changes)' },
  { id: 'PC1', device: 'PC1', port: 'Ethernet', type: 'pc', mac: '3C:52:82:A1:00:11', ip: '192.168.10.11', subnet: 'wired', how: 'DHCP' },
  { id: 'PC2', device: 'PC2', port: 'Ethernet', type: 'pc', mac: '3C:52:82:A1:00:12', ip: '192.168.10.12', subnet: 'wired', how: 'DHCP' },
  { id: 'PC3', device: 'PC3', port: 'Ethernet', type: 'pc', mac: '3C:52:82:A1:00:13', ip: '192.168.10.13', subnet: 'wired', how: 'DHCP' },
  { id: 'PC4', device: 'PC4', port: 'Ethernet', type: 'pc', mac: '3C:52:82:A1:00:14', ip: '192.168.10.14', subnet: 'wired', how: 'DHCP' },
  { id: 'AP-ETH', device: 'Access point AP1', port: 'Ethernet (uplink + management)', type: 'ap', mac: '00:24:6C:AA:00:01', ip: '192.168.10.66', subnet: 'wireless', how: 'Static' },
  { id: 'AP-RADIO', device: 'Access point AP1', port: 'Wi-Fi radio (BSSID)', type: 'ap', mac: '00:24:6C:AA:00:02', ip: null, subnet: 'wireless', how: '(layer 2 only)' },
  { id: 'LAPTOP', device: 'Laptop (wireless 1)', port: 'Wi-Fi', type: 'wireless', mac: 'A4:83:E7:5B:00:21', ip: '192.168.10.70', subnet: 'wireless', how: 'DHCP' },
  { id: 'PHONE', device: 'Phone (wireless 2)', port: 'Wi-Fi', type: 'wireless', mac: 'F0:18:98:6E:00:22', ip: '192.168.10.71', subnet: 'wireless', how: 'DHCP' },
];

export const byId = (id) => DEVICES.find((d) => d.id === id);

// ---------- Router R1 routing table ----------
export const ROUTING_TABLE = [
  { code: 'C', destination: '192.168.10.0/26', nextHop: 'directly connected', iface: 'G0/1' },
  { code: 'C', destination: '192.168.10.64/26', nextHop: 'directly connected', iface: 'G0/2' },
  { code: 'C', destination: '203.0.113.8/30', nextHop: 'directly connected', iface: 'G0/0' },
  { code: 'S*', destination: '0.0.0.0/0', nextHop: '203.0.113.9', iface: 'G0/0' },
];

/** Longest prefix match: the most specific route that contains the address wins */
export function lookupRoute(address) {
  const matches = ROUTING_TABLE.filter((route) => {
    const [net, prefix] = route.destination.split('/');
    const size = 2 ** (32 - Number(prefix));
    return Math.floor(ipToInt(address) / size) === Math.floor(ipToInt(net) / size);
  });
  return matches.sort((a, b) => Number(b.destination.split('/')[1]) - Number(a.destination.split('/')[1]))[0];
}
