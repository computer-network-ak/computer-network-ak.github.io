(() => {
 'use strict';
 const host=document.querySelector('#physical-signal-lab');if(!host)return;
 const bits=[1,0,1,1,0,0,1,0], ns='http://www.w3.org/2000/svg';let cursor=0,timer=null;
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const svgEl=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;};
 function plot(title){const wrap=el('figure',null,'phy-plot');wrap.append(el('figcaption',title));const svg=svgEl('svg',{viewBox:'0 0 800 180',role:'img','aria-label':title});wrap.append(svg);host.append(wrap);return svg;}
 function axes(svg){svg.replaceChildren();for(let i=0;i<=8;i++)svg.append(svgEl('line',{x1:i*100,y1:12,x2:i*100,y2:162,stroke:'#d8dfeb'}));svg.append(svgEl('line',{x1:0,y1:90,x2:800,y2:90,stroke:'#8392aa','stroke-dasharray':'4 4'}));}
 function trace(svg,fn,color,dashed=false,scale=32){let d='';for(let i=0;i<=800;i++){let y=90-scale*fn(Math.min(i/100,7.99999));d+=(i?'L':'M')+i+','+y.toFixed(2);}svg.append(svgEl('path',{d,fill:'none',stroke:color,'stroke-width':2,...(dashed?{'stroke-dasharray':'6 4'}:{})}));}
 function slider(label,min,max,step,value,parent){const wrap=el('label',null,'phy-control');const text=el('span',label), input=el('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=value;const output=el('output',String(value));wrap.append(text,input,output);parent.append(wrap);input.addEventListener('input',()=>{output.textContent=input.value;draw();});return input;}
 host.append(el('h3','1. Map bits into a waveform'));
 host.append(el('p','Bits are information; a transmitter represents them using a measurable signal. Compare baseband line coding with carrier modulation. These idealized waveforms use normalized amplitude and time, not a particular Ethernet or Wi-Fi PHY.'));
 const controls=el('div',null,'phy-controls'),label=el('label','Signal representation '),mode=el('select');
 for(const [v,t] of [['nrz','Polar NRZ'],['manchester','Manchester'],['ask','ASK (on–off keying)'],['fsk','Binary FSK'],['psk','BPSK']]){const o=el('option',t);o.value=v;mode.append(o);}label.append(mode);controls.append(label);host.append(controls);
 const bitrow=el('div',null,'phy-bits');const cells=bits.map(b=>{const c=el('span',String(b));bitrow.append(c);return c;});host.append(bitrow);
 const tx=plot('Transmitted signal · horizontal axis: eight bit intervals · vertical axis: normalized amplitude');
 const explain=el('p',null,'phy-explain');host.append(explain);
 const buttons=el('div',null,'walk-controls');const play=el('button','Play bits'),next=el('button','Next bit'),reset=el('button','Reset');for(const b of [play,next,reset]){b.type='button';buttons.append(b);}host.append(buttons);
 const progress=el('p');progress.setAttribute('role','status');host.append(progress);
 host.append(el('h3','2. Send a baseband signal through an imperfect channel'));
 host.append(el('p','This receiver always uses polar NRZ: 1 → +1 and 0 → −1. It samples at each bit’s midpoint with an assumed perfect clock and decides 1 above or at zero, otherwise 0. Add impairments to see wrong decisions; the error count describes this eight-bit experiment, not a statistical bit-error rate.'));
 const channel=el('div',null,'phy-controls');host.append(channel);
 const gain=slider('Received signal gain',0.1,1,0.1,1,channel),noise=slider('Noise amplitude',0,1.5,0.1,0,channel),jam=slider('Interferer amplitude',0,1.5,0.1,0,channel),echo=slider('Delayed echo strength',0,1,0.1,0,channel);
 const rx=plot('Received NRZ · blue solid: channel output · gray dashed: original signal · dots: midpoint samples');
 const result=el('p',null,'phy-explain');result.setAttribute('aria-live','polite');host.append(result);
 host.append(el('p','Attenuation reduces desired amplitude. Noise here is a fixed, reproducible pseudo-random disturbance, not a calibrated thermal-noise model. Interference is another periodic signal. The echo is a positive copy delayed by one bit: it can mix a previous bit into the current decision (intersymbol interference). Real receivers use filtering, clock recovery, equalization, and error-correcting codes.'));
 host.append(el('h3','3. Watch constructive and destructive interference'));
 host.append(el('p','Two equal-frequency, equal-amplitude waves add at the receiver. Adjust relative phase: aligned waves reinforce; opposite waves cancel in this idealized example. Real reflected paths have different strengths and delays, so cancellation is usually incomplete and frequency-dependent.'));
 const phaseControls=el('div',null,'phy-controls');host.append(phaseControls);const phase=slider('Relative phase (degrees)',0,360,15,0,phaseControls);
 const interference=plot('Wave superposition · blue: desired wave · amber dashed: second wave · purple: received sum');
 const phaseResult=el('p',null,'phy-explain');host.append(phaseResult);
 host.append(el('h3','From physical signals back to usable data'));
 host.append(el('p','The receiver detects energy, filters and synchronizes it, estimates transmitted symbols, and maps those symbols back to bits. Channel decoding can repair some errors using redundancy; a checksum or CRC detects certain remaining errors but does not itself correct them. One symbol can encode multiple bits: four distinguishable symbols can represent two bits each. More densely spaced symbols generally require cleaner reception.'));
 const source=el('p');source.append(document.createTextNode('Primary references: '));for(const [name,url] of [['NI: carrier recovery','https://knowledge.ni.com/KnowledgeArticleDetails?id=kA03q000000x27qCAA&l=en-US'],['Cisco: multipath and diversity','https://www.cisco.com/c/en/us/support/docs/wireless-mobility/wireless-lan-wlan/27147-multipath.html']]){const a=el('a',name);a.href=url;source.append(a,document.createTextNode(' · '));}host.append(source);
 const nrz=t=>bits[Math.floor(t)]?1:-1;
 const random=Array.from({length:801},(_,i)=>{const x=Math.sin((i+1)*127.1)*43758.5453;return (x-Math.floor(x))*2-1;});
 const descriptions={nrz:'Polar NRZ: a 1 holds the positive level, a 0 holds the negative level for the full bit interval. Long runs have no transitions, making clock recovery harder without additional mechanisms.',manchester:'Manchester: each bit has a midpoint transition. Here 1 is low-to-high and 0 is high-to-low; conventions can be reversed. The transitions aid timing but increase transition activity relative to NRZ.',ask:'On–off keying is a form of ASK: a 1 sends a carrier and a 0 suppresses it. Data changes the carrier amplitude. Real transmitters shape transitions rather than switch with ideal discontinuities.',fsk:'Binary FSK: a 1 uses three carrier cycles per bit here, and a 0 uses one. Frequency distinguishes the symbols; the selected frequencies are illustrative.',psk:'BPSK: the two bit values use carrier phases separated by 180°. Here 1 selects the reference phase and 0 reverses it. A receiver needs an appropriate phase reference or recovery method.'};
 function draw(){
  axes(tx);const m=mode.value;trace(tx,t=>{const b=bits[Math.floor(t)],f=t%1;switch(m){case'nrz':return nrz(t);case'manchester':return (f<.5?-1:1)*(b?1:-1);case'ask':return b*Math.sin(4*Math.PI*t);case'fsk':return Math.sin(2*Math.PI*(b?3:1)*f);default:return nrz(t)*Math.sin(4*Math.PI*t);}},'#245fc2');
  tx.append(svgEl('rect',{x:cursor*100,y:10,width:100,height:152,fill:'#245fc2',opacity:.08}));cells.forEach((c,i)=>c.classList.toggle('active',i===cursor));explain.textContent=descriptions[m];progress.textContent=`Bit ${cursor+1} of 8: ${bits[cursor]}. Read the highlighted interval and compare its waveform with the bit value.`;
  axes(rx);trace(rx,nrz,'#8792a3',true,14);
  const received=t=>Number(gain.value)*nrz(t)+Number(noise.value)*random[Math.round(t*100)]+Number(jam.value)*Math.sin(2*Math.PI*.7*t)+Number(echo.value)*(t>=1?nrz(t-1):0);
  trace(rx,received,'#245fc2',false,14);let decoded='',errors=0;bits.forEach((b,i)=>{const v=received(i+.5),d=v>=0?1:0;decoded+=d;if(d!==b)errors++;rx.append(svgEl('circle',{cx:i*100+50,cy:90-14*v,r:4,fill:d===b?'#14633d':'#bd263c'}));});
  result.textContent=`Sent: ${bits.join('')} · Decoded: ${decoded} · Wrong bits: ${errors}/8. ${errors?'Red sample dots mark incorrect decisions.':'All eight midpoint decisions match.'}`;
  axes(interference);const angle=Number(phase.value)*Math.PI/180;const a=t=>Math.sin(Math.PI*t),b=t=>Math.sin(Math.PI*t+angle);trace(interference,a,'#245fc2');trace(interference,b,'#aa650c',true);trace(interference,t=>a(t)+b(t),'#8544ad');phaseResult.textContent=`Phase difference: ${phase.value}°. Resulting peak amplitude: ${(2*Math.abs(Math.cos(angle/2))).toFixed(2)} relative units. At 0° the peak is 2; at 180° it is 0 for these equal waves.`;
 }
 function stop(){clearInterval(timer);timer=null;play.textContent='Play bits';}
 play.addEventListener('click',()=>{if(timer){stop();return;}play.textContent='Pause';timer=setInterval(()=>{cursor=(cursor+1)%8;draw();},1100);});next.addEventListener('click',()=>{stop();cursor=(cursor+1)%8;draw();});reset.addEventListener('click',()=>{stop();cursor=0;mode.value='nrz';for(const [input,value] of [[gain,1],[noise,0],[jam,0],[echo,0],[phase,0]]){input.value=value;input.parentElement.querySelector('output').textContent=value;}draw();});mode.addEventListener('change',draw);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 draw();
})();
