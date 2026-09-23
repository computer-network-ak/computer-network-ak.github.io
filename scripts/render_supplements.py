"""Render maintained learning supplements into the existing static HTML."""
from html import escape
from pathlib import Path
import re
from content_supplements import QUESTIONS, REFERENCES
from layer_details import LAYER_DETAILS

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist' if (ROOT / 'dist' / 'index.html').is_file() else ROOT

def table(caption, headings, rows):
    return ('<div class="table-scroll" tabindex="0" role="region" aria-label="' + escape(caption) + '">'
            '<table class="data-table"><caption>' + caption + '</caption><thead><tr>' +
            ''.join('<th scope="col">' + x + '</th>' for x in headings) + '</tr></thead><tbody>' +
            ''.join('<tr>' + ''.join('<td>' + c + '</td>' for c in row) + '</tr>' for row in rows) +
            '</tbody></table></div>')

TABLES = {
1: table('Layer responsibilities at a glance', ['Internet layer', 'Typical unit / identifier', 'Responsibility and examples'], [
    ['Application (OSI 5–7)', 'Message; application names', 'Meaning and framing: HTTP, DNS, SMTP; session and encoding logic in applications/libraries.'],
    ['Transport (OSI 4)', 'TCP segment / UDP datagram; ports', 'Process communication. TCP: reliable byte stream and receiver flow control. UDP: datagrams. QUIC: secure streams over UDP.'],
    ['Network (OSI 3)', 'IP packet/datagram; IP addresses', 'Across-network delivery: addressing and forwarding; control protocols build routes.'],
    ['Link (OSI 2)', 'Frame; link-specific addressing', 'Local delivery: Ethernet/Wi-Fi, framing, medium access, error detection; recovery/flow control depend on protocol.'],
    ['Physical (OSI 1)', 'Bits represented by signals', 'Electrical, optical, or radio transmission; modulation and signaling.']]),
3: table('Flow control, congestion control, and recovery have different scopes', ['Mechanism', 'Scope', 'What it controls'], [
    ['TCP receive window (rwnd)', 'End-to-end transport', 'Receiver capacity for one connection.'],
    ['QUIC receive limits', 'End-to-end transport', 'Credit per stream and across a connection.'],
    ['Ethernet PAUSE', 'One full-duplex Ethernet link', 'Optional temporary pause requested by a neighboring receiver.'],
    ['Application backpressure', 'Application-defined', 'Bounded work queues, concurrency, or consumption rate.'],
    ['TCP/QUIC congestion control', 'Network path', 'Sending pressure in response to available capacity and feedback.'],
    ['ACKs, sequence state, retransmission', 'Protocol-dependent', 'Loss recovery and duplicate handling; not automatically flow control.']]),
4: table('Count configured addresses, not cables', ['Logical interface', 'IPv4 example', 'Role'], [
    ['LAN-A', '192.168.10.1/24', 'Gateway for the first LAN'],
    ['LAN-B', '192.168.20.1/24', 'Gateway for the second LAN'],
    ['WAN', '203.0.113.2/30', 'Point-to-point example subnet'],
    ['Loopback', '192.0.2.1/32', 'Logical endpoint; no physical cable']]) +
    '<p class="table-note">This configuration has four IPv4 addresses. IPv6, secondary addresses, VLANs, and unnumbered links change the count.</p>' +
    '<div class="worked-example"><h3>Worked subnet: 192.168.10.77/26</h3><p>A /26 mask is 255.255.255.192. Blocks begin every 64 addresses. Since 77 lies in 64–127, the network is <strong>192.168.10.64</strong>, the broadcast address is <strong>192.168.10.127</strong>, and conventional host addresses run from <strong>.65 to .126</strong>: 62 usable addresses. The gateway must use a valid configured host address; it does not have to be the first one.</p></div>',
6: table('A remote web request across two Ethernet links', ['At this point', 'IP source → destination', 'Ethernet source → destination'], [
    ['Laptop to its gateway', 'Laptop IP → server IP', 'Laptop MAC → gateway LAN MAC'],
    ['Router to the next Ethernet hop', 'Laptop IP → server IP (without NAT)', 'Router outgoing MAC → next-hop MAC'],
    ['If the edge performs source NAT', 'Translated public IP → server IP', 'Still the local outgoing and next-hop MACs']]) + '<p class="table-note">A layer-2 switch normally preserves Ethernet source/destination addresses while bridging. A router creates the next link frame. Not every Internet link is Ethernet.</p>'
}


