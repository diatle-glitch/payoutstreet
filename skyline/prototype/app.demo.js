const initial=[{name:'Topstep',short:'Topstep',value:179500,count:25,source:'Wise',color:'#e1f784',mark:'T'},{name:'Apex',short:'Apex',value:169600,count:26,source:'CFMO',color:'#a7cabb',mark:'A'},{name:'Tradeify',short:'Tradeify',value:126500,count:20,source:'Rise',color:'#cea992',mark:'T'},{name:'FundedNext',short:'FundedNext',value:63700,count:21,source:'On-chain',color:'#b2a9d1',mark:'F'},{name:'My Funded Futures',short:'My Funded',value:66700,count:9,source:'Aeropay',color:'#d3bf8b',mark:'M'},{name:'Alpha Futures',short:'Alpha',value:43700,count:6,source:'Rise',color:'#b7c1bf',mark:'α'},{name:'GOAT',short:'GOAT',value:17800,count:6,source:'Wise',color:'#92af71',mark:'G'},{name:'Savius',short:'Savius',value:7700,count:5,source:'Discord',color:'#777d70',mark:'S',unverified:true}];
let firms=structuredClone(initial),paused=matchMedia('(prefers-reduced-motion: reduce)').matches,tick=0;const $=s=>document.querySelector(s), money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n), compact=n=>'$'+(n/1000).toFixed(1)+'k';
const sponsors={};
function billboardText(i){return sponsors[i]?.name||'YOUR BRAND';}
function render(){
 const total=firms.reduce((a,f)=>a+f.value,0),sorted=[...firms].sort((a,b)=>b.value-a.value);
 $('#total').innerHTML=money(total)+'<span>.00</span>';
 $('#payout-count').textContent=firms.reduce((a,f)=>a+f.count,0);
 $('#leader-share').textContent=(firms[0].value/total*100).toFixed(1)+'% of today’s total';
 const max=Math.max(200000,...firms.map(f=>f.value*1.1));
 $('#skyline').innerHTML=firms.map((f,i)=>`<div class="building-lot" style="--height:${100+f.value/max*270}px;--firm-color:${f.color}">
 <button class="rooftop-ad theme-${sponsors[i]?.theme||['ivory','lime','ink','ivory','ink','lime','ivory','ink'][i]}" data-ad="${i}" aria-label="Preview advertising above ${f.name}"><span class="ad-meta">ROOFTOP ${String(i+1).padStart(2,'0')} / AD</span><b></b><span class="ad-cta">${sponsors[i]?'PREVIEW':'ADVERTISE HERE'} ↗</span></button>
 <button class="tower ${f.unverified?'unverified':''}" data-firm="${i}" aria-label="${f.name}: ${money(f.value)}. View details"><span class="building-facade facade-${i}" aria-hidden="true"></span><span class="building-facade building-entry facade-${i}" aria-hidden="true"></span>${i===2?'<span class="window-cameo cameo-brett" aria-label="Brett Simba at the Tradeify window"><img src="assets/brett-tradeify.png" alt="Brett Simba"><small>BRETT</small></span>':i===4?'<span class="window-cameo cameo-matt" aria-label="Matt Leech at the My Funded Futures window"><img src="assets/matt-mff.png" alt="Matt Leech"><small>MATT</small></span>':''}<span class="building-payout">${compact(f.value)}<small>TOTAL PAID</small></span><span class="building-rank">${String(sorted.indexOf(f)+1).padStart(2,'0')}</span>${f.unverified?'<span class="building-unverified">UNVERIFIED</span>':''}</button></div>`).join('');
 document.querySelectorAll('[data-ad]').forEach(el=>{el.querySelector('b').textContent=billboardText(+el.dataset.ad);el.onclick=()=>advertise(+el.dataset.ad)});
 $('#firm-labels').innerHTML=firms.map((f,i)=>`<button class="firm-label" data-firm="${i}"><b>${f.short}</b><small class="${f.unverified?'source-warning':''}">${f.unverified?'Unverified':f.count+' paid'}<span class="source-name"> · ${f.source}</span></small></button>`).join('');
 $('#book-rows').innerHTML=sorted.map((f,i)=>`<tr tabindex="0" role="button" data-firm="${firms.indexOf(f)}" aria-label="View ${f.name}"><td>${String(i+1).padStart(2,'0')}</td><td><span style="color:${f.color}">${f.mark}</span>${f.name}</td><td>${money(f.value)}</td><td>${f.count}</td><td><span class="share"><i style="width:${f.value/total*300}%"></i></span>${(f.value/total*100).toFixed(1)}%</td><td><span class="source ${f.unverified?'unverified':''}">${f.unverified?'◌':'↗'} ${f.source}${f.unverified?' · unverified':''}</span></td><td>↗</td></tr>`).join('');
 document.querySelectorAll('[data-firm]').forEach(el=>{el.onclick=()=>showFirm(+el.dataset.firm);if(el.tagName==='TR')el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click()}}});
}
function advertise(i){
 const f=firms[i];
 open(`<span class="eyebrow">ROOFTOP ${String(i+1).padStart(2,'0')} / ADVERTISING</span><h2>Your brand.<br>Above the street.</h2><p>A dedicated billboard above <b>${f.name}</b>. The placement stays with this building as its payout floors grow.</p><form id="ad-form"><label for="ad-name">Preview your brand name</label><input id="ad-name" maxlength="22" placeholder="YOUR BRAND" autocomplete="organization"><label for="ad-theme">Billboard finish</label><select id="ad-theme"><option value="ivory">Warm white</option><option value="lime">Street lime</option><option value="ink">Midnight</option></select><button class="preview-ad" type="submit">See it on the rooftop ↗</button><button class="reset-ad" type="button" id="reset-ad">Reset this placement</button></form><p class="ad-note">Concept preview only. No reservation or payment. Rates and booking are not yet available.</p><p class="ad-note">Advertising never changes payout rankings or verification status. A rooftop placement does not imply the prop firm endorses the advertiser.</p>`);
 $('#ad-name').value=sponsors[i]?.name||'';$('#ad-theme').value=sponsors[i]?.theme||'ivory';
 $('#ad-form').onsubmit=e=>{e.preventDefault();const name=$('#ad-name').value.trim();if(!name){$('#ad-name').focus();$('#ad-name').setCustomValidity('Enter a brand name to preview.');$('#ad-name').reportValidity();return;}sponsors[i]={name,theme:$('#ad-theme').value};$('#detail-dialog').close();render();document.querySelector(`[data-ad="${i}"]`).focus();};
 $('#ad-name').oninput=()=>$('#ad-name').setCustomValidity('');
 $('#reset-ad').onclick=()=>{delete sponsors[i];$('#detail-dialog').close();render();document.querySelector(`[data-ad="${i}"]`).focus();};
}
function open(content){$('#dialog-content').innerHTML=content;$('#detail-dialog').showModal()}
function showFirm(i){const f=firms[i];open(`<span class="eyebrow">FIRM SNAPSHOT / DEMO SESSION</span><h2>${f.name}</h2><strong>${money(f.value)}</strong><p>Total payouts in the illustrated session.</p><div class="detail-grid"><span>Payouts<b>${f.count}</b></span><span>Average payout<b>${money(f.value/f.count)}</b></span><span>Source<b>${f.source}</b></span></div><p>${f.unverified?'Discord-reported data is unverified and shown with a dashed tower.':'The source label comes from the supplied reference. No provider is connected to this concept.'}</p>`)}
function methodology(){open('<span class="eyebrow">READING THE STREET</span><h2>Payouts, made visible.</h2><p>Each tower represents a prop firm. Every building has the same base height; the extra floors above it are proportional to total dollars paid. Exact totals are shown on the facade and in Daily books. Rooftop advertisements are excluded from that height. Each demo payout is counted immediately. A walker then visits the building and leaves with a cash bag (under $2,000), a duffel ($2,000–$9,999), a cash trolley ($10,000–$49,999), or drives in for a supercar pickup ($50,000+). Buildings process visitors independently, one at a time per entrance. Twenty different men and women use four sidewalk lanes. Supercars use a separate road lane. A maximum of 16 visible visitors keep the street readable; extra visitors wait in a queue. Pausing freezes the replay.</p><p><b>Source matters.</b> A source label identifies the reported payment rail. An unverified badge and dashed outline mark Discord-only reports.</p><p><b>This is a concept replay.</b> Starting figures come from your reference image. Animated events are simulated; no live payment providers or independent verification are connected.</p><p>The reference’s firm payout counts sum to 118. The replay uses those counts, including 5 for Savius inferred from the overall total.</p>')}
$('#how').onclick=methodology;$('#methodology').onclick=methodology;$('.close-dialog').onclick=()=>$('#detail-dialog').close();$('#detail-dialog').addEventListener('click',e=>{if(e.target===$('#detail-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});$('#sponsor-info').onclick=()=>advertise(0);

function updatePause(){$('#pause').innerHTML=paused?'▶ <span>Play</span>':'Ⅱ <span>Pause</span>';$('#pause').setAttribute('aria-label',paused?'Play replay':'Pause replay');$('#replay-status').textContent=paused?'Replay paused':'Demo replay'}$('#pause').onclick=()=>{paused=!paused;updatePause()};$('#restart').onclick=()=>{firms=structuredClone(initial);tick=0;render();$('#tape').innerHTML='<b>Session reset</b><span class="tape-source">Starting figures restored · Demo replay</span>'};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('nav-active',x===b));$(b.dataset.view==='books'?'#books':'#street').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})});
render();updatePause();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const canvas=$('#payout-people'),ctx=canvas.getContext('2d'),walkerSheet=new Image();walkerSheet.src='assets/diverse-walkers.png';
const equipmentSheet=new Image();equipmentSheet.src='assets/payout-equipment.png';
const helicopterImage=new Image();helicopterImage.src='assets/topup-helicopter.png';
const supercarImage=new Image();supercarImage.src='assets/payout-supercar.png';
const engine=new PayoutEngine({width:$('.city-scene').clientWidth});
let lastTime=0,autoClock=0,topupClock=0,eventCounter=0,lastStatus='',tapeEvents=[],topups=[];
function sizeStreet(){const width=$('.city-scene').clientWidth;engine.resize(width);const height=parseFloat(getComputedStyle($('.city-scene')).getPropertyValue('--ground'))+197;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;canvas.style.width=width+'px';canvas.style.height=height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);}
new ResizeObserver(sizeStreet).observe($('.city-scene'));sizeStreet();
function receivePayouts(batch){
 const accepted=engine.enqueue(batch.map(e=>({...e,id:'demo-'+(++eventCounter)})));
 for(const e of accepted){firms[e.firm].value+=e.amount;firms[e.firm].count++;tapeEvents.unshift(e);}
 if(accepted.length){render();$('#tape').replaceChildren();for(const e of tapeEvents.slice(0,10)){const firm=document.createElement('b'),amount=document.createElement('span'),source=document.createElement('span');firm.textContent=firms[e.firm].name;amount.textContent='+'+money(e.amount);source.className='tape-source';source.textContent=firms[e.firm].source+' · Demo payout';$('#tape').append(firm,amount,source);}}
 if(reducedMotion.matches)engine.finishWithoutMotion();
 updateStreetStatus();
}
function updateStreetStatus(){const text=reducedMotion.matches?'Reduced motion · '+engine.completed+' payouts shown':paused?'Paused · '+engine.actors.length+' on the street · '+engine.pending.length+' queued':engine.actors.length+' on the street · '+engine.pending.length+' queued · '+engine.completed+' collected';if(text!==lastStatus){$('#walking-status').textContent=text;lastStatus=text;}}
function runDemo(batch){if(!reducedMotion.matches)paused=false;updatePause();receivePayouts(batch);autoClock=0;}
$('#demo-one').onclick=()=>{const amounts=[850,4500,18000];runDemo([{firm:tick%8,amount:amounts[tick++%3]}]);};
$('#demo-truck').onclick=()=>runDemo([{firm:2,amount:75000}]);
$('#demo-same').onclick=()=>runDemo([850,2400,12500,1800,22000].map(amount=>({firm:0,amount})));
$('#demo-many').onclick=()=>runDemo([750,2400,75000,1600,6500,24000,1100,85000].map((amount,firm)=>({firm,amount})));
function launchTopup(firm=tick++%8,amount=[150000,250000,500000][tick%3]){topups.push({firm,amount,x:-190,phase:'fly',elapsed:0,drop:0});if(!reducedMotion.matches)paused=false;updatePause();}
$('#demo-topup').onclick=()=>launchTopup();
$('#restart').onclick=()=>{engine.reset();firms=structuredClone(initial);tick=0;autoClock=0;topupClock=0;topups=[];tapeEvents=[];render();$('#tape').innerHTML='<b>Session reset</b><span class="tape-source">Starting figures restored · Demo replay</span>';ctx.clearRect(0,0,canvas.width,canvas.height);updateStreetStatus();};
$('#pause').onclick=()=>{paused=!paused;updatePause();updateStreetStatus();};
function drawEquipment(cell,x,feet,w,h){
 if(!equipmentSheet.complete||!equipmentSheet.naturalWidth)return;
 const rects=[[142,134,310,376],[633,112,601,414],[46,687,515,462],[628,764,613,370]];
 const [sx,sy,sw,sh]=rects[cell];ctx.drawImage(equipmentSheet,sx,sy,sw,sh,x,feet-h,w,h);
}
function drawWalker(a,x,y,w,h,sw,sh,identity,moving){
 const sx=(identity%4)*sw,sy=Math.floor(identity/4)*sh,split=.64,step=moving?Math.sin(engine.time*13+a.order)*.18:0;
 ctx.drawImage(walkerSheet,sx,sy,sw,sh*split,x,y,w,h*split);
 const hipY=y+h*split,legH=h*(1-split);
 ctx.save();ctx.beginPath();ctx.rect(x-4,hipY,w/2+8,legH+10);ctx.clip();ctx.translate(x+w*.43,hipY);ctx.rotate(step);ctx.drawImage(walkerSheet,sx,sy+sh*split,sw,sh*(1-split),-w*.43,0,w,legH);ctx.restore();
 ctx.save();ctx.beginPath();ctx.rect(x+w/2-4,hipY,w/2+8,legH+10);ctx.clip();ctx.translate(x+w*.57,hipY);ctx.rotate(-step);ctx.drawImage(walkerSheet,sx,sy+sh*split,sw,sh*(1-split),-w*.57,0,w,legH);ctx.restore();
}
function drawStreet(){
 const sceneHeight=canvas.height/Math.min(devicePixelRatio||1,2);ctx.clearRect(0,0,engine.width,sceneHeight);
 for(const h of topups){const target=engine.doorX(h.firm),hx=h.x,hy=88+Math.sin(h.elapsed*5)*3;if(helicopterImage.complete&&helicopterImage.naturalWidth)ctx.drawImage(helicopterImage,hx-105,hy-54,210,136);ctx.font='700 12px "DM Sans",sans-serif';ctx.textAlign='center';ctx.fillStyle='#e1f784';ctx.fillText('FIRM TOP-UP · '+money(h.amount),hx,hy-48);if(h.phase==='drop'){for(let i=0;i<13;i++){const fall=Math.min(1,h.drop-i*.035);if(fall>0){const bx=target+Math.sin(i*9.7)*34,by=145+fall*(330+Math.cos(i)*38);ctx.save();ctx.translate(bx,by);ctx.rotate(fall*5+i);ctx.fillStyle=i%2?'#d8e7aa':'#eef1d5';ctx.fillRect(-6,-3,12,6);ctx.restore();}}}}
 const ready=walkerSheet.complete&&walkerSheet.naturalWidth>0,groundOffset=parseFloat(getComputedStyle($('.city-scene')).getPropertyValue('--ground'))-48;ctx.save();ctx.translate(0,groundOffset);
 for(const a of [...engine.actors].sort((a,b)=>a.y-b.y)){
  const truck=a.tier===4,driving=truck&&['approach','depart'].includes(a.phase),parked=truck&&!driving;
  if(truck){ctx.save();if(supercarImage.complete&&supercarImage.naturalWidth){ctx.shadowColor='#000';ctx.shadowBlur=12;ctx.drawImage(supercarImage,a.x-95,143,190,72);}else drawEquipment(3,a.x-83,211,168,112);ctx.font='700 11px "DM Sans",sans-serif';ctx.textAlign='center';ctx.fillStyle='#e1f784';ctx.fillText(a.loaded?'BIG PAYCHECK · +'+money(a.amount):'VIP PAYOUT PICKUP',a.x,137);ctx.restore();}
  if(a.phase==='inside'||driving)continue;
  const moving=!['waiting','inside'].includes(a.phase),identity=a.order%20;
  const bob=moving?Math.sin(engine.time*13+a.order)*.8:0;
  const w=66,h=55,x=a.x-w/2,feet=a.y+48,y=feet-h+bob;
  ctx.save();ctx.globalAlpha=Math.max(0,Math.min(a.opacity,(a.x+45)/40,1));
  if(ready){const sw=walkerSheet.naturalWidth/4,sh=walkerSheet.naturalHeight/5;drawWalker(a,x,y,w,h,sw,sh,identity,moving);}
  if(a.loaded&&!truck){if(a.tier===1)drawEquipment(0,a.x+2,feet-6,18,22);else if(a.tier===2)drawEquipment(1,a.x-4,feet-4,32,25);else drawEquipment(2,a.x+12,feet+1,45,42);}
  if(a.opacity>.22&&!truck){const label=(a.loaded?'+':'')+money(a.amount);ctx.font='700 12px "DM Sans",sans-serif';const tw=ctx.measureText(label).width,lx=Math.max(tw/2+8,Math.min(engine.width-tw/2-8,a.x)),ly=Math.max(18,y-25);ctx.fillStyle=a.loaded?'#101713f5':'#22291fed';ctx.strokeStyle=a.loaded?'#e1f78499':'#9eaa7955';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(lx-tw/2-7,ly-14,tw+14,20,5);ctx.fill();ctx.stroke();ctx.fillStyle=a.loaded?'#e1f784':'#f0f2e8';ctx.textAlign='center';ctx.fillText(label,lx,ly);}
  ctx.restore();
 }
 for(let i=0;i<8;i++){const n=engine.pending.filter(e=>e.firm===i).length+engine.actors.filter(a=>a.firm===i&&['approach','waiting'].includes(a.phase)).length;const tower=document.querySelector(`.tower[data-firm="${i}"]`);tower?.classList.toggle('door-active',engine.doors[i]!==null);if(n>1){ctx.font='11px "DM Sans",sans-serif';ctx.textAlign='center';ctx.fillStyle='#192218ed';ctx.fillRect(engine.doorX(i)-35,3,70,18);ctx.fillStyle='#d7e5c4';ctx.fillText(n+' arriving',engine.doorX(i),16);}}
 ctx.restore();
}
function animate(now){const dt=lastTime?Math.min((now-lastTime)/1000,.1):0;lastTime=now;
 const blocked=paused||document.hidden||$('#detail-dialog').open;
 if(!blocked){if(!reducedMotion.matches)engine.step(dt);autoClock+=dt;topupClock+=dt;if(autoClock>9&&engine.pending.length<24){autoClock=0;const schedule=[{firm:0,amount:950},{firm:3,amount:4200},{firm:6,amount:16500},{firm:1,amount:2100}];receivePayouts([schedule[tick++%schedule.length]]);}if(topupClock>24){topupClock=0;launchTopup();}for(const h of topups){h.elapsed+=dt;const target=engine.doorX(h.firm);if(h.phase==='fly'){h.x+=155*dt;if(h.x>=target){h.x=target;h.phase='drop';h.elapsed=0;}}else if(h.phase==='drop'){h.drop+=dt/2.4;if(h.drop>=1){h.phase='leave';h.elapsed=0;}}else{h.x+=185*dt;}}topups=topups.filter(h=>h.x<engine.width+210);}
 drawStreet();updateStreetStatus();requestAnimationFrame(animate);
}
walkerSheet.onload=()=>{if(!paused&&!reducedMotion.matches)receivePayouts([{firm:0,amount:850},{firm:3,amount:4500},{firm:6,amount:16000}]);};
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)engine.finishWithoutMotion();updateStreetStatus();});
requestAnimationFrame(animate);
