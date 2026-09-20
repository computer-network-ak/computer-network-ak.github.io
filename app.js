(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  if (!document.querySelector('link[href^="visuals.css"]')) {
    const visualStyles = document.createElement("link");
    visualStyles.rel = "stylesheet";
    visualStyles.href = "visuals.css?v=33";
    document.head.appendChild(visualStyles);
  }

  if (!document.querySelector('script[src^="interactions.js"]')) {
    const interactionScript = document.createElement("script");
    interactionScript.src = "interactions.js?v=33";
    document.head.appendChild(interactionScript);
  }

  if (!document.querySelector('script[src^="critical-questions.js"]')) {
    const criticalScript = document.createElement("script");
    criticalScript.src = "critical-questions.js?v=33";
    document.head.appendChild(criticalScript);
  }

  function updateReadingProgress() {
    const total = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const percent = Math.min(100, Math.max(0, scrollY / total * 100));
    const bar = $("#progressBar");
    if (bar) bar.style.width = `${percent}%`;
    $("#backTop")?.classList.toggle("show", scrollY > 650);
  }

  addEventListener("scroll", updateReadingProgress, { passive: true });
  addEventListener("resize", updateReadingProgress);
  $("#backTop")?.addEventListener("click", () => scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
  updateReadingProgress();

  const chapterSections = $$(".chapter-section[id]");
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    $$(".toc a").forEach((link) => link.classList.toggle("current", link.getAttribute("href") === `#${visible.target.id}`));
  }, { rootMargin: "-25% 0px -55% 0px", threshold: [0.05, 0.3, 0.6] });
  chapterSections.forEach((section) => observer.observe(section));

  const search = $("#chapterSearch");
  let activeFilter = "all";
  function filterChapters() {
    if (!search) return;
    const query = search.value.trim().toLowerCase();
    let count = 0;
    $$(".chapter-card").forEach((card) => {
      const matchesText = `${card.textContent} ${card.dataset.tags || ""}`.toLowerCase().includes(query);
      const matchesFilter = activeFilter === "all" || (card.dataset.tags || "").includes(activeFilter);
      card.hidden = !(matchesText && matchesFilter);
      if (!card.hidden) count += 1;
    });
    $("#emptyState").hidden = count > 0;
  }
  search?.addEventListener("input", filterChapters);
  $$("[data-filter]").forEach((button) => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    $$("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
    filterChapters();
  }));

  $$(".formula-cards button").forEach((card) => {
    card.addEventListener("click", () => {
      $$(".formula-cards button").forEach((item) => item.classList.remove("active"));
      card.classList.add("active");
      $("#delayExplain").textContent = card.dataset.delay;
    });
  });

  if (!$("#protocolStage")) return;

  const lab = {
    mode: "stopwait",
    scenario: "clean",
    index: 0,
    playing: false,
    busy: false,
    generation: 0,
    animations: new Set(),
    steps: []
  };

  const scenarioOptions = {
    stopwait: [
      ["clean", "Normal delivery"],
      ["data-loss", "DATA packet lost"],
      ["ack-loss", "ACK lost → duplicate DATA"],
      ["corrupt", "DATA corrupted"]
    ],
    gbn: [
      ["clean", "Normal cumulative ACK"],
      ["data-loss", "DATA 1 lost"],
      ["ack-loss", "All cumulative ACKs lost"],
      ["final-ack-loss", "Only final ACK 4 lost"],
      ["corrupt", "DATA 1 corrupted"],
      ["reorder", "DATA 1 delayed / reordered"]
    ],
    sr: [
      ["clean", "Normal individual ACKs"],
      ["data-loss", "DATA 1 lost"],
      ["ack-loss", "ACK 2 lost"],
      ["corrupt", "DATA 1 corrupted"],
      ["reorder", "Out-of-order arrival"]
    ],
    flow: [
      ["clean", "Receiver keeps up"],
      ["slow", "Slow receiver / zero window"],
      ["update-loss", "Window update lost"],
      ["persist", "Zero window + persist probe"]
    ]
  };
  const scenarioByMode = { stopwait: "clean", gbn: "data-loss", sr: "data-loss", flow: "slow" };

  const modeCopy = {
    stopwait: {
      tag: "STOP-AND-WAIT ARQ",
      title: "One packet. One acknowledgment.",
      text: "The sender transmits one packet and waits for its ACK. A timer recovers from loss; sequence numbers prevent duplicate delivery.",
      rule: "Simple and reliable, but link utilization is poor when RTT is large."
    },
    gbn: {
      tag: "GO-BACK-N / CUMULATIVE ACK",
      title: "Pipeline a sender window.",
      text: "The sender may have N unacknowledged packets. The receiver accepts only the next in-order packet and cumulatively ACKs the next sequence number expected.",
      rule: "One timeout retransmits the missing packet and every later unacknowledged packet."
    },
    sr: {
      tag: "SELECTIVE REPEAT / INDIVIDUAL ACK",
      title: "Keep every useful arrival.",
      text: "The receiver buffers out-of-order packets and ACKs each packet separately. The sender keeps a timer for each outstanding packet.",
      rule: "Retransmit only the missing packet; sequence space must be at least twice the window size."
    },
    flow: {
      tag: "TCP FLOW CONTROL / RWND",
      title: "Match the receiver's free space.",
      text: "The receiver advertises available buffer space as rwnd. The sender limits outstanding data so a fast sender cannot overflow a slow receiver.",
      rule: "Flow control protects the receiver; congestion control protects the network."
    }
  };

  const speed = () => Number($("#speedLab").value || 1);
  const duration = (ms) => Math.max(120, ms * speed());
  const setStates = (sender, channel, receiver, senderCaption, receiverCaption) => {
    $("#senderState").textContent = sender;
    $("#channelState").textContent = channel;
    $("#receiverState").textContent = receiver;
    if (senderCaption) $("#senderCaption").textContent = senderCaption;
    if (receiverCaption) $("#receiverCaption").textContent = receiverCaption;
  };

  function setSlots(id, states = {}) {
    $$(`#${id} i`).forEach((slot) => {
      slot.className = states[slot.dataset.slot] || "";
    });
  }

  function cancelMotion() {
    lab.generation += 1;
    lab.animations.forEach((animation) => animation.cancel());
    lab.animations.clear();
    $("#packetLayer").replaceChildren();
    $("#lossBurst").classList.remove("show");
    $("#timerGauge").classList.remove("running", "expired");
    const fill = $("#timerGauge i");
    fill.getAnimations().forEach((animation) => animation.cancel());
    fill.style.transform = "scaleX(0)";
  }

  async function trackedAnimation(element, keyframes, options, generation = lab.generation) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) options.duration = 1;
    const animation = element.animate(keyframes, options);
    lab.animations.add(animation);
    try { await animation.finished; } catch (_) { return false; }
    lab.animations.delete(animation);
    return generation === lab.generation;
  }

  async function animatePacket({ direction = "forward", label, type = "data", lost = false, row = 0 }) {
    const layer = $("#packetLayer");
    const fromNode = direction === "forward" ? $(".sender-node") : $(".receiver-node");
    const toNode = direction === "forward" ? $(".receiver-node") : $(".sender-node");
    const layerRect = layer.getBoundingClientRect();
    const fromRect = fromNode.getBoundingClientRect();
    const toRect = toNode.getBoundingClientRect();
    const packet = document.createElement("div");
    packet.className = `flying-packet ${type}`;
    packet.textContent = label;
    packet.setAttribute("aria-hidden", "true");
    layer.append(packet);

    const packetWidth = type === "ack" ? 66 : 74;
    const startX = fromRect.left + fromRect.width / 2 - layerRect.left - packetWidth / 2;
    const endX = toRect.left + toRect.width / 2 - layerRect.left - packetWidth / 2;
    const baseY = Math.max(88, Math.min(layerRect.height - 155, layerRect.height * 0.38 + row * 34));
    packet.style.left = `${startX}px`;
    packet.style.top = `${baseY}px`;
    const travel = endX - startX;
    const target = lost ? travel * 0.53 : travel;
    const generation = lab.generation;
    const completed = await trackedAnimation(packet, [
      { transform: "translateX(0) scale(.9)", opacity: 0 },
      { transform: `translateX(${target * .08}px) scale(1)`, opacity: 1, offset: .1 },
      { transform: `translateX(${target}px) scale(1)`, opacity: 1 }
    ], { duration: duration(lost ? 760 : 1050), easing: "cubic-bezier(.2,.72,.25,1)", fill: "forwards" }, generation);
    if (!completed) { packet.remove(); return; }

    if (lost) {
      const burst = $("#lossBurst");
      burst.style.left = `${startX + target + packetWidth / 2}px`;
      burst.style.top = `${baseY - 24}px`;
      burst.classList.add("show");
      await trackedAnimation(packet, [
        { transform: `translateX(${target}px) rotate(0) scale(1)`, opacity: 1 },
        { transform: `translateX(${target + (direction === "forward" ? 18 : -18)}px) rotate(18deg) scale(.45)`, opacity: 0 }
      ], { duration: duration(360), easing: "ease-in", fill: "forwards" }, generation);
      await wait(duration(180));
      burst.classList.remove("show");
    } else {
      await trackedAnimation(packet, [
        { transform: `translateX(${travel}px) scale(1)`, opacity: 1 },
        { transform: `translateX(${travel}px) scale(.85)`, opacity: 0 }
      ], { duration: duration(220), easing: "ease-out", fill: "forwards" }, generation);
    }
    packet.remove();
  }

  async function runTimer(label = "BASE TIMER") {
    const gauge = $("#timerGauge");
    const fill = $("#timerGauge i");
    gauge.querySelector("span").textContent = label;
    gauge.classList.add("running");
    const generation = lab.generation;
    await trackedAnimation(fill, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
      duration: duration(1250), easing: "linear", fill: "forwards"
    }, generation);
    if (generation !== lab.generation) return;
    gauge.classList.remove("running");
    gauge.classList.add("expired");
    await wait(duration(250));
  }

  const step = (title, caption, states, action, visual = {}) => ({ title, caption, states, action, visual });

  function stopWaitSteps(scenario) {
    const steps = [step("Send DATA 0", "The sender starts its timer and blocks until ACK 1 arrives.", ["WAITING / SEQ 0", "DATA 0 →", "EXPECT 0", "timer running · seq 0", "expects 0"], () => animatePacket({ label: "DATA 0", lost: scenario === "data-loss", type: scenario === "corrupt" ? "corrupt" : "data" }), { sender: { 0: "active" } })];
    if (scenario === "data-loss" || scenario === "corrupt") {
      const corrupt = scenario === "corrupt";
      steps.push(
        step(corrupt ? "Checksum rejects DATA 0" : "DATA 0 is lost", corrupt ? "The frame arrives, but its checksum fails. The receiver discards it and keeps expecting sequence 0." : "No ACK can return because the receiver never saw the packet.", ["WAITING / SEQ 0", corrupt ? "CORRUPT" : "LOSS", "EXPECT 0", "waiting for ACK 1", "still expects 0"], null, { sender: { 0: "lost" } }),
        step("Timer expires", "Silence is ambiguous: the sender only knows that a valid ACK did not arrive.", ["TIMEOUT / SEQ 0", "IDLE", "EXPECT 0", "timeout · seq 0", "still expects 0"], () => runTimer("SEQ 0 TIMER"), { sender: { 0: "lost" } }),
        step("Retransmit DATA 0", "The same sequence number identifies the data that is still unresolved.", ["RETRANSMIT 0", "DATA 0 →", "EXPECT 0", "retransmitting seq 0", "expects 0"], () => animatePacket({ label: "DATA 0", type: "retry" }), { sender: { 0: "active" } })
      );
    }
    if (scenario === "ack-loss") {
      steps.push(
        step("Receiver accepts DATA 0", "The receiver delivers DATA 0 once, advances to sequence 1, and creates ACK 1.", ["WAITING / ACK 1", "DELIVERED", "EXPECT 1", "timer running · seq 0", "delivered 0 · expects 1"], null, { sender: { 0: "sent" }, receiver: { 0: "delivered" } }),
        step("ACK 1 is lost", "The receiver has advanced, but the sender still has no evidence that DATA 0 arrived.", ["WAITING / SEQ 0", "ACK LOSS", "EXPECT 1", "waiting for ACK 1", "already delivered 0"], () => animatePacket({ direction: "back", label: "ACK 1", type: "ack", lost: true }), { sender: { 0: "sent" }, receiver: { 0: "delivered" } }),
        step("Timer expires", "The sender retransmits because DATA loss and ACK loss are indistinguishable from silence.", ["TIMEOUT / SEQ 0", "IDLE", "EXPECT 1", "timeout · seq 0", "expects 1"], () => runTimer("SEQ 0 TIMER"), { sender: { 0: "lost" }, receiver: { 0: "delivered" } }),
        step("Duplicate DATA 0 arrives", "Sequence 0 is older than the expected value. The receiver discards the duplicate instead of delivering it twice.", ["RETRANSMIT 0", "DUPLICATE", "EXPECT 1", "retrying seq 0", "discard duplicate 0"], () => animatePacket({ label: "DATA 0", type: "retry" }), { sender: { 0: "active" }, receiver: { 0: "delivered" } }),
        step("Receiver repeats ACK 1", "Repeating the last ACK lets the sender finish even though the first acknowledgment disappeared.", ["ACK 1 RECEIVED", "ACK 1 ←", "EXPECT 1", "advance to seq 1", "expects 1"], () => animatePacket({ direction: "back", label: "ACK 1", type: "ack" }), { sender: { 0: "acked", 1: "next" }, receiver: { 0: "delivered" } })
      );
      return steps;
    }
    steps.push(
      step("Receiver accepts DATA 0", "The receiver delivers the data once and now expects sequence 1.", ["WAITING / ACK 1", "DELIVERED", "EXPECT 1", "waiting for ACK 1", "delivered 0 · expects 1"], null, { sender: { 0: "sent" }, receiver: { 0: "delivered" } }),
      step("ACK 1 returns", "ACK 1 means every packet before sequence 1 has arrived.", ["ACK 1 RECEIVED", "ACK 1 ←", "EXPECT 1", "advance to seq 1", "expects 1"], () => animatePacket({ direction: "back", label: "ACK 1", type: "ack" }), { sender: { 0: "acked", 1: "next" }, receiver: { 0: "delivered" } })
    );
    return steps;
  }

  function gbnSteps(scenario) {
    const issue = scenario === "data-loss" || scenario === "corrupt";
    const startPackets = scenario === "reorder" ? [0, 2, 3] : [0, 1, 2, 3];
    const steps = [step("Pipeline DATA 0–3", "The sender fills its four-packet window without waiting between packets.", ["BASE 0 / NEXT 4", "PIPELINE →", "EXPECT 0", "base 0 · next 4", "expects 0"], () => Promise.all(startPackets.map((n) => animatePacket({ label: `DATA ${n}`, row: n - 1, lost: scenario === "data-loss" && n === 1, type: scenario === "corrupt" && n === 1 ? "corrupt" : "data" }))), { sender: { 0: "sent", 1: issue ? "lost" : "sent", 2: "sent", 3: "sent" } })];
    if (issue) {
      const corrupt = scenario === "corrupt";
      steps.push(
        step(corrupt ? "DATA 1 fails checksum" : "DATA 1 is missing", corrupt ? "The receiver discards corrupted DATA 1. DATA 2 and 3 are now out of order." : "The receiver accepts DATA 0, but the loss leaves sequence 1 as the first gap.", ["BASE 0 / NEXT 4", corrupt ? "1 CORRUPT" : "1 LOST", "EXPECT 1", "four packets outstanding", "delivered 0 · expects 1"], null, { sender: { 0: "sent", 1: "lost", 2: "sent", 3: "sent" }, receiver: { 0: "delivered" } }),
        step("DATA 2 and 3 are discarded", "A Go-Back-N receiver keeps only the next in-order packet. Each later arrival repeats cumulative ACK 1.", ["DUP ACK 1", "ACK 1 ←", "EXPECT 1", "base becomes 1", "discard 2,3 · expects 1"], () => Promise.all([animatePacket({ direction: "back", label: "ACK 1", type: "ack", row: -1 }), animatePacket({ direction: "back", label: "ACK 1", type: "ack", row: 1 })]), { sender: { 0: "acked", 1: "lost", 2: "sent", 3: "sent" }, receiver: { 0: "delivered" } }),
        step("Base timer expires", "GBN keeps one timer for the oldest unacknowledged packet: DATA 1.", ["TIMEOUT / BASE 1", "IDLE", "EXPECT 1", "timeout at base 1", "expects 1"], () => runTimer("BASE 1 TIMER"), { sender: { 0: "acked", 1: "lost", 2: "sent", 3: "sent" }, receiver: { 0: "delivered" } }),
        step("Go back to DATA 1", "The sender retransmits DATA 1, 2 and 3, including packets that crossed the channel earlier.", ["RETX 1–3", "PIPELINE →", "EXPECT 1", "retransmit from base", "expects 1"], () => Promise.all([1, 2, 3].map((n) => animatePacket({ label: `DATA ${n}`, type: "retry", row: n - 2 }))), { sender: { 0: "acked", 1: "active", 2: "active", 3: "active" }, receiver: { 0: "delivered" } }),
        step("Cumulative ACK 4", "After the retransmitted run arrives in order, one ACK advances the sender beyond all four packets.", ["BASE 4 / WINDOW OPEN", "ACK 4 ←", "EXPECT 4", "window slides to 4", "delivered 0–3"], () => animatePacket({ direction: "back", label: "ACK 4", type: "ack" }), { sender: { 0: "acked", 1: "acked", 2: "acked", 3: "acked" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } })
      );
      return steps;
    }
    if (scenario === "ack-loss") {
      steps.push(
        step("Receiver accepts DATA 0–3", "The receiver delivers the in-order run and emits cumulative ACK 1, ACK 2, ACK 3, and ACK 4 as its next expected sequence advances.", ["BASE 0 / NEXT 4", "DELIVERED", "EXPECT 4", "all four outstanding", "delivered 0–3"], null, { sender: { 0: "sent", 1: "sent", 2: "sent", 3: "sent" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } }),
        step("ACK path outage", "Every cumulative ACK is lost on the reverse path. The receiver is complete, but the sender has no evidence and its base remains 0.", ["BASE 0 / NEXT 4", "ACKS 1–4 LOST", "EXPECT 4", "base remains 0", "already delivered 0–3"], () => Promise.all([1, 2, 3, 4].map((n, i) => animatePacket({ direction: "back", label: `ACK ${n}`, type: "ack", lost: true, row: i - 1.5 }))), { sender: { 0: "sent", 1: "sent", 2: "sent", 3: "sent" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } }),
        step("Base timer expires", "Because no cumulative ACK advanced the window, the timer for the oldest unacknowledged packet DATA 0 expires.", ["TIMEOUT / BASE 0", "IDLE", "EXPECT 4", "timeout at base 0", "expects 4"], () => runTimer("BASE 0 TIMER"), { sender: { 0: "lost", 1: "sent", 2: "sent", 3: "sent" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } }),
        step("Retransmit DATA 0–3", "Go-Back-N repeats the whole unresolved window. The receiver recognizes every packet as a duplicate.", ["RETX 0–3", "DUPLICATES →", "EXPECT 4", "retransmit from base", "discard duplicates"], () => Promise.all([0, 1, 2, 3].map((n) => animatePacket({ label: `DATA ${n}`, type: "retry", row: n - 1 }))), { sender: { 0: "active", 1: "active", 2: "active", 3: "active" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } }),
        step("ACK path recovers", "The receiver repeats ACK 4 after the duplicate run. Duplicate suppression preserves one delivery while the cumulative ACK repairs sender state.", ["BASE 4 / WINDOW OPEN", "ACK 4 ←", "EXPECT 4", "window slides to 4", "expects 4"], () => animatePacket({ direction: "back", label: "ACK 4", type: "ack" }), { sender: { 0: "acked", 1: "acked", 2: "acked", 3: "acked" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } })
      );
      return steps;
    }
    if (scenario === "final-ack-loss") {
      steps.push(
        step("Receiver sends cumulative ACKs", "DATA 0–3 arrive in order. ACK 1, ACK 2, ACK 3, and ACK 4 report the advancing next expected sequence.", ["BASE 0 / NEXT 4", "ACKS 1–4 ←", "EXPECT 4", "ACKs returning", "delivered 0–3"], null, { sender: { 0: "sent", 1: "sent", 2: "sent", 3: "sent" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } }),
        step("Only ACK 4 is lost", "ACK 1–3 reach the sender and move its base to DATA 3. The final ACK disappears, so only DATA 3 remains unacknowledged.", ["BASE 3 / NEXT 4", "ACK 4 LOST", "EXPECT 4", "only DATA 3 outstanding", "already delivered 0–3"], () => Promise.all([1, 2, 3, 4].map((n, i) => animatePacket({ direction: "back", label: `ACK ${n}`, type: "ack", lost: n === 4, row: i - 1.5 }))), { sender: { 0: "acked", 1: "acked", 2: "acked", 3: "lost" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } }),
        step("Base 3 timer expires", "Go-Back-N times the oldest unacknowledged packet. Earlier ACKs narrowed the unresolved suffix to one packet.", ["TIMEOUT / BASE 3", "IDLE", "EXPECT 4", "timeout at base 3", "expects 4"], () => runTimer("BASE 3 TIMER"), { sender: { 0: "acked", 1: "acked", 2: "acked", 3: "lost" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } }),
        step("Retransmit only DATA 3", "The retransmission begins at base 3 and stops at nextseqnum 4. The receiver discards this duplicate payload.", ["RETX DATA 3", "DUPLICATE →", "EXPECT 4", "retry DATA 3", "discard duplicate 3"], () => animatePacket({ label: "DATA 3", type: "retry" }), { sender: { 0: "acked", 1: "acked", 2: "acked", 3: "active" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } }),
        step("Receiver repeats ACK 4", "The repeated cumulative ACK confirms every sequence below 4 and opens the sender's next window.", ["BASE 4 / WINDOW OPEN", "ACK 4 ←", "EXPECT 4", "window slides to 4", "expects 4"], () => animatePacket({ direction: "back", label: "ACK 4", type: "ack" }), { sender: { 0: "acked", 1: "acked", 2: "acked", 3: "acked" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } })
      );
      return steps;
    }
    if (scenario === "reorder") {
      steps.push(
        step("DATA 0 arrives; DATA 1 is delayed", "DATA 2 and 3 reach the receiver first, but GBN refuses to buffer them while sequence 1 is missing.", ["BASE 0 / NEXT 4", "REORDERED", "EXPECT 1", "packets 0–3 outstanding", "discard 2,3"], () => Promise.all([animatePacket({ direction: "back", label: "ACK 1", type: "ack", row: -1 }), animatePacket({ direction: "back", label: "ACK 1", type: "ack", row: 1 })]), { sender: { 0: "acked", 1: "sent", 2: "sent", 3: "sent" }, receiver: { 0: "delivered" } }),
        step("Delayed DATA 1 arrives", "The receiver can now deliver DATA 1, but the earlier copies of 2 and 3 were already discarded.", ["BASE 1 / NEXT 4", "DATA 1 →", "EXPECT 2", "base can reach 2", "delivered 0,1"], () => animatePacket({ label: "DATA 1" }), { sender: { 0: "acked", 1: "sent", 2: "sent", 3: "sent" }, receiver: { 0: "delivered", 1: "delivered" } }),
        step("Base 2 timer expires", "Reordering forced a timeout because GBN discarded the useful early arrivals of DATA 2 and 3.", ["TIMEOUT / BASE 2", "IDLE", "EXPECT 2", "timeout at base 2", "expects 2"], () => runTimer("BASE 2 TIMER"), { sender: { 0: "acked", 1: "acked", 2: "lost", 3: "sent" }, receiver: { 0: "delivered", 1: "delivered" } }),
        step("Retransmit DATA 2 and 3", "The remaining suffix is sent again and can now be accepted in order.", ["RETX 2–3", "PIPELINE →", "EXPECT 2", "retransmit from base 2", "expects 2"], () => Promise.all([2, 3].map((n, i) => animatePacket({ label: `DATA ${n}`, type: "retry", row: i - .5 }))), { sender: { 0: "acked", 1: "acked", 2: "active", 3: "active" }, receiver: { 0: "delivered", 1: "delivered" } }),
        step("Cumulative ACK 4", "The sender finally advances after the retransmitted suffix closes the in-order run.", ["BASE 4 / WINDOW OPEN", "ACK 4 ←", "EXPECT 4", "window slides to 4", "delivered 0–3"], () => animatePacket({ direction: "back", label: "ACK 4", type: "ack" }), { sender: { 0: "acked", 1: "acked", 2: "acked", 3: "acked" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } })
      );
      return steps;
    }
    steps.push(
      step("Receiver accepts the run", "Each in-order arrival advances the expected sequence number from 0 to 4.", ["BASE 0 / NEXT 4", "DELIVERED", "EXPECT 4", "waiting for cumulative ACK", "delivered 0–3"], null, { sender: { 0: "sent", 1: "sent", 2: "sent", 3: "sent" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } }),
      step("Cumulative ACK 4", "One ACK advances the sender base past all four packets and opens a new window.", ["BASE 4 / WINDOW OPEN", "ACK 4 ←", "EXPECT 4", "window slides to 4", "expects 4"], () => animatePacket({ direction: "back", label: "ACK 4", type: "ack" }), { sender: { 0: "acked", 1: "acked", 2: "acked", 3: "acked" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } })
    );
    return steps;
  }

  function srSteps(scenario) {
    const issue = scenario === "data-loss" || scenario === "corrupt";
    const startPackets = scenario === "reorder" ? [0, 2, 3] : [0, 1, 2, 3];
    const steps = [step("Pipeline DATA 0–3", "Selective Repeat pipelines packets and tracks each one independently.", ["WINDOW 0–3", "PIPELINE →", "EXPECT 0", "timers 0,1,2,3", "window 0–3"], () => Promise.all(startPackets.map((n) => animatePacket({ label: `DATA ${n}`, row: n - 1, lost: scenario === "data-loss" && n === 1, type: scenario === "corrupt" && n === 1 ? "corrupt" : "data" }))), { sender: { 0: "sent", 1: issue ? "lost" : "sent", 2: "sent", 3: "sent" } })];
    if (issue) {
      const corrupt = scenario === "corrupt";
      steps.push(
        step(corrupt ? "DATA 1 fails checksum" : "DATA 1 is missing", "The receiver retains useful DATA 2 and 3 while sequence 1 remains unresolved.", ["ACKS 0,2,3", corrupt ? "1 CORRUPT" : "1 LOST", "EXPECT 1", "only packet 1 missing", "buffer 2,3"], null, { sender: { 0: "acked", 1: "lost", 2: "acked", 3: "acked" }, receiver: { 0: "delivered", 2: "buffered", 3: "buffered" } }),
        step("Individual ACKs return", "ACK 0, ACK 2 and ACK 3 tell the sender exactly which transmissions succeeded.", ["ONLY 1 OUTSTANDING", "ACKS ←", "EXPECT 1", "timer 1 still running", "buffer 2,3"], () => Promise.all([0, 2, 3].map((n, i) => animatePacket({ direction: "back", label: `ACK ${n}`, type: "ack", row: i - 1 }))), { sender: { 0: "acked", 1: "lost", 2: "acked", 3: "acked" }, receiver: { 0: "delivered", 2: "buffered", 3: "buffered" } }),
        step("Timer 1 expires", "Only DATA 1 has an unresolved timer.", ["TIMEOUT / DATA 1", "IDLE", "EXPECT 1", "timeout for packet 1", "buffer 2,3"], () => runTimer("DATA 1 TIMER"), { sender: { 0: "acked", 1: "lost", 2: "acked", 3: "acked" }, receiver: { 0: "delivered", 2: "buffered", 3: "buffered" } }),
        step("Retransmit only DATA 1", "Selective Repeat avoids resending packets 2 and 3.", ["RETX DATA 1", "DATA 1 →", "EXPECT 1", "retransmit packet 1", "buffer 2,3"], () => animatePacket({ label: "DATA 1", type: "retry" }), { sender: { 0: "acked", 1: "active", 2: "acked", 3: "acked" }, receiver: { 0: "delivered", 2: "buffered", 3: "buffered" } }),
        step("Release the buffered run", "With the gap filled, the receiver delivers 1, 2 and 3 in order and ACKs DATA 1.", ["ALL ACKNOWLEDGED", "ACK 1 ←", "EXPECT 4", "window can advance", "delivered 0–3"], () => animatePacket({ direction: "back", label: "ACK 1", type: "ack" }), { sender: { 0: "acked", 1: "acked", 2: "acked", 3: "acked" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } })
      );
      return steps;
    }
    if (scenario === "ack-loss") {
      steps.push(
        step("ACK 2 is lost", "ACK 0, ACK 1 and ACK 3 arrive, but the sender still considers DATA 2 outstanding.", ["ONLY 2 OUTSTANDING", "ACK 2 LOST", "EXPECT 4", "timer 2 running", "delivered 0–3"], () => Promise.all([0, 1, 2, 3].map((n, i) => animatePacket({ direction: "back", label: `ACK ${n}`, type: "ack", row: i - 1.5, lost: n === 2 }))), { sender: { 0: "acked", 1: "acked", 2: "lost", 3: "acked" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } }),
        step("Timer 2 expires", "Per-packet state isolates recovery to the one acknowledgment that never arrived.", ["TIMEOUT / DATA 2", "IDLE", "EXPECT 4", "timeout for packet 2", "expects 4"], () => runTimer("DATA 2 TIMER"), { sender: { 0: "acked", 1: "acked", 2: "lost", 3: "acked" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } }),
        step("Retransmit only DATA 2", "The receiver detects a duplicate sequence number, does not deliver the payload again, and repeats ACK 2.", ["RETX DATA 2", "DUPLICATE", "EXPECT 4", "retry packet 2", "discard duplicate 2"], () => animatePacket({ label: "DATA 2", type: "retry" }), { sender: { 0: "acked", 1: "acked", 2: "active", 3: "acked" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } }),
        step("Repeated ACK 2 arrives", "The final independent acknowledgment clears packet 2 and lets the sender window advance.", ["WINDOW 4–7", "ACK 2 ←", "EXPECT 4", "window starts at 4", "expects 4"], () => animatePacket({ direction: "back", label: "ACK 2", type: "ack" }), { sender: { 0: "acked", 1: "acked", 2: "acked", 3: "acked" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } })
      );
      return steps;
    }
    if (scenario === "reorder") {
      steps.push(
        step("DATA 2 and 3 arrive early", "Selective Repeat accepts and buffers packets inside the receive window even while DATA 1 is delayed.", ["ACKS 0,2,3", "REORDERED", "EXPECT 1", "packet 1 unresolved", "buffer 2,3"], () => Promise.all([0, 2, 3].map((n, i) => animatePacket({ direction: "back", label: `ACK ${n}`, type: "ack", row: i - 1 }))), { sender: { 0: "acked", 1: "sent", 2: "acked", 3: "acked" }, receiver: { 0: "delivered", 2: "buffered", 3: "buffered" } }),
        step("Delayed DATA 1 arrives", "DATA 1 closes the only gap; no retransmission is needed because reordering is not loss.", ["ALL RECEIVED", "DATA 1 →", "EXPECT 4", "all packets acknowledged", "release 1,2,3"], () => animatePacket({ label: "DATA 1" }), { sender: { 0: "acked", 1: "sent", 2: "acked", 3: "acked" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } }),
        step("ACK 1 completes the window", "The sender now has individual evidence for every packet and advances to the next window.", ["WINDOW 4–7", "ACK 1 ←", "EXPECT 4", "window starts at 4", "expects 4"], () => animatePacket({ direction: "back", label: "ACK 1", type: "ack" }), { sender: { 0: "acked", 1: "acked", 2: "acked", 3: "acked" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } })
      );
      return steps;
    }
    steps.push(
      step("Receiver ACKs individually", "Every packet has its own acknowledgment and may complete independently.", ["ACKS 0–3", "ACKS ←", "EXPECT 4", "four ACKs arriving", "delivered 0–3"], () => Promise.all([0, 1, 2, 3].map((n, i) => animatePacket({ direction: "back", label: `ACK ${n}`, type: "ack", row: i - 1.5 }))), { sender: { 0: "sent", 1: "sent", 2: "sent", 3: "sent" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } }),
      step("Window advances", "The lowest outstanding sequence moves beyond 3.", ["WINDOW 4–7", "IDLE", "EXPECT 4", "window starts at 4", "expects 4"], null, { sender: { 0: "acked", 1: "acked", 2: "acked", 3: "acked" }, receiver: { 0: "delivered", 1: "delivered", 2: "delivered", 3: "delivered" } })
    );
    return steps;
  }

  function flowSteps(scenario) {
    if (scenario === "clean") return [
      step("Receiver advertises rwnd = 3", "Three free slots define how much new data the sender may place in flight.", ["CAN SEND 3", "WINDOW OPEN", "RWND 3", "usable window = 3", "3 free slots"], () => animatePacket({ direction: "back", label: "rwnd 3", type: "window" }), { sender: { 0: "next", 1: "next", 2: "next" } }),
      step("Sender transmits within rwnd", "The sender uses only the advertised capacity, even if its congestion window would permit more.", ["3 DATA UNITS SENT", "DATA →", "RWND 3", "three teaching units in flight", "application draining"], () => Promise.all([0, 1, 2].map((n) => animatePacket({ label: `DATA ${n}`, row: n - 1 }))), { sender: { 0: "sent", 1: "sent", 2: "sent" }, receiver: { 0: "buffered", 1: "buffered", 2: "buffered" } }),
      step("Application keeps draining", "Because the receiving process reads promptly, the available window remains open.", ["WINDOW OPEN", "APP READS", "RWND 3", "ready for more data", "3 free slots"], null, { sender: { 0: "acked", 1: "acked", 2: "acked", 3: "next" } }),
      step("Fresh window update", "The receiver confirms available space, so the sender can continue without a zero-window pause.", ["CAN CONTINUE", "rwnd 3 ←", "BUFFER SAFE", "usable window = 3", "no overflow"], () => animatePacket({ direction: "back", label: "rwnd 3", type: "window" }), { sender: { 0: "acked", 1: "acked", 2: "acked", 3: "next" } })
    ];
    const steps = [
      step("Receiver advertises rwnd = 3", "Three free buffer slots define how much new data the sender may place in flight.", ["CAN SEND 3", "WINDOW OPEN", "RWND 3", "usable window = 3", "3 free slots"], () => animatePacket({ direction: "back", label: "rwnd 3", type: "window" }), { sender: { 0: "next", 1: "next", 2: "next" } }),
      step("Sender fills the window", "A slow application leaves three segments in the receive buffer.", ["3 SEGMENTS IN FLIGHT", "DATA →", "RWND 0", "window fully used", "buffer full"], () => Promise.all([0, 1, 2].map((n) => animatePacket({ label: `DATA ${n}`, row: n - 1 }))), { sender: { 0: "sent", 1: "sent", 2: "sent" }, receiver: { 0: "buffered", 1: "buffered", 2: "buffered", 3: "blocked" } }),
      step("Zero window pauses the sender", "rwnd = 0 is explicit backpressure. Sending ordinary data now would overflow the receiver.", ["PAUSED", "rwnd 0 ←", "BUFFER FULL", "wait for window update", "application must read"], () => animatePacket({ direction: "back", label: "rwnd 0", type: "window" }), { sender: { 0: "sent", 1: "sent", 2: "sent", 3: "blocked" }, receiver: { 0: "buffered", 1: "buffered", 2: "buffered", 3: "blocked" } })
    ];
    if (scenario === "persist") {
      steps.push(
        step("Persist timer probes", "The sender periodically probes a zero window so a lost future update cannot deadlock the connection.", ["PERSIST PROBE", "1 BYTE →", "RWND 0", "persist timer active", "still full"], () => animatePacket({ label: "PROBE", type: "retry" }), { sender: { 0: "sent", 1: "sent", 2: "sent", 3: "blocked" }, receiver: { 0: "buffered", 1: "buffered", 2: "buffered", 3: "blocked" } }),
        step("Receiver repeats rwnd = 0", "The first probe finds no free space. The sender remains paused and schedules another probe.", ["PAUSED", "rwnd 0 ←", "BUFFER FULL", "back off persist timer", "still full"], () => animatePacket({ direction: "back", label: "rwnd 0", type: "window" }), { sender: { 0: "sent", 1: "sent", 2: "sent", 3: "blocked" }, receiver: { 0: "buffered", 1: "buffered", 2: "buffered", 3: "blocked" } }),
        step("Application drains two slots", "The receiving process finally creates free space, but the sender has not yet learned this.", ["STILL PAUSED", "APP READS", "RWND 2", "await probe or update", "2 free slots"], () => wait(duration(850)), { sender: { 0: "acked", 1: "acked", 2: "sent", 3: "blocked" }, receiver: { 2: "buffered" } }),
        step("Next probe reveals rwnd = 2", "The receiver's probe response repairs the state even if an ordinary window update was missed.", ["CAN SEND 2", "rwnd 2 ←", "RWND 2", "persist timer stops", "2 free slots"], () => animatePacket({ direction: "back", label: "rwnd 2", type: "window" }), { sender: { 2: "sent", 3: "next" }, receiver: { 2: "buffered" } })
      );
    } else {
      steps.push(step("Application drains two slots", "The receiving process creates two free slots and prepares a window update.", ["STILL PAUSED", "APP READS", "RWND 2", "await window update", "2 free slots"], () => wait(duration(850)), { sender: { 0: "acked", 1: "acked", 2: "sent", 3: "blocked" }, receiver: { 2: "buffered" } }));
      if (scenario === "update-loss") {
        steps.push(
          step("Window update is lost", "The receiver has space, but the rwnd = 2 advertisement disappears. Without a recovery rule, both sides could wait forever.", ["STILL PAUSED", "UPDATE LOST", "RWND 2", "sender still knows rwnd 0", "2 free slots"], () => animatePacket({ direction: "back", label: "rwnd 2", type: "window", lost: true }), { sender: { 0: "acked", 1: "acked", 2: "sent", 3: "blocked" }, receiver: { 2: "buffered" } }),
          step("Persist probe breaks the stalemate", "A small probe elicits the current window, preventing deadlock after a lost update.", ["PERSIST PROBE", "1 BYTE →", "RWND 2", "probe outstanding", "2 free slots"], () => animatePacket({ label: "PROBE", type: "retry" }), { sender: { 2: "sent", 3: "blocked" }, receiver: { 2: "buffered" } })
        );
      }
      steps.push(step("Window update resumes transfer", "rwnd = 2 permits two more segments. The sender still obeys receiver capacity.", ["CAN SEND 2", "rwnd 2 ←", "RWND 2", "usable window = 2", "2 free slots"], () => animatePacket({ direction: "back", label: "rwnd 2", type: "window" }), { sender: { 2: "sent", 3: "next" }, receiver: { 2: "buffered" } }));
    }
    steps.push(step("Sender transmits safely", "Flow control matches outstanding data to receiver capacity.", ["2 SEGMENTS SENT", "DATA →", "BUFFER SAFE", "obeying rwnd", "no overflow"], () => Promise.all([3, 4].map((n, i) => animatePacket({ label: `DATA ${n}`, row: i - .5 }))), { sender: { 0: "acked", 1: "acked", 2: "sent", 3: "sent" }, receiver: { 2: "buffered", 3: "buffered" } }));
    return steps;
  }

  function makeSteps() {
    if (lab.mode === "stopwait") return stopWaitSteps(lab.scenario);
    if (lab.mode === "gbn") return gbnSteps(lab.scenario);
    if (lab.mode === "sr") return srSteps(lab.scenario);
    return flowSteps(lab.scenario);
  }

  function addLog(title, caption, number = lab.index) {
    $$("#eventLog li").forEach((item) => item.classList.remove("active"));
    const item = document.createElement("li");
    item.className = "active";
    item.innerHTML = `<time>${String(number).padStart(2, "0")}</time><span><b>${title}.</b> ${caption}</span>`;
    const log = $("#eventLog");
    log.append(item);
    log.scrollTop = log.scrollHeight;
  }

  const scenarioLabel = () => scenarioOptions[lab.mode].find(([value]) => value === lab.scenario)?.[1] || "Normal delivery";

  function resetLab({ keepLog = false } = {}) {
    lab.playing = false;
    lab.busy = false;
    lab.index = 0;
    cancelMotion();
    lab.steps = makeSteps();
    $("#playLab").textContent = "▶ Auto play";
    $("#stepCounter").textContent = `STEP 0 / ${lab.steps.length}`;
    $("#stepTitle").textContent = "Sender is ready";
    $("#stageCaption").textContent = "Press Auto play or advance one network event at a time.";
    $("#scenarioStatus").textContent = "Ready to simulate";
    $("#scenarioHint").textContent = scenarioLabel();
    $("#scenarioDot").classList.remove("running", "complete");
    setStates(lab.mode === "flow" ? "READY / RWND ?" : "READY / SEQ 0", "IDLE", lab.mode === "flow" ? "BUFFER EMPTY" : "EXPECT 0", lab.mode === "flow" ? "waiting for rwnd" : "base 0 · next 0", lab.mode === "flow" ? "4 free slots" : "expects 0");
    setSlots("senderWindow");
    setSlots("receiverBuffer");
    if (!keepLog) {
      $("#eventLog").innerHTML = `<li class="active"><time>00</time><span><b>Ready.</b> ${lab.mode === "flow" ? "Receiver buffer is empty; sender awaits rwnd." : "Sender sequence = 0; receiver expects 0."}</span></li>`;
    }
  }

  function setMode(mode) {
    if (!modeCopy[mode]) return;
    lab.mode = mode;
    lab.scenario = scenarioByMode[mode];
    $$(".lab-tabs button").forEach((button) => {
      const selected = button.dataset.mode === mode;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    const copy = modeCopy[mode];
    $("#modeTag").textContent = copy.tag;
    $("#modeTitle").textContent = copy.title;
    $("#modeText").textContent = copy.text;
    $("#modeRule").textContent = copy.rule;
    const select = $("#scenarioLab");
    select.replaceChildren(...scenarioOptions[mode].map(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = value === lab.scenario;
      return option;
    }));
    resetLab();
  }

  async function advanceStep() {
    if (lab.busy) return;
    if (lab.index >= lab.steps.length) {
      lab.playing = false;
      $("#playLab").textContent = "↺ Replay";
      $("#scenarioStatus").textContent = "Scenario complete";
      $("#scenarioDot").classList.add("complete");
      return;
    }
    lab.busy = true;
    const item = lab.steps[lab.index];
    const number = lab.index + 1;
    $("#stepCounter").textContent = `STEP ${number} / ${lab.steps.length}`;
    $("#stepTitle").textContent = item.title;
    $("#stageCaption").textContent = item.caption;
    $("#scenarioStatus").textContent = item.title;
    $("#scenarioDot").classList.add("running");
    setStates(...item.states);
    setSlots("senderWindow", item.visual.sender);
    setSlots("receiverBuffer", item.visual.receiver);
    addLog(item.title, item.caption, number);
    if (item.action) await item.action();
    lab.index += 1;
    lab.busy = false;
    if (lab.index >= lab.steps.length) {
      $("#scenarioStatus").textContent = "Scenario complete";
      $("#scenarioDot").classList.remove("running");
      $("#scenarioDot").classList.add("complete");
    }
  }

  async function autoplay() {
    if (lab.playing) {
      lab.playing = false;
      $("#playLab").textContent = "▶ Resume";
      return;
    }
    if (lab.index >= lab.steps.length) resetLab();
    lab.playing = true;
    $("#playLab").textContent = "Ⅱ Pause";
    while (lab.playing && lab.index < lab.steps.length) {
      await advanceStep();
      if (lab.playing && lab.index < lab.steps.length) await wait(duration(500));
    }
    if (lab.index >= lab.steps.length) {
      lab.playing = false;
      $("#playLab").textContent = "↺ Replay";
    }
  }

  $$(".lab-tabs button").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  $("#playLab").addEventListener("click", autoplay);
  $("#stepLab").addEventListener("click", async () => {
    lab.playing = false;
    $("#playLab").textContent = "▶ Auto play";
    await advanceStep();
  });
  $("#restartLab").addEventListener("click", () => resetLab());
  $("#scenarioLab").addEventListener("change", () => {
    lab.scenario = $("#scenarioLab").value;
    scenarioByMode[lab.mode] = lab.scenario;
    resetLab();
  });
  $("#speedLab").addEventListener("change", () => {
    $("#scenarioHint").textContent = `${$("#speedLab option:checked").textContent} animation speed`;
  });
  $("#clearLog").addEventListener("click", () => {
    $("#eventLog").innerHTML = "";
    addLog("Trace cleared", "Continue the scenario to record new events.", lab.index);
  });

  setMode("stopwait");
})();
