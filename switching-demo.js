(() => {
  'use strict';
  const root = document.querySelector('#switching-animation');
  if (!root) return;
  let step = 0, timer = null;
  const states = [];
  const packetQueue = [], circuitQueue = { A: [], B: [] };
  let pd = 0, cd = 0;
  states.push({label:'Ready', description:'Both models carry the same traffic over one link. Start to establish the circuit reservations.', p:[], c:[], pq:[], cq:[], pd:0, cd:0});
  states.push({label:'Setup', description:'Circuit switching assigns recurring A and B time slots. Packet switching needs no per-flow circuit reservation in this model.', p:[], c:[], pq:[], cq:[], pd:0, cd:0});
  const ph = [], ch = [];
  for (let t = 0; t < 8; t++) {
    const arrival = t === 0 ? 'A' : t === 2 ? 'B' : null;
    if (arrival) for (let j = 1; j <= 3; j++) {
      packetQueue.push(arrival + j); circuitQueue[arrival].push(arrival + j);
    }
    const owner = t % 2 === 0 ? 'A' : 'B';
    const p = packetQueue.shift() || 'Idle';
    const c = circuitQueue[owner].shift() || 'Idle';
    ph.push(p); ch.push(c);
    if (p !== 'Idle') pd++;
    if (c !== 'Idle') cd++;
    states.push({label:`Slot ${t + 1} of 8`, description:
      `${arrival ? arrival + ' produces three equal data units. ' : ''}Packet link: ${p === 'Idle' ? 'no data waiting' : 'sends ' + p}. Circuit slot belongs to ${owner}: ${c === 'Idle' ? 'unused, even if another user is waiting' : 'sends ' + c}.`,
      p:[...ph], c:[...ch], pq:[...packetQueue], cq:[...circuitQueue.A,...circuitQueue.B], pd, cd, currentP:p, currentC:c, owner});
  }
  states.push({...states[states.length - 1], label:'Release', currentP:null, currentC:null,
    description:'Both delivered six units. Packet sharing finished by slot 6; fixed circuit allocation finished by slot 8. Circuit teardown releases the reservations. Results depend on traffic and allocation; neither model creates extra link capacity.'});
  const node = id => root.querySelector(`[data-switch="${id}"]`);
  function cells(target, values, circuit = false) {
    target.replaceChildren();
    for (let i = 0; i < 8; i++) {
      const cell = document.createElement('span');
      const value = values[i];
      cell.className = 'switch-slot' + (value && value !== 'Idle' ? ' user-' + value[0].toLowerCase() : '');
      cell.textContent = value || '—';
      cell.title = circuit ? `Slot ${i+1}, reserved for ${i%2===0?'A':'B'}: ${value || 'not reached'}` : `Slot ${i+1}: ${value || 'not reached'}`;
      target.append(cell);
    }
  }
  function render() {
    const s = states[step];
    node('status').textContent = `${s.label}. ${s.description}`;
    for (const [key, queue, delivered, active] of [['packet',s.pq,s.pd,s.currentP],['circuit',s.cq,s.cd,s.currentC]]) {
      node(key+'-queue').textContent = queue.length ? queue.join(' · ') : 'Empty';
      node(key+'-count').textContent = `${delivered} / 6 units delivered`;
      const track = node(key+'-track'); track.replaceChildren();
      const token = document.createElement('span');
      token.className = 'switch-token' + (active && active !== 'Idle' ? ' user-'+active[0].toLowerCase() : '');
      token.textContent = active || (step === 0 ? 'Ready' : step === 1 ? (key === 'circuit' ? 'Reserve A / B' : 'Shared link') : 'Released');
      track.append(token);
      if (active && active !== 'Idle' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        token.animate([{left:'0%'},{left:'calc(100% - 110px)'}],{duration:700,fill:'forwards',easing:'ease-in-out'});
      }
    }
    cells(node('packet-history'),s.p); cells(node('circuit-history'),s.c,true);
    node('next').disabled = step === states.length - 1;
    node('play').textContent = timer ? 'Pause' : (step === states.length - 1 ? 'Replay' : 'Play');
  }
  function stop() { clearInterval(timer); timer = null; }
  function advance() { if (step < states.length-1) step++; if (step === states.length-1) stop(); render(); }
  node('play').addEventListener('click', () => {
    if (timer) { stop(); render(); return; }
    if (step === states.length-1) step=0;
    timer=setInterval(advance,1600); advance();
  });
  node('next').addEventListener('click',()=>{stop();advance();});
  node('reset').addEventListener('click',()=>{stop();step=0;render();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();render();}});
  render();
})();
