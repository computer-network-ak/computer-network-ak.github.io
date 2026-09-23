# Computer Networks Learning Guide

An eight-chapter course covering Internet foundations, applications, transport, network data and control planes, link layers, wireless networking, and security.

The website includes 73 essential questions, 32 interactive technical scenarios, worked examples, standards references, and downloadable TCP/UDP demonstrations.

## Website

GitHub Pages address: https://computer-network-ak.github.io/

All public website files are in the repository root. The site uses static HTML, CSS, and JavaScript; no package installation or build step is required. `.nojekyll` allows GitHub Pages to serve these files directly.

To publish from this layout, use **Settings → Pages → Deploy from a branch → main → / (root)**. Publication depends on the repository's Pages settings.

## Preview locally

From the repository root, run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000/ in a browser. Stop the server with Ctrl+C.

## Project structure

- `index.html`: course home.
- `topics.html`: searchable chapter catalogue.
- `chapter1.html` through `chapter8.html`: lessons and exercises.
- `app.js`, `interactions.js`, `critical-questions.js`: interactive lessons and navigation.
- `styles.css`, `visuals.css`, `favicon.svg`: presentation and branding.
- `examples/`: four downloadable Python networking programs.
- `scripts/`: content maintenance and validation utilities.

## Validate the site

```sh
python3 scripts/validate_site.py
node --check app.js
node --check interactions.js
node --check critical-questions.js
```

The Python validator checks internal links, anchors, page metadata, question counts, and matching downloadable/displayed example code. Node.js is only needed for the optional JavaScript syntax checks, not to serve the website.

## Maintain the content

Edit the main lessons directly in the chapter HTML files. Essential questions and reference lists are maintained in `scripts/content_supplements.py`; regenerate those sections with:

```sh
python3 scripts/render_supplements.py
python3 scripts/validate_site.py
```

The renderer only regenerates the marked supplementary sections. If question wording or counts change, update the chapter search metadata in `topics.html` and the count in `index.html` as needed. Keep the displayed socket examples in Chapter 2 synchronized with their downloadable files. When changing CSS or JavaScript, update the asset version query strings in the HTML and `app.js` so returning visitors receive the changes.

## Run the networking examples

Use Python 3 and two terminals. Start a server before its corresponding client:

```sh
# Terminal A
python3 examples/tcp_server.py
# Terminal B
python3 examples/tcp_client.py
```

For UDP, use `udp_server.py` and `udp_client.py` instead. These teaching programs bind to loopback only, exit after one client or datagram, and require no external service. Restart the server before repeating the demonstration.
