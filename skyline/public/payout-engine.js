/* Deterministic event scheduler: accounting is independent of visual capacity. */
(function(root){
class PayoutEngine {
 constructor({width=1080,onComplete=()=>{}}={}){this.width=width;this.onComplete=onComplete;this.reset();}
 reset(){this.pending=[];this.actors=[];this.seen=new Set();this.doors=Array(8).fill(null);this.orders=Array.from({length:8},()=>[]);this.sequence=0;this.completed=0;this.time=0;}
 enqueue(events){let accepted=[];for(const e of events){if(!e.id||this.seen.has(e.id)||!Number.isInteger(e.firm)||e.firm<0||e.firm>7||!Number.isFinite(e.amount)||e.amount<=0)continue;this.seen.add(e.id);const item={...e,tier:e.amount<2000?1:e.amount<10000?2:e.amount<50000?3:4,order:this.sequence++};this.pending.push(item);this.orders[e.firm].push(e.id);accepted.push(item);}return accepted;}
 doorX(i){return 32+(this.width-64)/8*(i+.5);}
 resize(w){const ratio=w/this.width;for(const a of this.actors)a.x*=ratio;this.width=w;}
 step(dt){dt=Math.min(Math.max(dt,0),.1);this.time+=dt;
  // Four separated lanes, bounded active population, overflow remains queued.
  for(let lane=0;lane<5&&this.actors.length<16;lane++){
   if(this.actors.some(a=>a.lane===lane&&a.x<(lane===4?195:105)))continue;
   const n=this.pending.findIndex(e=>(lane===4?e.tier===4:e.tier!==4)&&!this.pending.some(p=>p.firm===e.firm&&p.order<e.order)&&this.actors.filter(a=>a.firm===e.firm).length<3);
   if(n<0)continue;const e=this.pending.splice(n,1)[0];this.actors.push({...e,lane,x:-45,y:18+Math.min(lane,3)*16,phase:'approach',elapsed:0,opacity:1,loaded:false});
  }
  // The front-most walker moves first, preventing same-lane overtaking.
  const sorted=[...this.actors].sort((a,b)=>b.x-a.x);
  for(const a of sorted){a.elapsed+=dt;const target=this.doorX(a.firm),laneY=18+Math.min(a.lane,3)*16,spacing=a.tier===4?185:98;
   if(a.phase==='approach'){
    const lead=this.actors.filter(b=>b!==a&&b.lane===a.lane&&b.x>a.x&&['approach','waiting','depart'].includes(b.phase)).sort((x,y)=>x.x-y.x)[0];
    const stop=lead?lead.x-spacing:Infinity;a.x=Math.max(a.x,Math.min(target,stop,a.x+130*dt));
    if(a.x>=target-.1){a.phase='waiting';a.elapsed=0;}
   }
   if(a.phase==='waiting'&&this.doors[a.firm]===null&&this.orders[a.firm][0]===a.id){this.doors[a.firm]=a.id;a.phase='enter';a.elapsed=0;}
   if(a.phase==='enter'){const p=Math.min(1,a.elapsed/.8);a.y=laneY*(1-p);a.opacity=1-p*.95;if(p===1){a.phase='inside';a.elapsed=0;a.opacity=0;}}
   else if(a.phase==='inside'&&a.elapsed>=1){a.phase='exit';a.elapsed=0;a.loaded=true;}
   else if(a.phase==='exit'){const p=Math.min(1,a.elapsed/.9);a.y=laneY*p;a.opacity=p;const blocking=this.actors.some(b=>b!==a&&b.lane===a.lane&&Math.abs(b.x-a.x)<spacing&&b.x>a.x&&['approach','waiting','depart'].includes(b.phase));if(p===1&&!blocking){a.phase='depart';a.elapsed=0;this.doors[a.firm]=null;this.orders[a.firm].shift();}}
   else if(a.phase==='depart'){
    const lead=this.actors.filter(b=>b!==a&&b.lane===a.lane&&b.x>a.x&&['approach','waiting','depart','exit'].includes(b.phase)).sort((x,y)=>x.x-y.x)[0];a.x=Math.max(a.x,Math.min(lead?lead.x-spacing:Infinity,a.x+145*dt));
    if(a.x>this.width+70){a.phase='done';this.completed++;this.onComplete(a);}
   }
  }
  this.actors=this.actors.filter(a=>a.phase!=='done');
 }
 finishWithoutMotion(){const all=[...this.actors,...this.pending];for(const e of all){this.completed++;this.onComplete(e);}this.actors=[];this.pending=[];this.doors.fill(null);this.orders=Array.from({length:8},()=>[]);}
 get queued(){return this.pending.length+this.actors.filter(a=>a.phase==='waiting').length;}
}
if(typeof module!=='undefined'&&module.exports)module.exports=PayoutEngine;else root.PayoutEngine=PayoutEngine;
})(typeof globalThis!=='undefined'?globalThis:this);
