(() => {
 'use strict';
 const host=document.querySelector('#physical-signal-lab');if(!host)return;
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const guide=make('div',null,'signal-guide');host.append(guide);
 guide.append(make('h3','Send a bit. See what arrives.'),make('p','Our rule: positive signal = 1, negative signal = 0. Choose a clean or disturbed connection, then press Play.'));
 const settings=make('div',null,'guide-settings');const bitLabel=make('label','Bit to send'),bit=make('select');for(const v of ['1','0']){const o=make('option',v);o.value=v;bit.append(o);}bitLabel.append(bit);
 const conditionLabel=make('label','What happens on the way?'),condition=make('select');for(const [value,text]of [['clean','Clean connection'],['weak','Signal gets weaker'],['noise','A noise spike changes the sample'],['interference','Another signal cancels part of ours']]){const o=make('option',text);o.value=value;condition.append(o);}conditionLabel.append(condition);const speedLabel=make('label','Speed'),speed=make('select');for(const [v,t] of [['1800','Normal'],['900','Fast'],['3500','Reading pace']]){const o=make('option',t);o.value=v;speed.append(o);}speedLabel.append(speed);settings.append(bitLabel,conditionLabel,speedLabel);guide.append(settings);
 const steps=make('ol',null,'guide-steps');['Choose a bit','Make a signal','Cross the channel','Read the signal'].forEach(t=>steps.append(make('li',t)));guide.append(steps);
 const scene=make('div',null,'guide-scene'),sender=make('div',null,'guide-device'),channel=make('div',null,'guide-channel'),receiver=make('div',null,'guide-device');
 const sent=make('strong'),voltage=make('strong'),read=make('strong');sender.append(make('span','SENDER'),sent);channel.append(make('span','ON THE WAY'),voltage);receiver.append(make('span','RECEIVER'),read);scene.append(sender,channel,receiver);guide.append(scene);
 const track=make('div',null,'guide-wire'),pulse=make('span',null,'guide-pulse');track.setAttribute('aria-hidden','true');track.append(pulse);guide.append(track);
 const figure=make('figure',null,'guide-meter'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 640 210');svg.setAttribute('role','img');svg.setAttribute('aria-label','Voltage scale with a zero-volt decision threshold');figure.append(svg,make('figcaption','Above the dashed line → read 1. Below it → read 0. Exactly on the line is an ambiguous boundary; this toy receiver chooses 1.'));const graph=make('details',null,'guide-graph');graph.append(make('summary','See the voltage graph'),figure);
 const status=make('div',null,'guide-story'),title=make('h4'),body=make('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.append(title,body);guide.append(status);
 const buttons=make('div',null,'walk-controls'),play=make('button','Play'),next=make('button','Next step'),reset=make('button','Start again');for(const b of [play,next,reset]){b.type='button';buttons.append(b);}guide.append(buttons,graph);
 const takeaway=make('p',null,'guide-takeaway');guide.append(takeaway,make('p','Teaching model: one voltage sample with perfect timing. Disturbances are chosen examples, not random trials. Real links use different encoding, filtering, clock recovery, and error control; radio modulation is explored below.','table-note'));
 const advanced=make('details',null,'guide-advanced');advanced.append(make('summary','Explore more: waveforms, modulation, noise sliders, and interference'));const experiments=make('div');experiments.id='physical-experiments';advanced.append(experiments);host.append(advanced);
 let step=0,timer=null;
 const add=(tag,attrs,text)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;svg.append(e);};
 function render(){
  const value=Number(bit.value),level=value?1:-1,kind=condition.value;
  const actual=kind==='weak'?level*.25:kind==='noise'?level*-0.4:kind==='interference'?level*.2:level;
  const decoded=actual>=0?1:0;const fmt=n=>(n>0?'+':'')+n.toFixed(2)+' V';
  sent.textContent=`Bit ${value}`;voltage.textContent=step<1?'Ready':step===1?(level>0?'＋ Positive':'− Negative'):(actual>0?'＋ Positive':'− Negative');read.textContent=step<3?'?':`${decoded} ${decoded===value?'✓ Correct':'✕ Wrong'}`;receiver.classList.toggle('guide-error',step===3&&decoded!==value);receiver.classList.toggle('guide-success',step===3&&decoded===value);
  [...steps.children].forEach((e,i)=>{e.classList.toggle('active',i===step);if(i===step)e.setAttribute('aria-current','step');else e.removeAttribute('aria-current');});
  pulse.style.left=[0,22,63,96][step]+'%';pulse.textContent=step===0?String(value):step===3?String(decoded):'signal';
  svg.replaceChildren();
  for(const [y,label]of [[40,'+1 V'],[105,'0 V'],[170,'−1 V']]){add('line',{x1:75,y1:y,x2:625,y2:y,stroke:y===105?'#40516b':'#d6dfea','stroke-dasharray':y===105?'7 5':'0'});add('text',{x:8,y:y+5,fill:'#24334b','font-size':16},label);}
  add('text',{x:82,y:23,fill:'#24334b','font-size':15},'Voltage at the sampling instant');
  if(step>=1){add('circle',{cx:230,cy:105-level*65,r:8,fill:'#245fc2'});add('text',{x:150,y:202,fill:'#245fc2','font-size':16},'Sent: '+fmt(level));}
  if(step>=2){add('line',{x1:230,y1:105-level*65,x2:470,y2:105-actual*65,stroke:'#91620b','stroke-width':3});add('circle',{cx:470,cy:105-actual*65,r:9,fill:decoded===value?'#16704b':'#b22d43'});add('text',{x:390,y:202,fill:'#24334b','font-size':16},'Received: '+fmt(actual));}
  const channelText={clean:'The signal stays the same. Nothing disturbs it.',weak:'The signal gets smaller, but keeps its sign. Smaller does not automatically mean wrong.',noise:'A strong noise spike pushes the signal across zero. Positive becomes negative, or negative becomes positive.',interference:'Another signal partly cancels ours. This time the sign stays the same, so the bit survives.'};
  const titles=['Ready to send','Bit becomes a signal','Signal travels','Compare sent and received'];
  title.textContent=`${step+1} / 4 — ${titles[step]}`;
  body.textContent=[`Send ${value}. The receiver must work out this value from the signal.`,`The sender makes a ${level>0?'positive':'negative'} signal to represent ${value}.`,channelText[kind],`Sent ${value} → received ${decoded}. ${decoded===value?'Success: the signal stayed on the correct side of zero.':'Bit error: noise changed the sign, so the receiver chose the wrong bit.'}`][step];
  takeaway.textContent=step===3?(kind==='noise'?'Try “Clean connection” to compare the same bit without the noise spike.':'Try “A noise spike changes the sample” to see how a bit error happens.'):'The receiver’s rule never changes: positive → 1; negative → 0.';
  next.disabled=step===3;play.textContent=timer?'Pause':step===3?'Replay':'Play';
 }
 function stop(){clearInterval(timer);timer=null;}
 function advance(){if(step<3)step++;if(step===3)stop();render();}
 play.addEventListener('click',()=>{if(timer){stop();render();return;}if(step===3)step=0;timer=setInterval(advance,Number(speed.value));advance();});next.addEventListener('click',()=>{stop();advance();});
 function restart(){stop();step=0;render();}reset.addEventListener('click',restart);bit.addEventListener('change',restart);condition.addEventListener('change',restart);speed.addEventListener('change',()=>{if(timer){stop();timer=setInterval(advance,Number(speed.value));render();}});document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();render();}});render();
})();
