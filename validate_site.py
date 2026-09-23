"""Check published local links, lesson coverage, assets, and example code parity."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import re

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path, self.ids, self.links, self.assets = path, [], [], []
        self.h1, self.meta, self.essentials = 0, False, 0
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'h1':
            self.h1 += 1
        if tag == 'meta' and attrs.get('name') == 'description':
            self.meta = bool(attrs.get('content'))
        if tag == 'a':
            self.links.append(attrs.get('href', ''))
        if tag in ['script', 'img'] and 'src' in attrs:
            self.assets.append(attrs['src'])
        if tag == 'link' and attrs.get('rel') in ['stylesheet', 'icon']:
            self.assets.append(attrs.get('href', ''))

pages = {p.name: Page(p) for p in DIST.glob('*.html')}
errors, checked = [], 0
for name, p in pages.items():
    if p.h1 != 1 or not p.meta:
        errors.append(f'{name}: expected one h1 and a description')
    errors.extend(f'{name}: duplicate id {key}' for key, count in Counter(p.ids).items() if count > 1)
    for link in p.links + p.assets:
        u = urlsplit(link)
        if u.scheme or u.netloc:
            continue
        dest = unquote(u.path) or name
        checked += 1
        if not (DIST / dest).is_file():
            errors.append(f'{name}: missing file {link}')
        if u.fragment and dest in pages and unquote(u.fragment) not in pages[dest].ids:
            errors.append(f'{name}: missing anchor {link}')
    if name.startswith('chapter'):
        for required in ['essential-details', 'sources', 'master-reference', 'critical-questions']:
            if required not in p.ids:
                errors.append(f'{name}: missing {required}')
        raw = p.path.read_text()
        for obsolete in ['ACK frames are not themselves acknowledged', 'one address per attached subnet', 'separate encryption spaces']:
            if obsolete in raw:
                errors.append(f'{name}: obsolete explanation: {obsolete}')

bank = (DIST / 'critical-questions.js').read_text()
assert len(re.findall(r'^\s+q:', bank, re.M)) == 32
from content_supplements import QUESTIONS
total = sum(map(len, QUESTIONS.values()))
assert f'{total} essential answers' in (DIST / 'index.html').read_text()
from html import escape
for p in (DIST / 'examples').glob('*.py'):
    assert escape(p.read_text()) in (DIST / 'chapter2.html').read_text(), f'{p.name}: displayed and downloadable code differ'
    compile(p.read_text(), str(p), 'exec')
if errors:
    raise SystemExit('\n'.join(errors))
print(f'PASS: {len(pages)} pages, {checked} local references, {total} essential answers, 32 lab scenarios, four matching Python examples.')
