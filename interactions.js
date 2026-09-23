(() => {
  "use strict";
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const briefed = new WeakSet();
  const briefSpecs = [
    [".formula-panel:not(.compact)", "Select one delay term to isolate the work performed at a router or link.", "The definition changes while the end-to-end sum remains the same four-part model.", "Given packet length, link rate, distance, and traffic, identify which delay term each quantity controls."],
    ["#quicExplorer", "Encrypted QUIC packets move between endpoints.", "Packet numbers, keys, stream offsets, congestion state, and path validation change.", "Explain why packet loss or an address change does not require every stream to restart."],
    ["#dnsExplorer", "A query or response moves between the stub, recursive resolver, and hierarchy.", "The resolver cache, TTL, question, and response code change after each message.", "Explain who performs recursion, who returns referrals, and when the hierarchy is skipped."],
    [".lab-shell", "DATA, ACK, retry, and window messages cross the channel.", "Sequence state, timers, sender window, and receiver buffer change.", "Compare what is retransmitted and what the receiver keeps after loss."],
    ["#routingLab", "The algorithm finalizes one lowest-cost unsettled node.", "Tentative distances shrink and shortest-path-tree edges become permanent.", "For every step, name the chosen node and the relaxation that improved a distance."],
    ["#switchLab", "A frame enters a switch from one host and leaves toward a destination.", "The source MAC is learned before the destination lookup is performed.", "Predict whether the switch forwards to one port, filters, or floods."],
    [".prefix-lab", "A destination address is compared with every forwarding prefix.", "All matching routes qualify; the longest prefix becomes the winner.", "Explain why the most specific match overrides an aggregate or default route."],
    ["#wifiLab", "One station progresses from sensing to a link-layer acknowledgment.", "The contention timer pauses on a busy medium and grows after failure.", "Explain why Wi-Fi avoids collisions instead of detecting them while transmitting."],
    ["#tlsLab", "Handshake flights move between client and server.", "The transcript, peer identity, handshake keys, and traffic keys become established.", "State what is authenticated at each flight and when application data is safe."],
    ["[data-stepper]", "The highlighted stage is the operation currently executing.", "Completed stages remain marked while the caption explains the state transition.", "Describe the input, output, and responsibility of each stage before advancing."]
  ];
  briefSpecs.forEach(([selector, observe, state, takeaway]) => qsa(selector).forEach((element) => {
    if (briefed.has(element)) return;
    briefed.add(element);
    const brief = document.createElement("aside");
    brief.className = "animation-brief";
    brief.setAttribute("aria-label", "How to read this animation");
    brief.innerHTML = `<div><b>OBSERVE</b><span>${observe}</span></div><div><b>STATE TRANSITION</b><span class="brief-action">${state}</span></div><div><b>LEARNING OUTCOME</b><span class="brief-result">${takeaway}</span></div>`;
    element.before(brief);
  }));

  qsa("[data-stepper]").forEach((stepper) => {
    const steps = qsa("[data-flow-step]", stepper);
    const caption = qs("[data-flow-caption]", stepper);
    const initialCaption = caption?.textContent || "Advance through the sequence one stage at a time.";
    const controls = qs(".flow-controls", stepper);
    const status = document.createElement("span");
    status.className = "walkthrough-status";
    status.setAttribute("aria-live", "polite");
    controls?.prepend(status);
    let index = -1;
    const render = () => {
      steps.forEach((step, position) => {
        step.classList.toggle("done", position < index);
        step.classList.toggle("active", position === index);
        if (position === index) step.setAttribute("aria-current", "step");
        else step.removeAttribute("aria-current");
      });
      if (caption && index >= 0) caption.textContent = steps[index].dataset.caption;
      status.textContent = index < 0 ? `READY · ${steps.length} STEPS` : `STEP ${index + 1} / ${steps.length}`;
    };
    qs("[data-flow-next]", stepper)?.addEventListener("click", () => {
      index = (index + 1) % steps.length;
      render();
    });
    qs("[data-flow-reset]", stepper)?.addEventListener("click", () => {
      index = -1;
      steps.forEach((step) => step.classList.remove("active", "done"));
      if (caption) caption.textContent = initialCaption;
      render();
    });
    render();
  });

  const prefixDestination = qs("#prefixDestination");
  if (prefixDestination) {
    const decisions = {
      "10.1.2.9": ["10.1.2.0/24", "interface 3", "/24 is the longest matching prefix"],
      "10.1.8.4": ["10.1.0.0/16", "interface 2", "/16 is more specific than /8"],
      "10.9.4.2": ["10.0.0.0/8", "interface 1", "only the /8 specific route matches"],
      "198.51.100.7": ["0.0.0.0/0", "default", "no specific route matches"]
    };
    const update = () => {
      const [prefix, output, reason] = decisions[prefixDestination.value];
      qsa("#prefixRoutes > div").forEach((row) => row.classList.toggle("winner", row.dataset.prefix === prefix));
      qs("#prefixResult").textContent = `${prefixDestination.value} uses ${output} because ${reason}.`;
    };
    prefixDestination.addEventListener("change", update);
    update();
  }

  const routeNext = qs("#routeNext");
  if (routeNext) {
    const states = [
      { settled: "{u}", distances: "x=1 · v=2 · w=∞ · y=∞", calculation: "D(x)=1 · D(v)=2", text: "Initialize from source u. Direct links make x and v the frontier; every other distance is still unknown.", nodes: ["u"], current: "u", edges: [] },
      { settled: "{u, x}", distances: "v=2 · w=4 · y=7", calculation: "D(w)=min(∞, 1+3)=4 · D(y)=min(∞, 1+6)=7", text: "Choose x because 1 is the smallest tentative cost. Relax each edge out of x; the route to v through x costs 3, so the existing cost 2 remains.", nodes: ["u", "x"], current: "x", edges: ["e-ux"] },
      { settled: "{u, x, v}", distances: "w=3 · y=7", calculation: "D(w)=min(4, 2+1)=3", text: "Choose v at cost 2. The path through v improves w from 4 to 3, so v becomes w’s predecessor.", nodes: ["u", "x", "v"], current: "v", edges: ["e-ux", "e-uv"] },
      { settled: "{u, x, v, w}", distances: "y=4", calculation: "D(y)=min(7, 3+1)=4", text: "Choose w at cost 3. The edge w→y improves y from 7 to 4, replacing the longer path through x.", nodes: ["u", "x", "v", "w"], current: "w", edges: ["e-ux", "e-uv", "e-vw"] },
      { settled: "{u, x, v, w, y}", distances: "complete · d(y)=4", calculation: "shortest u→y path: u→v→w→y · cost 2+1+1=4", text: "Choose y at cost 4. No unsettled nodes remain; the highlighted links are the predecessor edges of the shortest-path tree.", nodes: ["u", "x", "v", "w", "y"], current: "y", edges: ["e-ux", "e-uv", "e-vw", "e-wy"] }
    ];
    let index = 0;
    const routeStatus = document.createElement("span");
    routeStatus.className = "walkthrough-status";
    routeNext.parentElement.prepend(routeStatus);
    const render = () => {
      const state = states[index];
      qs("#routeSettled").textContent = state.settled;
      qs("#routeDistances").textContent = state.distances;
      qs("#routeCalculation").textContent = state.calculation;
      qs("#routeExplanation").textContent = state.text;
      qsa(".graph-node").forEach((node) => {
        node.classList.toggle("settled", state.nodes.includes(node.dataset.node));
        node.classList.toggle("current", node.dataset.node === state.current);
      });
      qsa(".graph-edge").forEach((edge) => edge.classList.toggle("tree", state.edges.some((name) => edge.classList.contains(name))));
      routeNext.textContent = index === states.length - 1 ? "Complete ✓" : `Next relaxation · ${index + 2}/${states.length} →`;
      routeNext.disabled = index === states.length - 1;
      routeStatus.textContent = `STEP ${index + 1} / ${states.length}`;
    };
    routeNext.addEventListener("click", () => { index = Math.min(states.length - 1, index + 1); render(); });
    qs("#routeReset")?.addEventListener("click", () => { index = 0; routeNext.disabled = false; render(); });
    render();
  }

  const switchNext = qs("#switchNext");
  if (switchNext) {
    const events = [
      { frame: "A → C", learn: "A → port 1", lookup: "C is unknown", action: "Flood ports 2, 3, 4", table: "A → 1", text: "The source is learned before the destination lookup. Because C is unknown, copies leave every port except the arrival port; only C accepts its copy.", from: "A", targets: ["B", "C", "D"], destination: "C", flood: true },
      { frame: "C → A", learn: "C → port 3", lookup: "A is known on port 1", action: "Forward only to port 1", table: "A → 1 · C → 3", text: "Learning C adds a second table entry. The known destination A produces one directed forwarding decision instead of a flood.", from: "C", targets: ["A"], destination: "A" },
      { frame: "B → A", learn: "B → port 2", lookup: "A is known on port 1", action: "Forward only to port 1", table: "A → 1 · B → 2 · C → 3", text: "The table grows from observed source addresses. A destination hit sends the frame only to the associated egress port.", from: "B", targets: ["A"], destination: "A" },
      { frame: "A → D", learn: "Refresh A → port 1", lookup: "D is unknown", action: "Flood ports 2, 3, 4", table: "A → 1 · B → 2 · C → 3", text: "A fresh source observation refreshes A’s aging timer. D has never been seen as a source, so the switch must flood this frame.", from: "A", targets: ["B", "C", "D"], destination: "D", flood: true }
    ];
    let index = 0;
    let animationGeneration = 0;
    const switchStatus = document.createElement("span");
    switchStatus.className = "walkthrough-status";
    switchNext.parentElement.prepend(switchStatus);
    const center = (element, container) => {
      const rect = element.getBoundingClientRect();
      const base = container.getBoundingClientRect();
      return { x: rect.left - base.left + rect.width / 2, y: rect.top - base.top + rect.height / 2 };
    };
    const fly = async (from, to, label, copy, generation) => {
      const layer = qs("#switchPacketLayer");
      const packet = document.createElement("i");
      packet.className = `switch-frame-packet${copy ? " copy" : ""}`;
      packet.textContent = label;
      const start = center(from, layer);
      const end = center(to, layer);
      packet.style.left = `${start.x - 29}px`;
      packet.style.top = `${start.y - 14}px`;
      layer.append(packet);
      const animation = packet.animate([
        { transform: "translate(0,0) scale(.82)", opacity: 0 },
        { transform: "translate(0,0) scale(1)", opacity: 1, offset: .12 },
        { transform: `translate(${end.x - start.x}px,${end.y - start.y}px) scale(1)`, opacity: 1, offset: .88 },
        { transform: `translate(${end.x - start.x}px,${end.y - start.y}px) scale(.82)`, opacity: 0 }
      ], { duration: copy ? 1200 : 1500, easing: "cubic-bezier(.22,.7,.25,1)", fill: "forwards" });
      try { await animation.finished; } catch (_) { /* replaced by a new event */ }
      if (generation === animationGeneration) packet.remove();
    };
    const setSwitchPhase = (phase, eventNumber) => {
      qsa(".switch-decision > div").forEach((item, position) => item.classList.toggle("active", position === phase));
      const labels = ["LEARN SOURCE", "LOOK UP DESTINATION", "FORWARD FRAME"];
      switchStatus.textContent = phase < 0 ? `EVENT ${eventNumber} / ${events.length}` : `EVENT ${eventNumber} / ${events.length} · ${labels[phase]}`;
    };
    const animateEvent = async (event, eventNumber) => {
      animationGeneration += 1;
      const generation = animationGeneration;
      const layer = qs("#switchPacketLayer");
      layer.replaceChildren();
      const source = qs(`.switch-host[data-host="${event.from}"]`);
      const core = qs(".switch-core");
      setSwitchPhase(0, eventNumber);
      await fly(source, core, event.frame, false, generation);
      if (generation !== animationGeneration) return;
      setSwitchPhase(1, eventNumber);
      await wait(520);
      if (generation !== animationGeneration) return;
      setSwitchPhase(2, eventNumber);
      await Promise.all(event.targets.map((target) => fly(core, qs(`.switch-host[data-host="${target}"]`), event.flood ? "COPY" : event.frame, event.flood, generation)));
      if (generation === animationGeneration) {
        qsa(".switch-decision > div").forEach((item) => item.classList.remove("active"));
        switchStatus.textContent = `COMPLETE · EVENT ${eventNumber} / ${events.length}`;
      }
    };
    const render = (animate = true) => {
      const event = events[index];
      qs("#switchFrame").textContent = event.frame;
      qs("#switchLearn").textContent = event.learn;
      qs("#switchLookup").textContent = event.lookup;
      qs("#switchAction").textContent = event.action;
      qs("#switchTable").textContent = event.table;
      qs("#switchExplanation").textContent = event.text;
      qsa(".switch-host").forEach((host) => {
        host.classList.toggle("active", host.dataset.host === event.from || event.targets.includes(host.dataset.host));
        host.classList.toggle("source", host.dataset.host === event.from);
        host.classList.toggle("destination", host.dataset.host === event.destination);
      });
      setSwitchPhase(-1, index + 1);
      switchNext.textContent = `Animate event ${index + 1} →`;
      if (animate) animateEvent(event, index + 1);
    };
    switchNext.addEventListener("click", async () => {
      switchNext.disabled = true;
      const eventIndex = index;
      render(false);
      const eventGeneration = animationGeneration + 1;
      await animateEvent(events[eventIndex], eventIndex + 1);
      if (animationGeneration !== eventGeneration) { switchNext.disabled = false; return; }
      index = (eventIndex + 1) % events.length;
      switchNext.textContent = index === 0 ? "Replay from event 1 ↺" : `Animate event ${index + 1} →`;
      switchNext.disabled = false;
    });
    qs("#switchReset")?.addEventListener("click", () => { animationGeneration += 1; index = 0; qs("#switchPacketLayer").replaceChildren(); render(false); });
    render(false);
  }

  const wifiPlay = qs("#wifiPlay");
  if (wifiPlay) {
    const scenarios = {
      success: [
        { title: "Sense channel", note: "wait until idle", caption: "The station listens first. If energy or a valid frame indicates a busy channel, it defers instead of transmitting." },
        { title: "DIFS", note: "lower priority wait", caption: "After the medium becomes idle, the sender waits DIFS. Short SIFS responses such as ACK retain priority." },
        { title: "Random backoff", note: "counter 3 → 0", caption: "The station chooses a random slot count. It decrements only while the medium stays idle and freezes if another transmission begins." },
        { title: "DATA", note: "station → access point", caption: "At counter zero, the station transmits DATA. A Wi-Fi radio cannot reliably detect a collision while it is transmitting." },
        { title: "SIFS + ACK", note: "success · CW returns to minimum", caption: "The receiver answers after SIFS. The ACK confirms delivery, completes the unicast attempt, and resets the sender's contention window to CWmin." }
      ],
      retry: [
        { title: "Sense channel", note: "wait until idle", caption: "The station listens first and defers while the channel is busy." },
        { title: "DIFS", note: "lower priority wait", caption: "The idle medium must remain quiet for DIFS before ordinary contention begins." },
        { title: "Random backoff", note: "counter 2 → 0", caption: "A random backoff reduces the chance that several ready stations transmit at the same instant." },
        { title: "DATA", note: "transmission attempt 1", caption: "The sender transmits when its counter reaches zero. Hidden terminals, interference, or corruption may prevent successful reception." },
        { title: "No ACK", note: "failure inferred", className: "failure", caption: "No ACK arrives after the expected SIFS interval. The sender infers failure; it does not know whether DATA or its ACK was lost." },
        { title: "Increase CW", note: "binary exponential backoff", className: "failure", caption: "The contention window grows, so the next random backoff is drawn from a wider range. This lowers repeated-collision probability under load." },
        { title: "Backoff + retry", note: "new attempt", className: "recovery", caption: "After another DIFS and a new random countdown, the sender retransmits. Success still requires a new ACK." },
        { title: "SIFS + ACK", note: "retry succeeds · CW → CWmin", className: "recovery", caption: "The access point receives the retry and responds after SIFS. The ACK confirms success, and the station resets its contention window to CWmin for the next frame." }
      ]
    };
    let generation = 0;
    let wifiIndex = -1;
    let wifiPlaying = false;
    let scenario = "success";
    let steps = [];
    const mediumStates = {
      "Sense channel": ["sensing", "CLEAR-CHANNEL ASSESSMENT", "listening for energy or a valid frame", "CCA"],
      DIFS: ["difs", "MEDIUM IDLE · DIFS", "ordinary senders must wait", "DIFS"],
      "Random backoff": ["backoff", "RANDOM BACKOFF", "counter decrements only in idle slots", "3 → 2 → 1 → 0"],
      DATA: ["data", "DATA ON AIR", "station transmits after counter reaches zero", "DATA"],
      "SIFS + ACK": ["ack", "SIFS · ACK RETURNING", "short response receives priority", "ACK"],
      "No ACK": ["timeout", "ACK TIMER EXPIRED", "DATA or ACK may have been lost", "NO ACK"],
      "Increase CW": ["window", "CONTENTION WINDOW GROWS", "choose the next counter from a wider range", "CW × 2"],
      "Backoff + retry": ["retry", "NEW BACKOFF · RETRY", "a later attempt sends a new DATA frame", "RETRY"]
    };
    const renderMedium = () => {
      const medium = qs("#wifiMedium");
      const item = wifiIndex >= 0 ? scenarios[scenario][wifiIndex] : null;
      const [phase, label, detail, packetLabel] = item ? mediumStates[item.title] : ["idle", "CHANNEL IDLE", "waiting to begin", "FRAME"];
      medium.dataset.phase = phase;
      qs("#wifiMediumLabel").textContent = label;
      qs("#wifiCounter").textContent = detail;
      qs("#wifiAirPacket").textContent = packetLabel;
      const progress = item ? Math.max(1, Math.round((wifiIndex + 1) / scenarios[scenario].length * 7)) : 0;
      qsa("#wifiSlots i").forEach((slot, position) => {
        slot.classList.toggle("elapsed", position < progress);
        slot.classList.toggle("current", position === progress - 1);
      });
    };
    const buildTimeline = () => {
      const timeline = qs("#wifiTimeline");
      qs("#wifiLab").dataset.scenario = scenario;
      timeline.replaceChildren();
      scenarios[scenario].forEach((item, position) => {
        if (position) {
          const arrow = document.createElement("i");
          arrow.textContent = "→";
          timeline.append(arrow);
        }
        const step = document.createElement("div");
        step.dataset.wifiStep = "";
        step.dataset.caption = item.caption;
        if (item.className) step.classList.add(item.className);
        step.innerHTML = `<b>${position + 1}</b><span>${item.title}</span><small>${item.note}</small>`;
        timeline.append(step);
      });
      steps = qsa("[data-wifi-step]", timeline);
    };
    const renderWifi = () => {
      steps.forEach((step, position) => {
        step.classList.toggle("done", position < wifiIndex);
        step.classList.toggle("active", position === wifiIndex);
        if (position === wifiIndex) step.setAttribute("aria-current", "step");
        else step.removeAttribute("aria-current");
      });
      qs("#wifiStatus").textContent = wifiIndex < 0 ? `READY · ${steps.length} STEPS` : `STEP ${wifiIndex + 1} / ${steps.length}`;
      if (wifiIndex >= 0) qs("#wifiCaption").textContent = steps[wifiIndex].dataset.caption;
      renderMedium();
    };
    const nextWifi = () => {
      if (wifiIndex >= steps.length - 1) return false;
      wifiIndex += 1;
      renderWifi();
      return wifiIndex < steps.length - 1;
    };
    wifiPlay.addEventListener("click", async () => {
      if (wifiPlaying) { wifiPlaying = false; generation += 1; wifiPlay.textContent = "▶ Resume"; return; }
      if (wifiIndex >= steps.length - 1) wifiIndex = -1;
      wifiPlaying = true;
      const current = ++generation;
      steps.forEach((step) => step.classList.remove("active", "done"));
      wifiPlay.textContent = "❚❚ Pause";
      while (wifiPlaying && current === generation && nextWifi()) {
        await wait(2200);
      }
      if (wifiPlaying && current === generation && wifiIndex < steps.length - 1) nextWifi();
      wifiPlaying = false;
      wifiPlay.textContent = wifiIndex >= steps.length - 1 ? "↺ Replay" : "▶ Resume";
    });
    qs("#wifiNext")?.addEventListener("click", () => {
      wifiPlaying = false; generation += 1;
      if (wifiIndex >= steps.length - 1) wifiIndex = -1;
      nextWifi(); wifiPlay.textContent = "▶ Auto play";
    });
    qs("#wifiReset")?.addEventListener("click", () => {
      generation += 1;
      wifiPlaying = false; wifiIndex = -1;
      renderWifi();
      wifiPlay.textContent = "▶ Auto play";
      qs("#wifiCaption").textContent = "The sender listens before transmitting because Wi-Fi cannot reliably detect collisions in progress.";
    });
    qsa("[data-wifi-scenario]").forEach((button) => button.addEventListener("click", () => {
      scenario = button.dataset.wifiScenario;
      qsa("[data-wifi-scenario]").forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-selected", String(selected));
      });
      generation += 1;
      wifiPlaying = false;
      wifiIndex = -1;
      buildTimeline();
      renderWifi();
      wifiPlay.textContent = "▶ Auto play";
      qs("#wifiCaption").textContent = scenario === "success" ? "Follow a successful contention and acknowledgment." : "Follow the recovery branch when no acknowledgment returns.";
    }));
    buildTimeline();
    renderWifi();
  }

  const tlsNext = qs("#tlsNext");
  if (tlsNext) {
    let index = -1;
    const steps = qsa("[data-tls-step]");
    const render = () => {
      steps.forEach((step, position) => {
        step.classList.toggle("done", position < index);
        step.classList.toggle("active", position === index);
      });
      if (index >= 0) {
        const current = steps[index];
        qs("#tlsDirection").textContent = current.dataset.direction;
        qs("#tlsMessage").textContent = current.querySelector("b").textContent;
        qs("#tlsKeyState").textContent = current.dataset.key;
        qs("#tlsCaption").textContent = current.dataset.caption;
        const direction = current.dataset.direction;
        qs(".tls-peers").dataset.flow = direction.includes("⇄") ? "both" : direction.startsWith("CLIENT") ? "right" : "left";
      } else {
        qs(".tls-peers").dataset.flow = "idle";
      }
      qs("#tlsStatus").textContent = index < 0 ? `READY · ${steps.length} STEPS` : `STEP ${index + 1} / ${steps.length}`;
      tlsNext.textContent = index === steps.length - 1 ? "Replay handshake ↺" : "Send next flight →";
    };
    tlsNext.addEventListener("click", () => { index = (index + 1) % steps.length; render(); });
    qs("#tlsReset")?.addEventListener("click", () => {
      index = -1;
      steps.forEach((step) => step.classList.remove("active", "done"));
      qs("#tlsDirection").textContent = "—";
      qs("#tlsMessage").textContent = "Ready";
      qs("#tlsKeyState").textContent = "No shared traffic keys";
      qs("#tlsCaption").textContent = "Begin with a client key share so fresh traffic keys can be derived quickly.";
      render();
    });
    render();
  }

  const quicExplorer = qs("#quicExplorer");
  if (quicExplorer) {
    const scenarios = {
      handshake: [
        { event: "Client creates connection state", caption: "The browser chooses source and destination Connection IDs. The destination ID identifies this QUIC connection independently of the client IP address.", wire: "local: choose DCID 7fa2…91c0 · open UDP socket", focus: "client", crypto: "derive Initial secrets", s0: "not opened", s4: "not opened", keys: "Initial secrets", window: "cwnd 10 packets" },
        { event: "Client sends Initial", caption: "The first padded UDP datagram carries QUIC Initial packet number 0, a TLS ClientHello, a fresh key share, and QUIC transport parameters.", wire: "UDP → Initial[PN 0: CRYPTO(ClientHello), PADDING]", packet: ["INITIAL", "PN 0", "right"], crypto: "ClientHello →", keys: "Initial keys", window: "1 packet in flight" },
        { event: "Server opens connection", caption: "The server uses the destination Connection ID to derive Initial keys, decrypt the ClientHello, allocate connection state, and enforce the pre-validation amplification limit.", wire: "local: derive Initial keys · parse ClientHello · bind CID", focus: "server", crypto: "ClientHello parsed", keys: "Initial keys", window: "anti-amplification limit" },
        { event: "Server acknowledges Initial", caption: "An ACK frame confirms receipt of client Initial packet number 0. Initial and Handshake packets use separate packet-number spaces.", wire: "← Initial[PN 0: ACK range {0}, CRYPTO(ServerHello)]", packet: ["INITIAL + ACK", "PN 0", "left"], crypto: "← ServerHello + ACK", keys: "Initial → Handshake", window: "RTT sample starts" },
        { event: "Server sends TLS parameters", caption: "ServerHello supplies the server key share. Both endpoints can now derive handshake secrets, while server identity still remains to be authenticated.", wire: "← Handshake[PN 0: EncryptedExtensions, transport parameters]", packet: ["HANDSHAKE", "PN 0", "left"], crypto: "← selected parameters", keys: "Handshake keys", window: "address unverified" },
        { event: "Server proves identity", caption: "The certificate chain binds a public key to the server name. CertificateVerify signs the transcript and proves possession of the corresponding private key.", wire: "← Handshake[PN 1: Certificate, CertificateVerify]", packet: ["CERTIFICATE", "PN 1", "left"], crypto: "← certificate + proof", keys: "Handshake keys", window: "bytes sent limited" },
        { event: "Server sends Finished", caption: "The server Finished value authenticates the handshake transcript under a derived secret. The client must verify it before trusting the negotiated connection.", wire: "← Handshake[PN 2: Finished]", packet: ["FINISHED", "PN 2", "left"], crypto: "← server Finished", keys: "server 1-RTT key ready", window: "RTT sample 34 ms" },
        { event: "Client validates handshake", caption: "The browser validates the certificate chain, requested hostname, signature, transcript, and Finished value. Authentication failure would terminate the connection here.", wire: "local: verify chain + name + signature + transcript", focus: "client", crypto: "server authenticated ✓", keys: "derive 1-RTT secrets", window: "handshake verified" },
        { event: "Client sends Finished", caption: "The client authenticates its view of the transcript with its Finished message. Both endpoints now possess independent client and server 1-RTT traffic keys.", wire: "Handshake[PN 1: Finished, ACK] →", packet: ["FINISHED + ACK", "PN 1", "right"], crypto: "client Finished →", keys: "1-RTT keys", window: "handshake confirmed" },
        { event: "Server confirms completion", caption: "HANDSHAKE_DONE tells the client that the server considers the handshake complete. Obsolete Initial and Handshake keys can be discarded at the defined milestones.", wire: "← 1-RTT[PN 3: HANDSHAKE_DONE, ACK]", packet: ["HANDSHAKE DONE", "PN 3", "left"], crypto: "TLS confirmed ✓", keys: "discard old keys", window: "cwnd begins growth" },
        { event: "HTTP/3 opens control streams", caption: "Each endpoint opens unidirectional control and QPACK streams. SETTINGS communicates limits before ordinary request streams carry HTTP semantics.", wire: "1-RTT[control stream: SETTINGS, QPACK] →", packet: ["H3 SETTINGS", "PN 2", "right"], crypto: "encrypted control", s0: "request stream ready", s4: "request stream ready", keys: "1-RTT keys", window: "2 packets in flight" },
        { event: "Requests and responses multiplex", caption: "A GET request travels on one stream while HTML and CSS response bytes use independent stream offsets. ACK ranges confirm packet receipt without merging stream ordering.", wire: "⇄ 1-RTT[STREAM 0 HTML, STREAM 4 CSS, ACK ranges]", packet: ["1-RTT STREAMS", "PN 7", "left"], crypto: "encrypted + authenticated", s0: "HTML complete ✓", s4: "CSS complete ✓", keys: "1-RTT keys", window: "cwnd grows on ACK" }
      ],
      loss: [
        { event: "Scheduler selects stream frames", caption: "The server has bytes ready on two HTTP/3 streams. Its packet scheduler chooses frames while respecting stream priority, connection flow control, and congestion limits.", wire: "local: STREAM 0 + STREAM 4 ready · cwnd permits 3 packets", focus: "server", crypto: "1-RTT protection", s0: "offsets 0–2399 queued", s4: "offsets 0–799 queued", keys: "1-RTT keys", window: "cwnd 12 packets" },
        { event: "Packet 42 carries HTML", caption: "Packet number 42 carries Stream 0 bytes at offset 0. Packet numbers track delivery of packets; stream offsets track ordered bytes within one stream.", wire: "← PN 42[STREAM 0 off=0 len=1200]", packet: ["STREAM 0", "PN 42", "left"], crypto: "authenticated packet", s0: "bytes 0–1199 arrive", s4: "queued", keys: "1-RTT keys", window: "1 packet acknowledged soon" },
        { event: "Packet 43 leaves server", caption: "The next packet carries later Stream 0 bytes. It has a new packet number and an offset that immediately reveals where the payload belongs.", wire: "← PN 43[STREAM 0 off=1200 len=1200]", packet: ["STREAM 0", "PN 43", "left"], crypto: "authenticated packet", s0: "offset 1200 in flight", s4: "queued", keys: "1-RTT keys", window: "2 packets in flight" },
        { event: "Packet 43 is lost", caption: "The network drops packet 43. The client therefore has a gap in Stream 0 after byte 1199, but no connection-wide byte-stream gap exists.", wire: "× PN 43 lost before reaching client", packet: ["STREAM 0", "PN 43", "left", true], crypto: "packet never verified", s0: "gap at offset 1200", s4: "independent", keys: "1-RTT keys", window: "loss not yet confirmed" },
        { event: "Packet 44 carries CSS", caption: "Packet 44 arrives with complete Stream 4 data. Because Stream 4 has no missing earlier bytes, the client can deliver CSS immediately despite the Stream 0 gap.", wire: "← PN 44[STREAM 4 off=0 len=800 FIN]", packet: ["STREAM 4", "PN 44", "left"], crypto: "integrity verified", s0: "still waiting at 1200", s4: "CSS delivered ✓", keys: "1-RTT keys", window: "cross-stream progress" },
        { event: "Client builds ACK ranges", caption: "The client records receipt of packet numbers 42 and 44. QUIC ACK frames describe ranges, so the missing packet number is visible without cumulative ambiguity.", wire: "local: received ranges {42, 44} · gap {43}", focus: "client", crypto: "ACK frame prepared", s0: "gap retained", s4: "complete ✓", keys: "1-RTT keys", window: "ACK delay measured" },
        { event: "ACK ranges return", caption: "An encrypted ACK reports the discontiguous ranges. ACK-only packets do not trigger immediate ACKs; later traffic can cause those packets to be acknowledged.", wire: "ACK ranges {42, 44} →", packet: ["ACK RANGES", "PN 18", "right"], crypto: "ACK frame encrypted", s0: "waiting for repair", s4: "complete ✓", keys: "1-RTT keys", window: "bytes in flight updated" },
        { event: "Server detects loss", caption: "Packet-threshold or time-threshold logic declares packet 43 lost after sufficient evidence. QUIC does not wait for a stream-level timeout for every isolated loss.", wire: "local: largest_acked=44 · PN 43 declared lost", focus: "server", crypto: "recovery state updated", s0: "frame marked for resend", s4: "complete ✓", keys: "1-RTT keys", window: "enter recovery" },
        { event: "Congestion controller reacts", caption: "The sender reduces its congestion window and updates pacing because packet loss may indicate congestion. Reliability and congestion control react to the same evidence for different reasons.", wire: "local: reduce cwnd · retain receiver flow-control state", focus: "server", crypto: "keys unchanged", s0: "missing bytes queued", s4: "unaffected", keys: "1-RTT keys", window: "cwnd reduced + paced" },
        { event: "Lost frame enters packet 45", caption: "QUIC does not recreate packet 43. It places the still-needed Stream 0 frame into new packet 45 with a fresh packet number and nonce.", wire: "← PN 45[STREAM 0 off=1200 len=1200 · retransmitted frame]", packet: ["STREAM 0 RETRY", "PN 45", "left"], crypto: "fresh nonce + PN", s0: "repair in flight", s4: "already complete", keys: "1-RTT keys", window: "paced retransmission" },
        { event: "Stream 0 gap closes", caption: "The repaired bytes authenticate and fill the missing offset range. Any later buffered Stream 0 bytes can now be released in order to HTTP/3.", wire: "local: insert off=1200 · contiguous range extends", focus: "client", crypto: "integrity verified", s0: "HTML delivered ✓", s4: "CSS delivered ✓", keys: "1-RTT keys", window: "application unblocked" },
        { event: "Recovery completes", caption: "The client acknowledges packet 45. The sender removes the recovered bytes from flight and cautiously resumes congestion-window growth.", wire: "ACK ranges {42, 44–45} →", packet: ["ACK", "PN 19", "right"], crypto: "ACK authenticated", s0: "HTML complete ✓", s4: "CSS complete ✓", keys: "1-RTT keys", window: "recovery complete" }
      ],
      migration: [
        { event: "Wi-Fi path is active", caption: "The connection currently uses a validated Wi-Fi address pair. Application streams, packet numbers, keys, and congestion state all belong to one QUIC connection.", wire: "path A: 10.0.0.8:53120 ↔ 203.0.113.20:443", packet: ["1-RTT", "PN 88", "right"], path: "Wi-Fi · 10.0.0.8", crypto: "1-RTT protected", s0: "active", s4: "active", keys: "1-RTT keys", window: "path A validated" },
        { event: "Connection IDs identify peers", caption: "Packets carry destination Connection IDs selected by the peer. The server can route an arriving packet to connection state without using the address four-tuple as the identity.", wire: "local: active DCID 7fa2…91c0 · path A registered", focus: "both", path: "Wi-Fi · validated", crypto: "CID bound to state", s0: "offsets retained", s4: "offsets retained", keys: "1-RTT keys", window: "normal cwnd" },
        { event: "Wi-Fi connectivity degrades", caption: "The device loses or leaves the Wi-Fi network. No QUIC stream is reset merely because the old local interface can no longer carry packets.", wire: "local: path A stops delivering · connection state retained", focus: "client", path: "Wi-Fi · unavailable", crypto: "keys retained", s0: "temporarily paused", s4: "temporarily paused", keys: "1-RTT keys", window: "old path uncertain" },
        { event: "Client obtains a 5G address", caption: "The operating system exposes a cellular route with a different source IP address and UDP port. This creates a candidate path, not a new QUIC connection.", wire: "local: candidate 198.51.100.74:62004", focus: "client", path: "5G · 198.51.100.74", crypto: "same connection", s0: "state preserved", s4: "state preserved", keys: "1-RTT keys", window: "candidate path" },
        { event: "Packet arrives on candidate path", caption: "The client sends a protected packet from the new address using a valid destination Connection ID and continuing packet numbers.", wire: "path B: PN 89[DCID 7fa2…91c0, PING] →", packet: ["1-RTT + CID", "PN 89", "right"], path: "5G · candidate", crypto: "existing 1-RTT keys", s0: "offsets unchanged", s4: "offsets unchanged", keys: "1-RTT keys", window: "path B unvalidated" },
        { event: "Server finds existing connection", caption: "The destination Connection ID maps the packet to the established connection. The server authenticates it with existing keys before accepting the address change.", wire: "local: CID lookup → existing connection · decrypt PN 89", focus: "server", path: "5G · recognized", crypto: "packet authenticated ✓", s0: "same stream state", s4: "same stream state", keys: "1-RTT keys", window: "validation required" },
        { event: "Server limits unvalidated path", caption: "Until the new address proves reachability, the server applies anti-amplification rules and avoids sending an excessive response to a potentially spoofed source.", wire: "local: bytes_sent_on_B ≤ amplification allowance", focus: "server", path: "5G · unvalidated", crypto: "identity established", s0: "state preserved", s4: "state preserved", keys: "1-RTT keys", window: "amplification limited" },
        { event: "Server challenges path B", caption: "The server sends unpredictable PATH_CHALLENGE data to the cellular address. Receiving and echoing it will prove bidirectional reachability.", wire: "← PN 52[PATH_CHALLENGE 6f2a…]", packet: ["PATH CHALLENGE", "PN 52", "left"], path: "5G · challenge sent", crypto: "authenticated challenge", s0: "waiting", s4: "waiting", keys: "1-RTT keys", window: "validation timer" },
        { event: "Client returns path response", caption: "The client echoes the exact challenge bytes in PATH_RESPONSE from the candidate path. The response belongs to the same encrypted connection.", wire: "PN 90[PATH_RESPONSE 6f2a…] →", packet: ["PATH RESPONSE", "PN 90", "right"], path: "5G · response sent", crypto: "authenticated response", s0: "offsets preserved", s4: "offsets preserved", keys: "1-RTT keys", window: "checking response" },
        { event: "Path B is validated", caption: "The server verifies the response and marks the cellular path reachable. The new path now has its own measured RTT and path characteristics.", wire: "local: PATH_RESPONSE matches · path B validated", focus: "server", path: "5G · validated ✓", crypto: "same secure connection", s0: "ready to resume", s4: "ready to resume", keys: "1-RTT keys", window: "RTT sample begins" },
        { event: "Congestion state adapts", caption: "Capacity on the new path is unknown. The sender applies conservative congestion state and pacing rather than assuming that Wi-Fi capacity is safe on cellular.", wire: "local: initialize path-B RTT · conservative cwnd + pacing", focus: "both", path: "5G · measured path", crypto: "keys unchanged", s0: "ready", s4: "ready", keys: "1-RTT keys", window: "new-path cwnd" },
        { event: "Application traffic resumes", caption: "Existing streams continue with their original stream IDs and offsets. The application sees a brief path transition instead of a complete transport and TLS restart.", wire: "1-RTT[PN 91: STREAM 0 + STREAM 4] → on path B", packet: ["1-RTT STREAMS", "PN 91", "right"], path: "5G · active ✓", crypto: "same connection", s0: "continues ✓", s4: "continues ✓", keys: "1-RTT keys", window: "path B active" }
      ]
    };
    let scenario = "handshake";
    let index = -1;
    let generation = 0;
    let playing = false;
    const speed = () => Number(qs("#quicSpeed").value);
    const motionDuration = () => Math.max(900, Math.min(1800, Math.round(speed() * .45)));
    const setFocus = (focus = "both") => {
      const endpoints = qsa(".quic-stage .endpoint");
      endpoints.forEach((endpoint, position) => {
        endpoint.classList.remove("sending", "receiving", "processing");
        const selected = focus === "both" || (focus === "client" && position === 0) || (focus === "server" && position === 1);
        endpoint.classList.toggle("processing", selected);
      });
      qs(".quic-flight-path").className = "quic-flight-path";
      qs("#quicLossMark").classList.remove("show");
      qs("#quicPacket").style.opacity = ".16";
      qsa(".quic-lanes > div").forEach((lane, laneIndex) => lane.classList.toggle("active", laneIndex === 0));
    };
    const setPacket = (packet = ["IDLE", "—", "right"]) => {
      const [label, number, direction, lost] = packet;
      const element = qs("#quicPacket");
      const controlPacket = /INITIAL|HANDSHAKE|ACK|PATH|CERTIFICATE|FINISHED|SETTINGS|DONE/.test(label);
      element.querySelector("span").textContent = label;
      element.querySelector("b").textContent = number;
      element.className = "quic-packet";
      element.style.opacity = "1";
      element.dataset.direction = direction;
      const stage = qs(".quic-stage");
      const endpoints = qsa(".quic-stage .endpoint");
      endpoints.forEach((endpoint) => endpoint.classList.remove("sending", "receiving", "processing"));
      endpoints[direction === "right" ? 0 : 1].classList.add("sending");
      endpoints[direction === "right" ? 1 : 0].classList.add("receiving");
      const flight = qs(".quic-flight-path");
      flight.className = `quic-flight-path active${direction === "left" ? " reverse" : ""}`;
      qsa(".quic-lanes > div").forEach((lane, laneIndex) => lane.classList.toggle("active", laneIndex === (controlPacket ? 0 : 1)));
      const compact = stage.clientWidth <= 600;
      const packetWidth = element.offsetWidth;
      const clientStart = compact ? 20 : endpoints[0].offsetLeft + endpoints[0].offsetWidth + 24;
      const serverStart = compact ? stage.clientWidth - packetWidth - 20 : endpoints[1].offsetLeft - packetWidth - 24;
      element.style.transition = "none";
      element.style.left = `${direction === "right" ? clientStart : serverStart}px`;
      void element.offsetWidth;
      element.style.transition = `left ${motionDuration()}ms cubic-bezier(.22,.8,.28,1), opacity .3s`;
      element.style.left = `${direction === "right" ? serverStart : clientStart}px`;
      element.classList.toggle("lost", Boolean(lost));
      qs("#quicLossMark").classList.toggle("show", Boolean(lost));
    };
    const reset = () => {
      generation += 1; playing = false; index = -1;
      qsa("[data-quic-scenario]").forEach((item) => item.setAttribute("aria-selected", String(item.dataset.quicScenario === scenario)));
      qs("#quicPlay").textContent = "▶ Auto play";
      qs("#quicEvent").textContent = "Ready";
      qs("#quicCounter").textContent = `Step 0 / ${scenarios[scenario].length}`;
      qs("#quicCaption").textContent = "Choose a scenario, then advance one protocol event at a time.";
      qs("#quicWire").textContent = "wire: idle";
      qs("#quicCryptoLane").textContent = "idle";
      qs("#quicStream0").textContent = "not opened";
      qs("#quicStream4").textContent = "not opened";
      qs("#quicKeys").textContent = "Initial keys";
      qs("#quicWindow").textContent = "cwnd 10 packets";
      qs("#quicClientPath").textContent = "Wi-Fi · 10.0.0.8";
      qs("#quicLossMark").classList.remove("show");
      qsa(".quic-stage .endpoint").forEach((endpoint) => endpoint.classList.remove("sending", "receiving", "processing"));
      qs(".quic-flight-path").className = "quic-flight-path";
      qsa(".quic-lanes > div").forEach((lane) => lane.classList.remove("active"));
      const packet = qs("#quicPacket");
      packet.className = "quic-packet";
      packet.style.transition = "none";
      packet.style.opacity = "1";
      packet.style.left = `${Math.max(16, (qs(".quic-stage").clientWidth - packet.offsetWidth) / 2)}px`;
      packet.style.top = "";
      packet.querySelector("span").textContent = "INITIAL";
      packet.querySelector("b").textContent = "PN 0";
    };
    const advance = () => {
      if (index >= scenarios[scenario].length - 1) return false;
      index += 1;
      const step = scenarios[scenario][index];
      qs("#quicEvent").textContent = step.event;
      qs("#quicCounter").textContent = `Step ${index + 1} / ${scenarios[scenario].length}`;
      qs("#quicCaption").textContent = step.caption;
      qs("#quicWire").textContent = `wire: ${step.wire}`;
      qs("#quicCryptoLane").textContent = step.crypto;
      qs("#quicStream0").textContent = step.s0 || qs("#quicStream0").textContent;
      qs("#quicStream4").textContent = step.s4 || qs("#quicStream4").textContent;
      qs("#quicKeys").textContent = step.keys;
      qs("#quicWindow").textContent = step.window;
      if (step.path) qs("#quicClientPath").textContent = step.path;
      if (step.packet) setPacket(step.packet);
      else setFocus(step.focus);
      return index < scenarios[scenario].length - 1;
    };
    const autoplay = async () => {
      if (playing) { playing = false; generation += 1; qs("#quicPlay").textContent = "▶ Resume"; return; }
      if (index >= scenarios[scenario].length - 1) reset();
      playing = true; const current = ++generation; qs("#quicPlay").textContent = "❚❚ Pause";
      while (playing && current === generation && advance()) await wait(speed());
      playing = false; qs("#quicPlay").textContent = index >= scenarios[scenario].length - 1 ? "↺ Replay" : "▶ Resume";
    };
    qsa("[data-quic-scenario]").forEach((button) => button.addEventListener("click", () => {
      scenario = button.dataset.quicScenario;
      qsa("[data-quic-scenario]").forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-selected", String(selected));
      });
      reset();
    }));
    qs("#quicNext").addEventListener("click", () => { playing = false; generation += 1; qs("#quicPlay").textContent = "▶ Auto play"; advance(); });
    qs("#quicPlay").addEventListener("click", autoplay);
    qs("#quicReset").addEventListener("click", reset);
    reset();
  }

  const dnsExplorer = qs("#dnsExplorer");
  if (dnsExplorer) {
    const scenarios = {
      miss: [
        { from: 0, to: 1, event: "Recursive query", caption: "The stub asks its configured recursive resolver for the final A record.", wire: "client → resolver · RD=1 · QNAME www.example.com · QTYPE A", cache: "miss", ttl: "TTL —", rcode: "NOERROR" },
        { from: 1, to: 2, event: "Ask a root server", caption: "With no cached delegation, the resolver begins at a root server using an iterative query.", wire: "resolver → root · RD=0 · www.example.com A", cache: "miss", ttl: "root hints" },
        { from: 2, to: 1, event: "Root returns .com referral", caption: "The root does not know the host address. It returns .com NS records and glue addresses.", wire: "root → resolver · Authority: com NS · Additional: glue", cache: ".com NS cached", ttl: "TTL 172800 s" },
        { from: 1, to: 3, event: "Ask a .com server", caption: "The resolver follows the referral and asks a .com TLD server.", wire: "resolver → .com TLD · www.example.com A", cache: ".com NS cached", ttl: "TTL 172800 s" },
        { from: 3, to: 1, event: "TLD delegates example.com", caption: "The TLD returns authoritative NS records for example.com and any needed glue.", wire: ".com TLD → resolver · example.com NS ns1.example.net", cache: "example.com NS cached", ttl: "TTL 86400 s" },
        { from: 1, to: 4, event: "Ask authoritative server", caption: "The resolver asks the server responsible for the example.com zone.", wire: "resolver → authoritative · www.example.com A", cache: "delegations cached", ttl: "TTL running" },
        { from: 4, to: 1, event: "Authoritative answer", caption: "The zone’s authoritative server returns the address record with the authoritative-answer flag.", wire: "authoritative → resolver · AA=1 · A 203.0.113.80 · TTL 300", cache: "A 203.0.113.80", ttl: "TTL 300 s" },
        { from: 1, to: 0, event: "Resolver returns final answer", caption: "The resolver caches the record and returns it to the stub. Later clients can reuse it until TTL expiry.", wire: "resolver → client · A 203.0.113.80 · RA=1", cache: "A 203.0.113.80", ttl: "TTL 299 s" }
      ],
      hit: [
        { from: 0, to: 1, event: "Recursive query", caption: "The client asks exactly as before; it does not know whether the resolver has a cached answer.", wire: "client → resolver · www.example.com A", cache: "A record present", ttl: "TTL 184 s" },
        { from: 1, to: 1, event: "Cache satisfies lookup", caption: "The resolver finds an unexpired record, so it does not contact root, TLD, or authoritative servers.", wire: "resolver cache lookup · hit", cache: "A 203.0.113.80", ttl: "TTL 184 s" },
        { from: 1, to: 0, event: "Cached answer returned", caption: "The remaining TTL is returned with the cached address, reducing latency and upstream traffic.", wire: "resolver → client · A 203.0.113.80 · TTL 184", cache: "A 203.0.113.80", ttl: "TTL 183 s" }
      ],
      alias: [
        { from: 0, to: 1, event: "Query alias", caption: "The client asks for an address for video.example.com.", wire: "client → resolver · video.example.com A", question: "video.example.com A", cache: "miss", ttl: "TTL —" },
        { from: 1, to: 4, event: "Ask authoritative server", caption: "Cached delegation lets the resolver contact the example.com authoritative server directly.", wire: "resolver → authoritative · video.example.com A", question: "video.example.com A", cache: "example.com NS cached", ttl: "TTL 42000 s" },
        { from: 4, to: 1, event: "CNAME returned", caption: "The name is an alias. The CNAME points to edge.cdn.example.net, but an address is still needed.", wire: "authoritative → resolver · CNAME edge.cdn.example.net", question: "video.example.com A", cache: "CNAME cached", ttl: "TTL 600 s" },
        { from: 1, to: 4, event: "Resolve canonical name", caption: "The resolver follows the chain and asks the relevant authoritative infrastructure for the canonical name’s address.", wire: "resolver → authority · edge.cdn.example.net A", question: "edge.cdn.example.net A", cache: "CNAME + delegation", ttl: "TTL running" },
        { from: 4, to: 1, event: "Address returned", caption: "The canonical name resolves to a CDN edge address. Both records can be cached with independent TTLs.", wire: "authority → resolver · A 198.51.100.42", question: "edge.cdn.example.net A", cache: "CNAME + A", ttl: "TTL 120 s" },
        { from: 1, to: 0, event: "Alias chain returned", caption: "The client receives the CNAME and final address, then connects to the selected CDN edge.", wire: "resolver → client · CNAME + A 198.51.100.42", question: "video.example.com A", cache: "chain cached", ttl: "min TTL 119 s" }
      ],
      failure: [
        { from: 0, to: 1, event: "Query missing name", caption: "The client asks for a name that is not present in the zone.", wire: "client → resolver · missing.example.com A", question: "missing.example.com A", cache: "miss", ttl: "TTL —", rcode: "NOERROR" },
        { from: 1, to: 4, event: "Ask authoritative server", caption: "The resolver follows cached delegation to the server that can authoritatively confirm existence.", wire: "resolver → authoritative · missing.example.com A", question: "missing.example.com A", cache: "example.com NS cached", ttl: "TTL 42000 s" },
        { from: 4, to: 1, event: "NXDOMAIN response", caption: "The authoritative server says the name does not exist and includes SOA information for negative caching.", wire: "authoritative → resolver · RCODE=NXDOMAIN · SOA", question: "missing.example.com A", cache: "negative answer", ttl: "negative TTL 300 s", rcode: "NXDOMAIN" },
        { from: 1, to: 0, event: "Failure returned", caption: "The resolver validates and caches the negative result, then returns NXDOMAIN to the client.", wire: "resolver → client · NXDOMAIN", question: "missing.example.com A", cache: "NXDOMAIN cached", ttl: "TTL 299 s", rcode: "NXDOMAIN" }
      ]
    };
    let scenario = "miss";
    let index = -1;
    let generation = 0;
    let playing = false;
    const speed = () => Number(qs("#dnsSpeed").value);
    const motionDuration = () => Math.max(900, Math.min(1700, Math.round(speed() * .5)));
    const moveMessage = (from, to, wire) => {
      const nodes = qsa("[data-dns-node]");
      nodes.forEach((node, position) => {
        node.classList.toggle("active", position === from || position === to);
        node.classList.toggle("sending", position === from);
        node.classList.toggle("receiving", position === to && from !== to);
      });
      const message = qs("#dnsMessage");
      message.classList.add("active");
      const kind = from === to ? "CACHE" : ((from === 0 && to === 1) || (from === 1 && to > 1) ? "QUERY" : "RESPONSE");
      message.dataset.kind = kind.toLowerCase();
      message.querySelector("b").textContent = kind;
      message.querySelector("span").textContent = wire.replace(/^[^·]+·?\s*/, "").slice(0, 46);
      const stage = qs(".dns-stage");
      const center = (node) => ({ x: node.offsetLeft + node.offsetWidth / 2, y: node.offsetTop + node.offsetHeight / 2 });
      const start = center(nodes[from]);
      const finish = center(nodes[to]);
      const dx = finish.x - start.x;
      const dy = finish.y - start.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const ux = dx / distance;
      const uy = dy / distance;
      const messageSupport = Math.abs(ux) * message.offsetWidth / 2 + Math.abs(uy) * message.offsetHeight / 2;
      const nodeSupport = (node) => Math.abs(ux) * node.offsetWidth / 2 + Math.abs(uy) * node.offsetHeight / 2;
      const clampPoint = (point) => ({
        x: Math.max(message.offsetWidth / 2 + 10, Math.min(stage.clientWidth - message.offsetWidth / 2 - 10, point.x)),
        y: Math.max(message.offsetHeight / 2 + 10, Math.min(stage.clientHeight - message.offsetHeight / 2 - 10, point.y))
      });
      let messageStart;
      let messageFinish;
      if (from === to) {
        const side = start.x < stage.clientWidth / 2 ? 1 : -1;
        messageStart = clampPoint({ x: start.x + side * (nodes[from].offsetWidth / 2 + message.offsetWidth / 2 + 14), y: start.y });
        messageFinish = messageStart;
      } else {
        const startClearance = nodeSupport(nodes[from]) + messageSupport + 9;
        const finishClearance = nodeSupport(nodes[to]) + messageSupport + 9;
        if (distance > startClearance + finishClearance) {
          messageStart = clampPoint({ x: start.x + ux * startClearance, y: start.y + uy * startClearance });
          messageFinish = clampPoint({ x: finish.x - ux * finishClearance, y: finish.y - uy * finishClearance });
        } else {
          const middle = { x: (start.x + finish.x) / 2, y: (start.y + finish.y) / 2 };
          const travel = Math.min(14, distance * .08);
          messageStart = clampPoint({ x: middle.x - ux * travel, y: middle.y - uy * travel });
          messageFinish = clampPoint({ x: middle.x + ux * travel, y: middle.y + uy * travel });
        }
      }
      const line = qs("#dnsFlightLine");
      const directPoints = [start, finish];
      let messagePoints = [messageStart, messageFinish];
      let linePoints = directPoints;
      if ((from === 1 && to === 4) || (from === 4 && to === 1)) {
        const detourY = stage.clientHeight - message.offsetHeight / 2 - 18;
        messagePoints = [messageStart, { x: messageStart.x, y: detourY }, { x: messageFinish.x, y: detourY }, messageFinish];
        linePoints = [start, messageStart, { x: messageStart.x, y: detourY }, { x: messageFinish.x, y: detourY }, messageFinish, finish];
      }
      const pathData = linePoints.map((point, position) => `${position ? "L" : "M"} ${point.x / stage.clientWidth * 1000} ${point.y / stage.clientHeight * 430}`).join(" ");
      line.setAttribute("d", pathData);
      line.dataset.kind = kind.toLowerCase();
      line.classList.remove("active");
      if (from !== to) { void line.getBoundingClientRect(); line.classList.add("active"); }
      message.getAnimations().forEach((animation) => animation.cancel());
      message.style.transition = "none";
      message.style.left = `${messageStart.x}px`;
      message.style.top = `${messageStart.y}px`;
      message.style.left = `${messageFinish.x}px`;
      message.style.top = `${messageFinish.y}px`;
      if (from !== to) {
        const segmentLengths = messagePoints.slice(1).map((point, position) => Math.hypot(point.x - messagePoints[position].x, point.y - messagePoints[position].y));
        const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0) || 1;
        let traversed = 0;
        const keyframes = messagePoints.map((point, position) => {
          if (position) traversed += segmentLengths[position - 1];
          return { left: `${point.x}px`, top: `${point.y}px`, offset: traversed / totalLength };
        });
        message.animate(keyframes, { duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : motionDuration(), easing: "cubic-bezier(.22,.72,.28,1)" });
      }
    };
    const reset = () => {
      generation += 1; playing = false; index = -1;
      qsa("[data-dns-scenario]").forEach((item) => item.setAttribute("aria-selected", String(item.dataset.dnsScenario === scenario)));
      qs("#dnsPlay").textContent = "▶ Auto play";
      qs("#dnsEvent").textContent = "Ready";
      qs("#dnsCounter").textContent = `Step 0 / ${scenarios[scenario].length}`;
      qs("#dnsQuestion").textContent = scenario === "alias" ? "video.example.com A" : scenario === "failure" ? "missing.example.com A" : "www.example.com A";
      qs("#dnsCache").textContent = scenario === "hit" ? "A record present" : "empty";
      qs("#dnsTtl").textContent = scenario === "hit" ? "TTL 184 s" : "TTL —";
      qs("#dnsRcode").textContent = "NOERROR";
      qs("#dnsCaption").textContent = "Start a lookup to see who asks whom and what each response means.";
      qs("#dnsWire").textContent = "wire: idle";
      qsa("[data-dns-node]").forEach((node) => node.classList.remove("active", "sending", "receiving"));
      qs("#dnsFlightLine").classList.remove("active");
      const message = qs("#dnsMessage");
      message.classList.remove("active");
      message.dataset.kind = "query";
      message.style.transition = "none";
      message.querySelector("b").textContent = "QUERY";
      message.querySelector("span").textContent = `${qs("#dnsQuestion").textContent.replace(" A", "")} · A`;
      requestAnimationFrame(() => {
        const client = qs('[data-dns-node="client"]');
        message.style.left = `${client.offsetLeft + client.offsetWidth / 2}px`;
        message.style.top = `${client.offsetTop + client.offsetHeight / 2}px`;
      });
    };
    const advance = () => {
      if (index >= scenarios[scenario].length - 1) return false;
      index += 1;
      const step = scenarios[scenario][index];
      qs("#dnsEvent").textContent = step.event;
      qs("#dnsCounter").textContent = `Step ${index + 1} / ${scenarios[scenario].length}`;
      qs("#dnsCaption").textContent = step.caption;
      qs("#dnsWire").textContent = `wire: ${step.wire}`;
      qs("#dnsQuestion").textContent = step.question || "www.example.com A";
      qs("#dnsCache").textContent = step.cache;
      qs("#dnsTtl").textContent = step.ttl;
      qs("#dnsRcode").textContent = step.rcode || "NOERROR";
      moveMessage(step.from, step.to, step.wire);
      return index < scenarios[scenario].length - 1;
    };
    const autoplay = async () => {
      if (playing) { playing = false; generation += 1; qs("#dnsPlay").textContent = "▶ Resume"; return; }
      if (index >= scenarios[scenario].length - 1) reset();
      playing = true; const current = ++generation; qs("#dnsPlay").textContent = "❚❚ Pause";
      while (playing && current === generation && advance()) await wait(speed());
      playing = false; qs("#dnsPlay").textContent = index >= scenarios[scenario].length - 1 ? "↺ Replay" : "▶ Resume";
    };
    qsa("[data-dns-scenario]").forEach((button) => button.addEventListener("click", () => {
      scenario = button.dataset.dnsScenario;
      qsa("[data-dns-scenario]").forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-selected", String(selected));
      });
      reset();
    }));
    qs("#dnsNext").addEventListener("click", () => { playing = false; generation += 1; qs("#dnsPlay").textContent = "▶ Auto play"; advance(); });
    qs("#dnsPlay").addEventListener("click", autoplay);
    qs("#dnsReset").addEventListener("click", reset);
    reset();
  }
})();
