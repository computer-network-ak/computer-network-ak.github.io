(() => {
  'use strict';
  const lessons = {
    1: {title:'Encapsulation: follow one application message', nodes:['Application','Transport','Network','Link'], note:'One sender-side encapsulation path. Sizes assume Ethernet, minimum IPv4/TCP headers, and 100 bytes of application data; no TLS or options.', steps:[
      [0,'Create application data','The application supplies 100 bytes. These are the bytes passed to TCP, not necessarily a complete user-visible document.','Application bytes','100','Wrapper','None'],
      [1,'Add the TCP header','TCP adds a 20-byte minimum header, including ports and sequence state. The segment is now 120 bytes.','TCP segment','120 B','TCP data','100 B'],
      [2,'Add the IPv4 header','IPv4 adds a 20-byte minimum header with source and destination IP addresses. The IP packet is 140 bytes.','IP packet','140 B','Protocol','TCP (6)'],
      [3,'Build the Ethernet frame','Ethernet adds 14 header bytes and a 4-byte FCS. The 158-byte frame fits the ordinary limits; no padding is required.','Frame','158 B','Next hop','Destination MAC'],
      [3,'Transmit using the physical layer','The PHY sends encoded signals. Preamble/start delimiter and the interframe gap are outside the 158-byte frame count. The receiver reverses encapsulation.','Frame contents','14 + 20 + 20 + 100 + 4','Scope','One local link'] ]},
    2: {title:'DNS: resolve a name, then use the cache',nodes:['Stub client','Recursive resolver','Authoritative server','Application'],note:'Simplified successful A-record lookup. Root/TLD referrals, transport retries, and validation exchanges are omitted. A TTL of 60 seconds is illustrative.',steps:[
      [0,'Ask a naming question','The client asks for the A record of example.com. The question contains a domain and record type, not an entire URL.','Question','example.com / A','Cache','Not checked'],
      [1,'Check the resolver cache','The recursive resolver has no usable cached answer in this scenario, so it must obtain one.','Cache','Miss','Next action','Resolve delegation'],
      [2,'Obtain an authoritative answer','After following the required delegation, the resolver receives the requested answer with an illustrative 60-second TTL.','Answer','A record','TTL','60 seconds'],
      [1,'Cache and return the result','The resolver stores the answer and returns it to the client. Caching reduces repeated upstream work.','Cache','Populated','Upstream work','Completed'],
      [3,'A later lookup can reuse it','After 10 seconds, a repeated lookup can use the still-valid cache entry, with about 50 seconds remaining. The application separately establishes its connection.','Cache','Hit','Remaining TTL','About 50 seconds'] ]},
    3: {title:'TCP: recover a lost segment without duplicating bytes',nodes:['Sender','Network path','Receiver','Sender ACK state'],note:'Simplified timeout recovery with one outstanding data segment. ACKs are cumulative. Sequence numbers refer to bytes; congestion-window changes and timer estimation are omitted.',steps:[
      [0,'Send bytes 1000–1499','The sender transmits 500 bytes with SEQ=1000 and starts a retransmission timer.','Sequence','1000','Bytes in flight','500'],
      [1,'Lose the data segment','The segment is dropped before the receiver gets it. The receiver cannot acknowledge bytes it has not received.','Delivery','Lost','Receiver expects','1000'],
      [0,'Timer expires','Without an acknowledgment, the sender retransmits the same byte range. A retransmission does not assign new sequence numbers to these bytes.','Retransmit SEQ','1000','Payload','500 bytes'],
      [2,'Accept the retransmitted bytes','The receiver accepts bytes 1000–1499 and sends ACK=1500, naming the next byte expected.','Receiver expects','1500','ACK generated','1500'],
      [3,'Advance the acknowledged boundary','The sender receives ACK=1500 and removes these bytes from the outstanding range. TCP receipt does not prove application processing.','Bytes in flight','0','Acknowledged through','1499'] ]},
    4: {title:'Router forwarding: inspect, select, rewrite, transmit',nodes:['Incoming frame','IP lookup','Outgoing frame','Next hop'],note:'Ordinary IPv4 forwarding without NAT or tunneling. The destination is 10.1.2.9; the selected output uses Ethernet. Addresses and routes are teaching examples.',steps:[
      [0,'Receive the local frame','The router receives a frame addressed to its ingress MAC and examines the enclosed IP packet.','Destination IP','10.1.2.9','Incoming TTL','64'],
      [1,'Find matching prefixes','Installed routes /0, 10.0.0.0/8, and 10.1.2.0/24 match. The /24 is the most specific.','Winning prefix','10.1.2.0/24','Action','Output interface 3'],
      [1,'Update the forwarding header','The router decrements TTL to 63 and updates the IPv4 header checksum. Without NAT, the original source and destination IP addresses remain.','Outgoing TTL','63','Destination IP','Unchanged'],
      [2,'Create new link framing','The outgoing source MAC is the router’s output-interface MAC; the destination MAC identifies the resolved next hop. The incoming frame is not simply forwarded intact.','Source MAC','Output interface','Destination MAC','Next hop'],
      [3,'Transmit when scheduled','The packet waits if the output is busy, then crosses the outgoing link. A route lookup alone does not guarantee immediate transmission.','Output','Interface 3','Link frame','New header and FCS'] ]},
    5: {title:'Dijkstra: improve a route using a cheaper intermediate path',nodes:['Source A','Candidate B','Candidate C','Forwarding result'],note:'Undirected graph: A–B cost 2, A–C cost 8, B–C cost 3. All costs are nonnegative. This computes shortest paths, not BGP policy.',steps:[
      [0,'Initialize distances','Set A to 0 and other distances to infinity. No path to B or C has yet been evaluated.','Distance B','∞','Distance C','∞'],
      [0,'Settle A and inspect its links','The direct candidates are B at cost 2 and C at cost 8. Both remain tentative.','Distance B','2 via A','Distance C','8 via A'],
      [1,'Choose the smallest tentative distance','Settle B at cost 2. Its route cannot improve under the nonnegative-cost assumption.','Settled','A, B','Next candidate','C'],
      [2,'Relax B–C','The path A–B–C costs 2 + 3 = 5, beating the direct cost 8. Update C’s predecessor to B.','Old C cost','8','New C cost','5 via B'],
      [3,'Install the resulting next hop','Settle C. To reach C from A, the next hop is B. The lower-cost path uses two links rather than one.','Path','A → B → C','Total cost','5'] ]},
    6: {title:'Ethernet switch: learn first, then decide where to forward',nodes:['Ingress port 1','Learning table','Egress ports','Reply on port 2'],note:'One VLAN with three eligible forwarding ports, no preexisting entries, and no blocked links. Hosts A and B are on ports 1 and 2. Flooding stays within the VLAN.',steps:[
      [0,'Receive a frame from A to B','Host A sends a frame through port 1. The switch has no learned entry for either host.','Source / destination','A → B','MAC table','Empty'],
      [1,'Learn from the source','The switch records A on port 1 before looking up destination B. Source learning and destination forwarding are different operations.','MAC table','A → port 1','Destination B','Unknown'],
      [2,'Flood the unknown destination','Send copies through eligible ports 2 and 3, excluding ingress port 1. B receives the frame; another host may discard it.','Output ports','2 and 3','Reason','Unknown unicast'],
      [3,'Receive B’s reply','The reply enters on port 2. The switch learns B on port 2, then finds A’s already-known location.','MAC table','A → 1; B → 2','Reply destination','A'],
      [2,'Forward only to the known port','Forward B’s reply only through port 1. Later frames from A to B can use port 2 without unknown-destination flooding.','Reply output','Port 1 only','Next A → B','Port 2 only'] ]},
    7: {title:'Wi-Fi contention: freeze, resume, transmit, acknowledge',nodes:['Station','Shared channel','Access point','Station feedback'],note:'Simplified contention example for an ordinary acknowledged unicast frame. The chosen backoff is 3 slots; interframe spacing is described but not drawn to scale. Modern Wi-Fi also supports other access modes.',steps:[
      [0,'Wait and choose a backoff','After the required idle interval, the station uses a random backoff of 3 slots in this example.','Backoff','3 slots','Channel','Idle'],
      [1,'Count down one idle slot','The backoff reaches 2. A different station begins transmitting before this station reaches zero.','Backoff','2 slots','Channel','Becomes busy'],
      [1,'Freeze while the channel is busy','The station preserves the remaining count rather than counting through another transmission. It resumes only after the channel meets the idle requirements again.','Backoff','Frozen at 2','Action','Defer'],
      [2,'Resume, reach zero, and transmit','After the required idle interval, the remaining idle slots count down to zero. The station transmits its frame to the access point.','Backoff','0','Frame','Sent to AP'],
      [3,'Receive a link acknowledgment','The AP acknowledges successful local reception. Without the expected acknowledgment, a retry procedure may follow; this ACK is not a TCP or application ACK.','Local delivery','Acknowledged','End-to-end result','Not established'] ]},
    8: {title:'TLS 1.3: authenticate and establish protected communication',nodes:['Client','Server','Client validation','Protected channel'],note:'Simplified full certificate-based TLS 1.3 handshake with ephemeral key agreement, no client certificate, and no early data. Multiple handshake messages are grouped into teaching steps.',steps:[
      [0,'Send ClientHello','The client offers supported parameters and a key share. This begins negotiation; it does not yet establish the server’s identity.','Identity status','Not verified','Application data','Not yet sent'],
      [1,'Return ServerHello','The server selects compatible parameters and provides its key share. Both sides can derive handshake keys from the key agreement.','Handshake keys','Derived','Certificate check','Still required'],
      [1,'Send authentication messages','The server sends its encrypted handshake messages, including certificate information, a transcript signature, and Finished.','Server evidence','Certificate + signature','Transcript','Integrity protected'],
      [2,'Validate before trusting','The client verifies the expected name, certificate trust and validity, transcript signature, and Finished. Failure aborts rather than silently accepting an untrusted identity.','Validation','Pass in this example','Client Finished','Sent'],
      [3,'Exchange protected application data','Traffic keys protect application records. TLS protects communication with the authenticated peer; it does not decide whether that peer’s application behavior is honest.','Data protection','Authenticated encryption','Authorization','Application responsibility'] ]}
  };
  const root = document.querySelector('[data-technical-walkthrough]');
  if (!root) return;
  const data = lessons[root.dataset.technicalWalkthrough];
  if (!data) return;
  let position=-1, timer=null;
  const make=(tag, cls, text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
  root.append(make('h3','',data.title),make('p','','Follow one technical task from start to finish. Each step highlights where the action happens and updates the state below.'));
  const flow=make('div','walk-flow'), nodes=data.nodes.map((name,i)=>{const e=make('div','walk-node',`${i+1}. ${name}`);flow.append(e);return e;});
  const track=make('div','walk-track');track.setAttribute('aria-hidden','true');const token=make('span','walk-token','●');track.append(token);
  const status=make('div','walk-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
  const heading=make('h4'), description=make('p');status.append(heading,description);
  const metrics=make('dl','walk-metrics');
  const controls=make('div','walk-controls');
  const play=make('button','','Play'), next=make('button','','Next step'),reset=make('button','','Reset');
  for(const b of [play,next,reset]) {b.type='button';controls.append(b);}
  root.append(flow,track,status,metrics,controls,make('p','table-note',data.note));
  function stop(){clearInterval(timer);timer=null;}
  function render(){
    const step=data.steps[position];
    nodes.forEach((e,i)=>{e.classList.toggle('is-active',!!step && i===step[0]);if(step && i===step[0])e.setAttribute('aria-current','step');else e.removeAttribute('aria-current');});
    token.style.left=step?`${step[0]*100/3}%`:'0%';token.hidden=!step;
    heading.textContent=step?`Step ${position+1} / ${data.steps.length}: ${step[1]}`:'Ready to explore';
    description.textContent=step?step[2]:'Press Play for an automatic walkthrough or Next step to study each transition.';
    metrics.replaceChildren();if(step)for(let i=3;i<7;i+=2){const group=make('div');group.append(make('dt','',step[i]),make('dd','',step[i+1]));metrics.append(group);}
    next.disabled=position===data.steps.length-1;play.textContent=timer?'Pause':next.disabled?'Replay':'Play';
  }
  function advance(){if(position<data.steps.length-1)position++;if(position===data.steps.length-1)stop();render();}
  play.addEventListener('click',()=>{if(timer){stop();render();return;}if(position===data.steps.length-1)position=-1;timer=setInterval(advance,4200);advance();});
  next.addEventListener('click',()=>{stop();advance();});reset.addEventListener('click',()=>{stop();position=-1;render();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();render();}});
  render();
})();
