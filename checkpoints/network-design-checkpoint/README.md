# Company Floor Network Checkpoint

For this checkpoint I designed a small LAN for one company floor: 1 router with internet access, 2 switches, 4 PCs, a printer, and a Wi-Fi access point with 2 wireless devices. I then explained how data moves through it at the data link and network layers.

The deliverable is **[Network-Design-Checkpoint.pdf](Network-Design-Checkpoint.pdf)**. It has the network diagram, all the tables and the explanations.

## What's in the report

- **Part 1, MAC and frames:** a MAC address for every interface (including the router's three ports and the AP's radio BSSID), and the Ethernet II frame from PC1 to the printer, field by field. It also covers ARP, how SW1 and SW2 learn MAC addresses and forward the frame, CSMA/CD and why full-duplex switches don't have collisions, and CSMA/CA on Wi-Fi (backoff, ACKs, RTS/CTS).
- **Part 2, IP addressing:** 192.168.10.0/24 split into **192.168.10.0/26** for wired devices (gateway .1) and **192.168.10.64/26** for wireless devices (gateway .65), with the upper /25 kept free for later. Every device's IP, mask and gateway are listed, and DHCP is explained (one pool per subnet, the DORA steps, and the router configuration).
- **Part 3, routing:** the laptop opening a website, step by step. It covers DNS, the AND with the subnet mask, ARP for the gateway, the 802.11 frame and how the AP bridges it, what the router does with the IP header (TTL, checksum), the routing table and longest prefix match, and PAT/NAT with its translation table. A table shows the MAC and IP addresses on every part of the path.

## Checking the design

All the addresses are in `network.js`. `check.js` checks that the subnets don't overlap, every MAC and IP is unique, each device is in the right subnet, fixed addresses are outside the DHCP pools and the routing table picks the right routes. `build-report.js` generates the report from the same data, so the diagram, the tables and the text always match.

```bash
node check.js          # validates the design
node build-report.js   # rebuilds report.html
```

`report.html` is the same report as a web page. To make the PDF again, open it in a browser and use Print → Save as PDF.

The MAC addresses are example addresses I assigned. The ISP link (203.0.113.8/30) and the website address (198.51.100.25) come from ranges reserved for documentation, so they're realistic but don't belong to anyone.
