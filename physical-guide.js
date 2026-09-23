(() => {
 'use strict';
 const host=document.querySelector('#physical-signal-lab');if(!host)return;
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const guide=make('div',null,'signal-guide');host.append(guide);
 guide.append(make('h3','Follow ONE bit from sender to receiver'),make('p','Start with the clean connection. Then choose a disturbance and watch the same four steps again. In this simple electrical-signal example, 1 means +1 volt and 0 means −1 volt.'));
 const settings=make('div',null,'guide-settings');const bitLabel=make('label','Bit to send'),bit=make('select');for(const v of ['1','0']){const o=make('option',v);o.value=v;bit.append(o);}bitLabel.append(bit);
 const conditionLabel=make('label','What happens on the way?'),condition=make('select');for(const [value,text]of [['clean','Clean connection'],['weak','Signal gets weaker'],['noise','A noise spike changes the sample'],['interference','Another signal cancels part of ours']]){const o=make('option',text);o.value=value;condition.append(o);}conditionLabel.append(condition);settings.append(bitLabel,conditionLabel);guide.append(settings);
 const steps=make('ol',null,'guide-steps');['Choose a bit','Make a signal','Cross the channel','Read the signal'].forEach(t=>steps.append(make('li',t)));guide.append(steps);
 const scene=make('div',null,'guide-scene'),sender=make('div',null,'guide-device'),channel=make('div',null,'guide-channel'),receiver=make('div',null,'guide-device');
 const sent=make('strong'),voltage=make('strong'),read=make('strong');sender.append(make('span','SENDER'),sent);channel.append(make('span','SIGNAL AT RECEIVER'),voltage);receiver.append(make('span','RECEIVER'),read);scene.append(sender,channel,receiver);guide.append(scene);
 const track=make('div',null,'guide-wire'),pulse=make('span',null,'guide-pulse');track.setAttribute('aria-hidden','true');track.append(pulse);guide.append(track);
 const figure=make('figure',null,'guide-meter'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 640 210');svg.setAttribute('role','img');svg.setAttribute('aria-label','Voltage scale with a zero-volt decision threshold');figure.append(svg,make('figcaption','Above the dashed line → read 1. Below it → read 0. Exactly on the line is an ambiguous boundary; this toy receiver chooses 1.'));guide.append(figure);
 const status=make('div',null,'guide-story'),title=make('h4'),body=make('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.append(title,body);guide.append(status);
 const buttons=make('div',null,'walk-controls'),play=make('button','Play slowly'),next=make('button','Next step'),reset=make('button','Start again');for(const b of [play,next,reset]){b.type='button';buttons.append(b);}guide.append(buttons);
 const takeaway=make('p',null,'guide-takeaway');guide.append(takeaway,make('p','Teaching model: one voltage sample with perfect timing. Disturbances are chosen examples, not random trials. Real links use different encoding, filtering, clock recovery, and error control; radio modulation is explored below.','table-note'));
 const advanced=make('details',null,'guide-advanced');advanced.append(make('summary','Explore more: waveforms, modulation, noise sliders, and interference'));const experiments=make('div');experiments.id='physical-experiments';advanced.append(experiments);host.append(advanced);
 let step=0,timer=null;
 const add=(tag,attrs,text)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;svg.append(e);};
 function render(){
  const value=Number(bit.value),level=value?1:-1,kind=condition.value;
  const actual=kind==='weak'?level*.25:kind==='noise'?level*-0.4:kind==='interference'?level*.2:level;
  const decoded=actual>=0?1:0;const fmt=n=>(n>0?'+':'')+n.toFixed(2)+' V';
  sent.textContent=`Bit ${value}`;voltage.textContent=step<1?'Not sent yet':step===1?fmt(level):fmt(actual);read.textContent=step<3?'Waiting…':`Bit ${decoded} ${decoded===value?'✓':'✕'}`;
  [...steps.children].forEach((e,i)=>{e.classList.toggle('active',i===step);if(i===step)e.setAttribute('aria-current','step');else e.removeAttribute('aria-current');});
  pulse.style.left=[0,22,63,96][step]+'%';pulse.textContent=step===0?String(value):step===3?String(decoded):'signal';
  svg.replaceChildren();
  for(const [y,label]of [[40,'+1 V'],[105,'0 V'],[170,'−1 V']]){add('line',{x1:75,y1:y,x2:625,y2:y,stroke:y===105?'#40516b':'#d6dfea','stroke-dasharray':y===105?'7 5':'0'});add('text',{x:8,y:y+5,fill:'#24334b','font-size':16},label);}
  add('text',{x:82,y:23,fill:'#24334b','font-size':15},'Voltage at the sampling instant');
  if(step>=1){add('circle',{cx:230,cy:105-level*65,r:8,fill:'#245fc2'});add('text',{x:150,y:202,fill:'#245fc2','font-size':16},'Sent: '+fmt(level));}
  if(step>=2){add('line',{x1:230,y1:105-level*65,x2:470,y2:105-actual*65,stroke:'#91620b','stroke-width':3});add('circle',{cx:470,cy:105-actual*65,r:9,fill:decoded===value?'#16704b':'#b22d43'});add('text',{x:390,y:202,fill:'#24334b','font-size':16},'Received: '+fmt(actual));}
  const channelText={clean:'Nothing changes this example’s voltage. The received level stays '+fmt(actual)+'.',weak:'The signal shrinks to one quarter of its original size. It is still on the correct side of zero, but has less margin against further disturbance.',noise:'At this chosen sampling instant, a noise spike adds '+fmt(-1.4*level)+'. The total crosses zero: '+fmt(level)+' + ('+fmt(-1.4*level)+') = '+fmt(actual)+'.',interference:'A second signal adds '+fmt(-.8*level)+' at this instant. It partly cancels the desired signal, leaving '+fmt(actual)+'. This example reduces the margin without flipping the bit.'};
  const titles=['First, choose the information','The transmitter turns the bit into a voltage','The channel changes what reaches the receiver','The receiver makes a decision'];
  title.textContent=`${step+1} / 4 — ${titles[step]}`;
  body.textContent=[`We want to send ${value}. A bit is a value, not a tiny object moving through the wire.`,`Our agreed rule maps ${value} to ${fmt(level)}. The blue dot shows the level the transmitter sends.`,channelText[kind],`The receiver samples ${fmt(actual)}. It is ${actual>=0?'above':'below'} zero, so it reads ${decoded}. ${decoded===value?'That matches the original bit.':'That is WRONG: we sent '+value+'. The receiver sees only the disturbed signal, not the original bit.'}`][step];
  takeaway.textContent=step===3?(decoded===value?'What to remember: a weaker or disturbed signal can still decode correctly if it stays on the correct side of the decision boundary.':'What to remember: if a disturbance pushes the sample across the decision boundary, the receiver can mistake 1 for 0 or 0 for 1.'):'Watch the dots: blue is what we send; the second dot is what arrives. The dashed line is the receiver’s decision boundary.';
  next.disabled=step===3;play.textContent=timer?'Pause':step===3?'Replay slowly':'Play slowly';
 }
 function stop(){clearInterval(timer);timer=null;}
 function advance(){if(step<3)step++;if(step===3)stop();render();}
 play.addEventListener('click',()=>{if(timer){stop();render();return;}if(step===3)step=0;timer=setInterval(advance,5500);render();});next.addEventListener('click',()=>{stop();advance();});
 function restart(){stop();step=0;render();}reset.addEventListener('click',restart);bit.addEventListener('change',restart);condition.addEventListener('change',restart);document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();render();}});render();
})();