# Keep the byte budget beside the network-layer addressing examples.
TABLES[4] += (
    '<div id="mtu-header-budget"><h3>Why 1500-byte MTU and 1460-byte TCP MSS?</h3>'
    '<p><strong>1500 bytes is the conventional Ethernet payload limit.</strong> When Ethernet carries IP directly, that payload is the entire IP packet, including its IP header. It is a standardized link-format choice, not a limit calculated from the IPv4 address size or the TCP header. Larger packets amortize framing and processing overhead; smaller packets limit the time one transmission occupies a link and require less buffering. These are the engineering tradeoffs behind choosing a bounded frame size; they do not mathematically single out 1500. Compatibility with the established Ethernet format explains why this value remains common.</p>'
    '<p>MTU means <strong>Maximum Transmission Unit</strong>: here, the largest IP packet a link can carry without IP fragmentation. Other links, tunnels, and configured jumbo frames can have different MTUs. Path MTU is the smallest link MTU along the path. See <a href="https://www.rfc-editor.org/rfc/rfc894.html">RFC 894: IP over Ethernet</a>.</p>'
    '<div class="worked-example"><h4>Follow the bytes: untagged Ethernet, IPv4, TCP, no options</h4>'
    '<p><code>14 Ethernet + [20 IPv4 + 20 TCP + 1460 TCP data] + 4 FCS = 1518 bytes</code></p>'
    '<p>The bracketed IP packet is <strong>1500 bytes</strong>. TCP MSS counts only TCP data: <strong>1500 − 20 − 20 = 1460 bytes</strong>. The complete TCP segment is 1480 bytes. Do not subtract the Ethernet header or FCS again: both are already outside the IP MTU.</p></div>'
    + table('Which headers count toward the IP MTU?', ['Component', 'Size', 'Purpose and counting rule'], [
        ['Ethernet II header', '14 bytes, untagged', 'Destination MAC (6), source MAC (6), EtherType (2). Local-link delivery; outside IP MTU.'],
        ['IPv4 header', '20–60 bytes', 'Version/IHL, DSCP/ECN, total length, identification, flags/fragment offset, TTL, protocol, header checksum, source/destination addresses, optional options/padding. Inside MTU. IHL counts 32-bit words: 5 means 20 bytes.'],
        ['TCP header', '20–60 bytes', 'Ports (4 bytes total), sequence (4), acknowledgment (4), data offset/reserved/flags (2), receive window (2), checksum (2), urgent pointer (2), then optional options/padding. Inside MTU, outside MSS. Data offset counts 32-bit words.'],
        ['TCP data', '1460 bytes in this example', 'Bytes delivered by TCP; may include TLS or application headers, so useful file content can be smaller.'],
        ['Ethernet FCS trailer', '4 bytes', 'CRC error detection for the frame; outside IP MTU.'],
        ['Preamble + start delimiter; interframe gap', '8 bytes; 12 byte-times', 'Synchronization and spacing on the link; outside the 1518-byte frame count. The gap is idle time, not a packet header.']])
    + '<p>An 802.1Q VLAN tag adds 4 bytes: a conventional tagged frame can be 1522 bytes while still carrying a 1500-byte IP packet. Do not automatically reduce IP MTU to 1496. Jumbo frames require compatible configuration along the relevant path.</p>'
    '<h4>Why the usable TCP data size changes</h4>'
    + table('Payload budgets, assuming no fragmentation and a sufficient peer MSS', ['Case', 'Calculation', 'TCP data limit'], [
        ['IPv4, minimum headers', '1500 − 20 − 20', '1460 bytes'],
        ['IPv4, 12 bytes of TCP options/padding', '1500 − 20 − 32', '1448 bytes'],
        ['IPv6, no extension headers or TCP options', '1500 − 40 − 20', '1440 bytes'],
        ['An effective IPv4 path MTU of 1492', '1492 − 20 − 20', '1452 bytes']])
    + '<p>The IPv6 base header is fixed at 40 bytes: version/traffic class/flow label, payload length, next header, hop limit, and two 16-byte addresses. Extension headers consume additional space. Unlike IPv4, its base header has no checksum. UDP has an 8-byte header and no TCP MSS option; with minimum IPv4 headers, its unfragmented payload budget at MTU 1500 is 1472 bytes.</p>'
    '<p>Each endpoint advertises its receive MSS in a SYN-bearing segment; the values can differ by direction. The advertised value normally subtracts only fixed IP and TCP headers. The sender must then reduce actual data for options it uses and respect the path MTU as well as the peer limit. Thus an advertised MSS of 1460 can coexist with 1448-byte data segments when TCP options occupy 12 extra bytes. MSS is a ceiling, not a requirement to fill every segment. See <a href="https://www.rfc-editor.org/rfc/rfc9293.html#section-3.7.1">RFC 9293, section 3.7.1</a>.</p>'
    '<p>Tunnel headers consume outer-packet space and may lower the inner MTU. TCP segmentation happens at the sender; IP fragmentation is a separate operation. IPv4 routers may fragment if permitted, whereas IPv6 routers return Packet Too Big instead. Path MTU discovery helps the sender choose packets that fit.</p>'
    '<p><strong>Quick check:</strong> Is 1460 always the maximum? No. It is the familiar IPv4/TCP result for MTU 1500 with minimum headers. With a 9000-byte IP MTU and minimum headers, the corresponding budget is 8960 bytes, if the peer and path support it.</p></div>'
)

