"""Render maintained learning supplements into the existing static HTML."""
from html import escape
from pathlib import Path
import re
from content_supplements import QUESTIONS, REFERENCES

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
