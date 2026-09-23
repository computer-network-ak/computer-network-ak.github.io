(() => {
  "use strict";

  const BANK = {
    1: [
      {
        q: "A 1 MiB object crosses a 100 Mb/s link spanning 2,000 km. When can the receiver obtain the complete object?",
        setup: "Ignore queueing, processing, headers, and acknowledgments. Assume propagation speed is 2 × 10⁸ m/s.",
        steps: [["Serialize", "L/R", "1 MiB is 8,388,608 bits. Transmission delay is 8,388,608 / 100,000,000 ≈ 83.9 ms."], ["Propagate", "d/s", "The first bit needs 2,000,000 / 200,000,000 = 10 ms to cross the link."], ["Pipeline", "first bit ≠ last bit", "Propagation starts while later bits are still being serialized; the delays overlap in physical time but the last bit leaves after 83.9 ms."], ["Complete", "dtrans + dprop", "The last bit arrives about 83.9 + 10 = 93.9 ms after transmission begins."]],
        answer: "Approximately 93.9 ms. The first bit arrives after 10 ms, but the receiver cannot hold the complete object until the sender has serialized every bit and the final bit has propagated.",
        takeaway: "Transmission delay depends on object size and link rate; propagation delay depends on distance and signal speed. Increasing bandwidth cannot reduce propagation delay."
      },
      {
        q: "A path has 100 Mb/s access, 1 Gb/s core, and 40 Mb/s server links. What throughput can one long flow obtain?",
        setup: "Assume no competing traffic, protocol overhead, or receiver limitation.",
        steps: [["Enter", "100 Mb/s", "The access link can inject at most 100 Mb/s."], ["Cross core", "1 Gb/s", "The core has spare capacity and does not constrain this isolated flow."], ["Reach server", "40 Mb/s", "Packets reach a slower service point and accumulate if offered faster than 40 Mb/s."], ["Settle", "minimum rate", "Long-run throughput is bounded by the narrowest link: min(100, 1000, 40)."]],
        answer: "At most 40 Mb/s. With competing flows, fair sharing, policing, congestion, or application limits, observed throughput can be lower.",
        takeaway: "The bottleneck is the smallest available rate along the path, not necessarily the physically slowest link when capacity is shared dynamically."
      },
      {
        q: "Why can a very large router buffer make a video call worse even when packet loss decreases?",
        setup: "A burst fills a deep FIFO queue while the output link remains the bottleneck.",
        steps: [["Burst", "arrival > service", "The queue absorbs excess packets instead of dropping them immediately."], ["Wait", "queue grows", "Every new packet waits behind more bytes; queueing delay becomes the dominant RTT component."], ["React late", "feedback delayed", "Congestion control learns about overload only after delayed ACKs, marks, or eventual drops return."], ["Degrade", "bufferbloat", "Interactive packets survive but arrive too late for conversation, gaming, or control loops."]],
        answer: "A deep buffer can trade loss for excessive and variable latency. Active queue management and fair queueing can signal congestion earlier and isolate latency-sensitive traffic.",
        takeaway: "Zero loss is not the same as good performance; delay, jitter, throughput, and loss must be evaluated together."
      },
      {
        q: "Which header fields change when an ordinary IP packet crosses a router?",
        setup: "Assume no NAT, tunnel, fragmentation, or IP options that require special handling.",
        steps: [["Receive frame", "local link", "The router validates and removes the incoming link-layer header and trailer."], ["Forward IP", "TTL/Hop Limit − 1", "The router decrements the lifetime field and performs a forwarding lookup."], ["Repair header", "IPv4 only", "IPv4 recomputes its header checksum because TTL changed; IPv6 has no base-header checksum."], ["Send frame", "new next hop", "A new link-layer frame is built with addresses and format for the outgoing link."]],
        answer: "The link-layer header and trailer are replaced at every hop. IP source and destination normally remain, TTL or Hop Limit changes, and the IPv4 header checksum is updated. Transport ports and payload normally remain end to end.",
        takeaway: "IP provides the inter-network identity; link headers provide one-hop delivery. NAT and tunnels deliberately modify this ordinary behavior."
      }
    ],
    2: [
      {
        q: "Why can one lost TCP segment pause several HTTP/2 streams but not an unrelated HTTP/3 stream?",
        setup: "Both applications multiplex many logical streams over one connection.",
        steps: [["Multiplex", "many streams", "HTTP/2 frames from different streams enter one ordered TCP byte stream."], ["Lose bytes", "TCP gap", "TCP cannot deliver later bytes to HTTP/2 until the missing sequence range is repaired."], ["Block", "all later bytes", "Even complete frames for another HTTP/2 stream remain behind the connection-wide gap."], ["Compare QUIC", "per-stream offsets", "QUIC can deliver bytes from an unaffected stream while repairing the stream whose frame was lost."]],
        answer: "TCP exposes one ordered byte stream, so loss creates connection-level head-of-line blocking. QUIC provides independent reliable streams, although packet loss still reduces congestion-window capacity for the whole connection.",
        takeaway: "HTTP/3 removes transport ordering between streams; it does not make loss free or give every stream an independent congestion controller."
      },
      {
        q: "A DNS reply contains a referral. Which records let the resolver continue safely?",
        setup: "The resolver asks a parent zone for a name delegated to a child zone.",
        steps: [["Refer", "NS records", "The parent returns the child zone's authoritative name-server names in the authority section."], ["Bootstrap", "glue if needed", "For an in-bailiwick name server, the parent includes address glue so resolving the server name does not loop back into the child."], ["Query child", "authoritative path", "The resolver contacts a child authoritative server and asks for the original name."], ["Validate/cache", "TTL + DNSSEC", "It caches records for their TTL and, when validating DNSSEC, verifies the delegation chain and signed data."]],
        answer: "The referral is formed by NS records, with A/AAAA glue when an in-bailiwick server name needs bootstrapping. Glue is a routing hint from the parent, not authoritative child data.",
        takeaway: "A referral does not contain the final application answer; it tells the resolver where authority continues."
      },
      {
        q: "Why must a server treat QUIC 0-RTT requests as replayable?",
        setup: "A returning client encrypts early data using a secret derived from a previous session ticket.",
        steps: [["Resume", "ticket + PSK", "The client can send early application bytes before completing fresh server authentication."], ["Capture", "valid ciphertext", "An attacker may copy an early-data flight without decrypting it."], ["Replay", "another edge/time", "The copied flight may be accepted again if replay defenses do not coordinate across servers and time windows."], ["Constrain", "idempotent work", "The application rejects or defers side-effecting operations and uses anti-replay controls where practical."]],
        answer: "0-RTT protects confidentiality but cannot generally prove that an early request is unique. Safe deployments restrict it to replay-tolerant operations such as idempotent reads or add application-level uniqueness.",
        takeaway: "Encryption prevents reading or editing a request; it does not by itself provide freshness."
      },
      {
        q: "How can a CDN serve fresh content without downloading the full object on every request?",
        setup: "An edge cache holds a response whose freshness lifetime has expired.",
        steps: [["Store", "object + validator", "The cache retains the representation, metadata, ETag, or Last-Modified time."], ["Revalidate", "conditional request", "It sends If-None-Match or If-Modified-Since to the upstream cache or origin."], ["Decide", "304 or 200", "A 304 extends reuse of the stored bytes; a 200 supplies a changed representation."], ["Serve", "refresh policy", "The edge returns the current object and updates freshness state for later clients."]],
        answer: "Conditional validation separates freshness checking from representation transfer. A small 304 Not Modified response confirms that cached bytes remain valid.",
        takeaway: "Cache-Control governs reuse; validators efficiently answer whether the stored representation still matches the origin."
      }
    ],
    3: [
      {
        q: "In Go-Back-N, what happens if DATA 0–3 arrive but every cumulative ACK is lost?",
        setup: "The sender window contains four packets and its single timer is attached to the oldest unacknowledged packet.",
        steps: [["Deliver", "receiver advances", "The receiver accepts DATA 0–3 in order and repeatedly sends cumulative ACKs through ACK 4."], ["Lose ACK path", "sender base = 0", "No acknowledgment reaches the sender, so its view does not advance even though the receiver has all data."], ["Timeout", "timer for DATA 0", "The oldest packet's timer expires; Go-Back-N retransmits every still-unacknowledged packet in its window."], ["Deduplicate", "repeat ACK 4", "The receiver discards duplicate DATA 0–3 and returns ACK 4, allowing the sender to advance the base."]],
        answer: "The sender retransmits DATA 0–3 after DATA 0's timeout. The receiver does not deliver duplicates to the application; sequence state lets it discard them and repeat the cumulative ACK.",
        takeaway: "Reliability needs sender and receiver state because timeout cannot reveal whether data, ACK, or only delay caused the silence."
      },
      {
        q: "A TCP sender has cwnd = 64 KiB and the receiver advertises rwnd = 12 KiB. How much new data may be outstanding?",
        setup: "Ignore bytes already in flight and any sender-side application limitation.",
        steps: [["Congestion bound", "cwnd = 64 KiB", "The network path currently permits up to 64 KiB according to congestion control."], ["Receiver bound", "rwnd = 12 KiB", "The receive buffer can accept only 12 KiB beyond the acknowledged sequence."], ["Combine", "min(cwnd, rwnd)", "TCP must obey both independent limits."], ["Transmit", "12 KiB", "The smaller receive window controls until the application drains data and advertises more space."]],
        answer: "At most 12 KiB of new unacknowledged data. The usable send window is bounded by min(cwnd, rwnd), further reduced by bytes already in flight.",
        takeaway: "Flow control protects the receiver; congestion control protects the network. They solve different overload problems."
      },
      {
        q: "Why can three duplicate TCP ACKs trigger repair before the retransmission timer expires?",
        setup: "A segment is lost, but later segments reach the receiver out of order.",
        steps: [["Create gap", "missing sequence", "The receiver continues acknowledging the next byte it needs."], ["Observe progress", "duplicate ACKs", "Each later segment produces another ACK for the same sequence number, showing packets are still flowing."], ["Infer loss", "fast retransmit", "Repeated evidence makes isolated loss more likely than mere reordering, so the sender repairs early."], ["Control rate", "fast recovery", "The congestion controller reduces sending pressure without waiting for a long RTO and full restart."]],
        answer: "Duplicate ACKs provide positive evidence that later data arrived around a gap. Fast retransmit uses that evidence to resend the missing range sooner than an RTO would.",
        takeaway: "Modern TCP commonly uses SACK information as well, allowing the sender to identify several missing ranges precisely."
      },
      {
        q: "Why must Selective Repeat use a sequence-number space at least twice the window size?",
        setup: "Packets can be delayed long enough for sequence numbers to wrap.",
        steps: [["Open window", "accept N values", "The receiver is willing to buffer any of N consecutive sequence numbers."], ["Advance", "numbers wrap", "After acknowledgments, a later receiver window may reuse the same numeric labels."], ["Delay old packet", "old looks new", "If the sequence space is too small, a delayed duplicate can fall inside the new acceptance window."], ["Separate generations", "space ≥ 2N", "Disjoint sender/receiver generations prevent an old packet from being mistaken for new data."]],
        answer: "With equal sender and receiver windows of size N, at least 2N sequence values are required to keep old and new windows distinguishable after wraparound.",
        takeaway: "Sequence numbers identify protocol state only within assumptions about maximum lifetime and window movement."
      }
    ],
    4: [
      {
        q: "A router has routes /8, /16, /24, and default that all match a destination. Which action wins?",
        setup: "Assume ordinary IP destination forwarding and no higher-priority policy table.",
        steps: [["Compare", "destination bits", "The router compares the destination with every candidate prefix represented in its forwarding structure."], ["Match", "four candidates", "Default and each nested prefix qualify because their fixed leading bits agree."], ["Select", "longest prefix", "The /24 fixes the most destination bits and is therefore the most specific route."], ["Forward", "chosen next hop", "The router applies the next hop and output interface stored with that /24 entry."]],
        answer: "The /24 route wins. Longest-prefix matching allows broad aggregates and more-specific exceptions to coexist.",
        takeaway: "This rule is specific to destination-prefix forwarding. Generalized match-action tables usually resolve overlap by explicit rule priority."
      },
      {
        q: "What causes a PMTUD black hole when an IPv4 packet has DF set?",
        setup: "A downstream link has a smaller MTU than the packet, and fragmentation is forbidden.",
        steps: [["Encounter MTU", "packet too large", "A router cannot place the datagram in a frame on the next link."], ["Honor DF", "do not fragment", "The router discards the packet instead of creating IPv4 fragments."], ["Signal", "ICMP needed", "It should return ICMP Destination Unreachable: Fragmentation Needed with usable MTU information."], ["Black hole", "ICMP filtered", "If that message is blocked, the sender keeps transmitting packets too large for the path while smaller control traffic may still work."]],
        answer: "The black hole occurs when oversized DF packets are dropped and the required ICMP feedback never reaches the sender. Packetization-layer PMTUD can probe around this failure.",
        takeaway: "Blocking all ICMP breaks essential control behavior; filter specific unsafe traffic instead of discarding every ICMP message."
      },
      {
        q: "Why does an unsolicited inbound packet usually fail through a port-translating NAT?",
        setup: "The NAT has one public address and no static port-forwarding rule.",
        steps: [["Create outbound flow", "inside tuple", "An internal packet lets the NAT create a state mapping to a chosen public port."], ["Return traffic", "mapping hit", "Replies matching the expected external tuple can be translated back to the internal host."], ["Receive unsolicited", "no mapping", "A new inbound packet names only the public address and port; no state identifies an internal destination."], ["Drop", "ambiguous/policy", "The NAT discards it unless configuration or a traversal protocol established a mapping."]],
        answer: "Translation is stateful. Without a matching dynamic entry or static forwarding rule, the NAT cannot determine an authorized internal endpoint.",
        takeaway: "NAT incidentally restricts reachability but is not a substitute for an explicit firewall policy."
      },
      {
        q: "How can head-of-line blocking waste a free output in an input-queued router?",
        setup: "One FIFO input queue holds packets for two different outputs.",
        steps: [["Queue", "A before B", "Packet A at the front targets a busy output; packet B behind it targets an idle output."], ["Arbitrate", "front only", "A simple FIFO scheduler examines or serves only the head packet."], ["Block", "A cannot move", "Because A loses output contention, the entire input queue remains stationary."], ["Waste", "B also waits", "The idle output receives nothing even though B could have used it."]],
        answer: "The front packet's conflict blocks independent packets behind it. Virtual output queues separate packets by destination output so another eligible queue can be scheduled.",
        takeaway: "A fast switching fabric alone does not guarantee throughput; queue organization and arbitration matter."
      }
    ],
    5: [
      {
        q: "Why can two routers temporarily forward packets in a loop after a routing change?",
        setup: "Control messages and forwarding-table updates do not reach every router simultaneously.",
        steps: [["Change", "link fails/cost rises", "One router detects new topology before its neighbors."], ["Compute", "different snapshots", "Routers briefly calculate routes from inconsistent control-plane information."], ["Install", "crossing next hops", "Router A points to B while B still points to A for the same destination."], ["Converge", "fresh state wins", "Flooding, recomputation, sequencing, and timers eventually install a consistent path; TTL limits packets caught meanwhile."]],
        answer: "Transient loops result from asynchronous distributed state. Fast detection helps, but safe update ordering, loop-free alternates, and consistent forwarding updates reduce disruption.",
        takeaway: "A correct routing algorithm at steady state can still exhibit temporary inconsistency during convergence."
      },
      {
        q: "Why does BGP often reject the path with the fewest AS hops?",
        setup: "A router learns several reachable paths for the same prefix.",
        steps: [["Import", "apply policy", "Routes from customers, peers, and providers receive different local preferences."], ["Select", "LOCAL_PREF first", "A higher-policy route can win before AS-path length is compared."], ["Tie-break", "attributes", "AS path, origin, MED, eBGP/iBGP status, IGP cost, and deterministic tie-breaks may follow."], ["Export", "business policy", "The chosen route is advertised only where export policy permits, often following valley-free relationships."]],
        answer: "BGP is policy routing between autonomous systems. AS-path length is one decision attribute, commonly considered after local preference.",
        takeaway: "The Internet path is an economic and administrative decision as well as a reachability calculation."
      },
      {
        q: "How does distance-vector count-to-infinity arise after a destination fails?",
        setup: "Neighbors know only advertised distances, not the complete topology that produced them.",
        steps: [["Fail", "route disappears", "One router invalidates its direct route."], ["Hear stale claim", "neighbor advertises path", "A neighbor still reports a finite distance that actually depended on the first router."], ["Believe detour", "cost increases", "Each router treats the other as an alternate and advertises a slightly larger metric."], ["Climb", "toward infinity", "Bad news propagates slowly until the protocol's infinity value or loop prevention stops the cycle."]],
        answer: "Each neighbor mistakes the other's stale advertisement for an independent route. Split horizon, poison reverse, triggered updates, hold-downs, and bounded infinity reduce the problem but do not make every topology converge instantly.",
        takeaway: "Distance vector exchanges conclusions; link state distributes evidence about topology."
      },
      {
        q: "Why can traceroute show different forward and return paths?",
        setup: "Probes leave with increasing TTL values and routers return ICMP Time Exceeded messages.",
        steps: [["Expire", "TTL reaches zero", "A router discards the probe and generates an ICMP response."], ["Return", "independent routing", "That ICMP packet is routed back according to the router's own forwarding table."], ["Load balance", "flow hashing", "Different probe headers may select different equal-cost forward paths unless the tool preserves the flow key."], ["Observe", "one address per reply", "Displayed hops identify response sources, not a guaranteed symmetric circuit."]],
        answer: "IP routing is destination based and can be asymmetric. Traceroute combines a forward probe path with independently routed return messages, and load balancing can add variation.",
        takeaway: "Missing stars may mean filtering, rate limiting, or return-path failure; they do not prove the corresponding forward hop is absent."
      }
    ],
    6: [
      {
        q: "A host sends to an off-subnet IP destination. Which MAC address belongs in the Ethernet frame?",
        setup: "The host has a default gateway on its local LAN.",
        steps: [["Subnet test", "destination is remote", "The host applies its prefix mask and sees that direct link delivery is impossible."], ["Choose next hop", "default gateway", "The IP destination remains the remote host, but the immediate next hop becomes the router."], ["Resolve", "ARP/ND", "The sender resolves the gateway's local link-layer address, not the remote host's MAC address."], ["Frame", "gateway MAC", "Ethernet delivers the frame to the router, which removes it and creates another frame for the next link."]],
        answer: "The destination MAC is the default gateway's interface MAC. The IP destination remains the final remote host.",
        takeaway: "MAC addresses have link-local meaning; routers do not forward an Ethernet frame unchanged across the Internet."
      },
      {
        q: "What does a learning switch do with the first A→C frame and the later C→A reply?",
        setup: "The forwarding table is initially empty; A is on port 1 and C on port 3.",
        steps: [["Learn A", "A → port 1", "The incoming source proves where A is reachable."], ["Look up C", "unknown", "No entry exists for C, so the switch floods copies to all ports except port 1."], ["Learn C", "C → port 3", "The reply's source creates the C mapping before its destination lookup."], ["Forward to A", "known unicast", "A is already mapped to port 1, so the reply leaves only that port."]],
        answer: "The first frame is flooded after learning A. The reply is forwarded only to A after learning C. Later A↔C traffic can be sent as known unicast in both directions.",
        takeaway: "Switches learn from source addresses and forward based on destination addresses. Entries age because hosts can move."
      },
      {
        q: "Why does a correct Ethernet CRC not prove that an application file is intact end to end?",
        setup: "Every Ethernet hop validates its own frame before accepting it.",
        steps: [["Check hop", "CRC verifies frame", "A receiver detects many corruption patterns on that one link."], ["Remove frame", "CRC scope ends", "A router discards the frame trailer before forwarding the IP packet."], ["Re-encapsulate", "new CRC", "The next link computes a fresh CRC over a newly built frame."], ["End-to-end risk", "other faults remain", "Corruption in memory, software, another medium, or an undetected pattern lies outside the earlier CRC's guarantee."]],
        answer: "CRC is a hop-local error detector. End-to-end protocols still need their own integrity checks because only the endpoints can verify the entire delivery path and object.",
        takeaway: "Protection must cover the same scope as the correctness claim."
      },
      {
        q: "Why can VXLAN traffic fail after an overlay is enabled even though the underlay can ping?",
        setup: "The underlay MTU was sized only for ordinary tenant packets.",
        steps: [["Encapsulate", "add outer headers", "VXLAN adds outer Ethernet, IP, UDP, and VXLAN headers around the tenant frame."], ["Exceed MTU", "larger packet", "A tenant packet that previously fit may now exceed an underlay link's MTU."], ["Drop/fragment", "path behavior", "DF policy, IPv6 rules, filtering, or inefficient fragmentation can prevent useful delivery."], ["Engineer", "raise MTU or lower payload", "Operators configure jumbo underlay MTUs or reduce tenant/interface MTU and verify PMTUD."]],
        answer: "Reachability tests with small packets do not validate encapsulated data size. Overlay overhead must be included in the end-to-end MTU budget.",
        takeaway: "Every tunnel creates a new packet-size boundary as well as a new logical topology."
      }
    ],
    7: [
      {
        q: "Why can two Wi-Fi stations collide even though both use carrier sensing?",
        setup: "Both stations can reach the same access point but cannot hear one another.",
        steps: [["Sense", "channel appears idle", "Each hidden station hears no energy from the other and independently sees a transmit opportunity."], ["Back off", "counters expire", "Their random counters can reach zero close enough in time to overlap at the AP."], ["Collide", "AP cannot decode", "Frames interfere at the common receiver even though neither sender violated its local carrier-sense result."], ["Recover", "no ACK + retry", "Missing ACKs trigger larger contention windows; RTS/CTS can make the AP's reservation visible to both stations."]],
        answer: "Carrier sensing is local, while collision occurs at the receiver. Hidden terminals have different observations of the same wireless medium.",
        takeaway: "RTS/CTS reduces costly hidden-terminal collisions but adds control overhead, so it is often enabled selectively."
      },
      {
        q: "After a Wi-Fi sender receives no ACK, does it know whether DATA was lost?",
        setup: "A unicast frame was transmitted and the ACK timer expired.",
        steps: [["Possible DATA loss", "receiver got nothing", "Interference or collision may have corrupted the data frame."], ["Possible ACK loss", "receiver got DATA", "The receiver may have accepted DATA and sent an ACK that was corrupted."], ["Retry", "same logical frame", "The sender retransmits after a larger random backoff because silence cannot distinguish the cases."], ["Deduplicate", "retry bit + sequence", "The receiver recognizes a repeated frame and avoids delivering the payload twice, while acknowledging it again."]],
        answer: "No. Missing ACK is ambiguous between DATA loss, ACK loss, and severe delay. Link-layer sequence control makes retransmission safe.",
        takeaway: "Acknowledgment confirms receiver state; its absence is evidence of uncertainty, not proof of a specific failure."
      },
      {
        q: "Why can selecting a lower Wi-Fi PHY rate increase application throughput?",
        setup: "A high-order modulation sends more bits per symbol but the channel has weak SINR.",
        steps: [["Choose high rate", "dense constellation", "The PHY transmits quickly but small signal errors map to many incorrect bits."], ["Lose frames", "retries + airtime", "Corrupted frames consume airtime and require retransmission, reducing useful delivery."], ["Adapt", "robust MCS", "Lower modulation and stronger coding reduce raw rate but improve successful-frame probability."], ["Gain goodput", "useful bits/time", "Fewer retries and stable aggregation can deliver more application bytes per second."]],
        answer: "Goodput equals useful successfully delivered data over time, not the advertised PHY rate. Rate control selects the modulation/coding mode that maximizes expected delivery under current channel conditions.",
        takeaway: "Wireless capacity is time varying; signal quality, contention, coding, retries, and protocol overhead all matter."
      },
      {
        q: "What must change during a cellular handover while an application session continues?",
        setup: "A device moves from one radio node to another without intentionally ending its data session.",
        steps: [["Measure", "candidate cells", "The device and network observe signal quality, load, policy, and mobility conditions."], ["Prepare", "target resources", "Security context, radio configuration, and forwarding state are created or transferred."], ["Switch", "radio attachment", "The device synchronizes to the target; packets may be buffered, forwarded, duplicated, or reordered."], ["Update path", "user plane", "Tunnels or forwarding rules direct later traffic through the new access path while transport state remains at the endpoints."]],
        answer: "Radio resources, attachment state, security context, and user-plane forwarding must move coherently. The IP address may remain stable through an anchor or change depending on the mobility design.",
        takeaway: "QUIC connection IDs can preserve a connection across an IP change, but the new path still requires validation and new congestion measurements."
      }
    ],
    8: [
      {
        q: "Why is encryption without integrity unsafe for active network traffic?",
        setup: "An attacker cannot read plaintext but can modify ciphertext in transit.",
        steps: [["Intercept", "ciphertext visible", "Confidentiality hides content but does not necessarily detect changes."], ["Modify", "malleability", "Some encryption modes let controlled ciphertext edits produce structured plaintext changes or useful error oracles."], ["Process", "receiver trusts bytes", "Without authentication, the endpoint may act on altered data before recognizing a problem."], ["Protect", "AEAD", "Authenticated encryption verifies a tag over ciphertext and associated context before releasing plaintext."]],
        answer: "Confidentiality alone does not establish message authenticity. Network protocols should use an AEAD construction with unique nonces and bind relevant headers as associated data.",
        takeaway: "Encrypt-then-authenticate behavior prevents undetected tampering; correct nonce management remains essential."
      },
      {
        q: "What must a TLS client verify before accepting a server certificate?",
        setup: "The server presents a certificate chain and proves possession of the leaf private key.",
        steps: [["Build chain", "leaf → trust anchor", "Signatures and constraints must form a valid path to a configured trust anchor."], ["Check identity", "hostname/SAN", "The requested service name must match an allowed subject alternative name."], ["Check policy", "time + usage", "Validity period, key usage, algorithms, constraints, and applicable revocation policy are evaluated."], ["Bind handshake", "CertificateVerify", "A signature over the transcript proves private-key possession and prevents transplanting the certificate into another handshake."]],
        answer: "A valid issuer signature alone is insufficient. The client must validate the chain, service identity, constraints, time, acceptable algorithms, and transcript proof.",
        takeaway: "Certificates bind public keys to identities under a trust policy; they do not certify that application content is benign."
      },
      {
        q: "How does ephemeral key agreement provide forward secrecy?",
        setup: "An attacker records today's encrypted connection and steals the server's certificate private key next year.",
        steps: [["Generate", "fresh ephemeral keys", "Client and server create temporary Diffie–Hellman key pairs for this handshake."], ["Authenticate", "sign transcript", "The server's long-term private key authenticates the exchange but does not directly encrypt the traffic secret."], ["Erase", "ephemeral secrets", "Temporary private values and obsolete traffic secrets are discarded after use."], ["Compromise later", "recording remains sealed", "The stolen long-term key cannot reconstruct the old ephemeral shared secret from recorded public values."]],
        answer: "Past session keys remain protected because they came from erased ephemeral private values, while the long-term key only authenticated the handshake.",
        takeaway: "Forward secrecy does not protect a currently compromised endpoint or sessions whose live traffic keys were stolen."
      },
      {
        q: "Why does signing a password once still permit replay authentication?",
        setup: "A client sends the same valid proof whenever it logs in.",
        steps: [["Record", "valid proof", "An attacker captures the signed or MACed credential exchange."], ["Replay", "identical bytes", "The attacker resends it later without learning the secret or forging a signature."], ["Verify", "cryptography passes", "The server confirms authenticity but has no evidence that the proof belongs to the current session."], ["Add freshness", "nonce + context", "The server challenges with an unpredictable nonce; the client proves over the nonce, identities, role, and transcript."]],
        answer: "Cryptographic validity proves who could create a message, not when it was created. A fresh challenge, sequence, timestamp policy, or channel-bound transcript is needed to reject reuse.",
        takeaway: "Authentication must bind identity, freshness, negotiated parameters, and the intended session together."
      }
    ]
  };

  const escapeId = (value) => String(value).replace(/[^a-z0-9_-]/gi, "-");

  document.querySelectorAll("[data-critical-chapter]").forEach((root) => {
    const questions = BANK[root.dataset.criticalChapter] || [];
    if (!questions.length) return;
    const tabs = root.querySelector("[data-critical-tabs]");
    const questionNumber = root.querySelector("[data-critical-number]");
    const questionTitle = root.querySelector("[data-critical-question]");
    const setup = root.querySelector("[data-critical-setup]");
    const path = root.querySelector("[data-critical-path]");
    const state = root.querySelector("[data-critical-state]");
    const answer = root.querySelector("[data-critical-answer]");
    const answerText = root.querySelector("[data-critical-answer-text]");
    const takeaway = root.querySelector("[data-critical-takeaway]");
    const next = root.querySelector("[data-critical-next]");
    const play = root.querySelector("[data-critical-play]");
    const reset = root.querySelector("[data-critical-reset]");
    let selected = 0;
    let index = -1;
    let generation = 0;
    let playing = false;

    const buildPath = () => {
      path.replaceChildren();
      questions[selected].steps.forEach((step, position) => {
        if (position) {
          const arrow = document.createElement("i");
          arrow.textContent = "→";
          arrow.setAttribute("aria-hidden", "true");
          path.append(arrow);
        }
        const node = document.createElement("div");
        node.dataset.criticalStep = String(position);
        node.innerHTML = `<b>${position + 1}</b><span></span><small></small>`;
        node.querySelector("span").textContent = step[0];
        node.querySelector("small").textContent = step[1];
        path.append(node);
      });
    };

    const render = () => {
      const item = questions[selected];
      const panel = root.querySelector('.critical-workbench');
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `critical-tab-${escapeId(root.dataset.criticalChapter)}-${selected}`);
      questionNumber.textContent = `QUESTION ${selected + 1} OF ${questions.length}`;
      questionTitle.textContent = item.q;
      setup.textContent = item.setup;
      root.querySelectorAll("[data-critical-tab]").forEach((tab, position) => {
        const active = position === selected;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      root.querySelectorAll("[data-critical-step]").forEach((node, position) => {
        node.classList.toggle("done", position < index);
        node.classList.toggle("active", position === index);
      });
      if (index < 0) {
        state.innerHTML = "<b>READY</b><span>Predict the result, then reveal the reasoning one transition at a time.</span>";
      } else {
        const step = item.steps[index];
        state.innerHTML = `<b>STEP ${index + 1} · ${escapeId(step[0]).replace(/-/g, " ")}</b><span></span>`;
        state.querySelector("span").textContent = step[2];
      }
      const complete = index === item.steps.length - 1;
      answer.hidden = !complete;
      if (complete) {
        answerText.textContent = item.answer;
        takeaway.textContent = item.takeaway;
      }
      next.textContent = complete ? "Replay reasoning ↺" : "Reveal next step →";
      play.textContent = playing ? "❚❚ Pause" : complete ? "↺ Replay automatically" : "▶ Animate answer";
    };

    const selectQuestion = (position) => {
      generation += 1; playing = false; selected = position; index = -1;
      buildPath(); render();
    };

    questions.forEach((item, position) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.criticalTab = String(position);
      button.setAttribute("role", "tab");
      button.id = `critical-tab-${escapeId(root.dataset.criticalChapter)}-${position}`;
      button.setAttribute("aria-controls", `critical-question-${escapeId(root.dataset.criticalChapter)}`);
      button.innerHTML = `<b>Q${position + 1}</b><span></span>`;
      button.querySelector("span").textContent = item.q;
      button.addEventListener("click", () => selectQuestion(position));
      button.addEventListener("keydown", (event) => {
        let destination;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") destination = (position + 1) % questions.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") destination = (position + questions.length - 1) % questions.length;
        else if (event.key === "Home") destination = 0;
        else if (event.key === "End") destination = questions.length - 1;
        else return;
        event.preventDefault();
        selectQuestion(destination);
        tabs.querySelectorAll('[role="tab"]')[destination].focus();
      });
      tabs.append(button);
    });

    next.addEventListener("click", () => {
      generation += 1; playing = false;
      if (index >= questions[selected].steps.length - 1) index = -1;
      else index += 1;
      render();
    });
    play.addEventListener("click", async () => {
      if (playing) { playing = false; generation += 1; render(); return; }
      if (index >= questions[selected].steps.length - 1) index = -1;
      playing = true;
      const current = ++generation;
      render();
      while (playing && current === generation && index < questions[selected].steps.length - 1) {
        index += 1; render();
        await new Promise((resolve) => window.setTimeout(resolve, 1850));
      }
      if (current === generation) { playing = false; render(); }
    });
    reset.addEventListener("click", () => { generation += 1; playing = false; index = -1; render(); });
    buildPath(); render();
  });
})();