def render_essentials(n):
    out = ['<section class="chapter-section essentials" id="essential-details">',
           '<h2><span>Essential details</span> Details that matter</h2>',
           '<p>Check the short answer, then the scope and exceptions. These distinctions prevent common mistakes in exams, interviews, and troubleshooting.</p>',
           TABLES.get(n, ''), '<div class="qa-list">']
    for i, (slug, q, a) in enumerate(QUESTIONS[n], 1):
        opened = ' open' if i == 1 else ''
        out.append(f'<details class="qa-item" id="{slug}"{opened}><summary><span class="qa-number">{i:02}</span>{escape(q)}</summary><div class="qa-answer"><p>{a}</p><a class="answer-permalink" href="#{slug}">Link to this answer</a></div></details>')
    out.append('</div></section>')
    return '\n'.join(out)

def render_layer_details(n):
    lesson = LAYER_DETAILS[n]
    cards = ''.join(
        '<details class="scan-card"' + (' open' if i == 0 else '') + '><summary>' + escape(title) +
        '</summary><div class="scan-body"><p>' + escape(body) + '</p></div></details>'
        for i, (title, body) in enumerate(lesson['cards']))
    title, body = lesson['example']
    sources = ' · '.join('<a href="' + escape(url, quote=True) + '">' + escape(label) + '</a>'
                         for label, url in lesson['sources'])
    return ('<section class="chapter-section scan-section" id="layer-details">'
            '<h2><span>Sizes, headers &amp; limits</span> ' + escape(lesson['title']) + '</h2>'
            '<p>Understand the reason behind each number. Header sizes belong to specific protocols; '
            'worked examples state the assumptions needed to use them.</p>'
            '<div class="scan-grid">' + cards + '</div>'
            '<div class="worked-example"><h3>' + escape(title) + '</h3><p>' + escape(body) + '</p></div>'
            '<p class="table-note">Primary references: ' + sources + '</p></section>')

def render_sources(n):
    return ('<section class="chapter-section sources" id="sources"><h2><span>Further reading</span> Standards and references</h2>'
            '<p>Use these primary references for protocol details and exceptions. Standards evolve; follow each RFC’s updates and errata for implementation work.</p><ul>' +
            ''.join(f'<li><a href="{url}">{escape(title)}</a></li>' for title, url in REFERENCES[n]) +
            '</ul><p class="review-date">Content reviewed September 2026. Examples state their simplifying assumptions; animations are teaching models.</p></section>')

def replace_block(text, key, markup, before):
    start, end = f'<!-- {key}:start -->', f'<!-- {key}:end -->'
    block = start + '\n' + markup + '\n' + end
    if start in text:
        return re.sub(re.escape(start) + r'.*?' + re.escape(end), lambda _: block, text, flags=re.S)
    assert before in text, before
    return text.replace(before, block + '\n' + before, 1)

def main():
    for n in QUESTIONS:
        path = DIST / f'chapter{n}.html'
        s = path.read_text()
        marker = re.search(r'<section[^>]*id="book-scan"[^>]*>', s).group()
        s = replace_block(s, 'essentials', render_essentials(n), marker)
        s = replace_block(s, 'layer-details', render_layer_details(n), marker)
        if '<a href="#layer-details">' not in s:
            s = s.replace('<li><a href="#book-scan">', '<li><a href="#layer-details">Sizes, headers &amp; limits</a></li><li><a href="#book-scan">', 1)
        s = replace_block(s, 'sources', render_sources(n), '<nav class="chapter-nav"')
        if '<a href="#essential-details">' not in s:
            s = s.replace('<li><a href="#book-scan">', '<li><a href="#essential-details">Details that matter</a></li><li><a href="#book-scan">', 1)
            s = s.replace('</ol></div></aside>', '<li><a href="#sources">Standards &amp; references</a></li></ol></div></aside>', 1)
        # Count core lessons consistently, excluding the concept check and supplements.
        lessons = len(re.findall(r'<span[^>]*>' + str(n) + r'\.\d+</span>', s)) - 1
        s = re.sub(r'\d+ (?:connected topics|core lessons)', f'{lessons} core lessons', s, count=1)
        # Preserve the full existing reference while removing it from the linear reading burden.
        match = re.search(r'(<section[^>]*id="master-reference"[^>]*>)(.*?)(</section>)', s, re.S)
        if match and 'class="reference-disclosure"' not in match.group():
            content = match.group(2)
            h_end = content.index('</h2>') + len('</h2>')
            revised = (match.group(1) + content[:h_end] + '<details class="reference-disclosure"><summary>Open the technical reference</summary>' + content[h_end:] + '</details>' + match.group(3))
            s = s[:match.start()] + revised + s[match.end():]
        path.write_text(s)
    print(f'Rendered {sum(map(len, QUESTIONS.values()))} essential questions and references across eight chapters.')

if __name__ == '__main__':
    main()
