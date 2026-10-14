// Shared collision and ground sampling for every arena entity.
const Collision={
  heightFn:null,
  obstacleProvider:null,
  setWorld(heightFn=null,obstacleProvider=null){this.heightFn=heightFn;this.obstacleProvider=obstacleProvider},
  heightAt(x,z){const value=this.heightFn?this.heightFn(x,z):0;return Number.isFinite(value)?value:0},
  nearby(x,z,radius){return this.obstacleProvider?this.obstacleProvider(x,z,radius):[]},
  cameraSweep(anchor,desired,radius=.38,arena=arenaRadius){
    const direction=desired.clone().sub(anchor),length=direction.length();
    if(length<1e-5)return desired.setY(Math.max(desired.y,this.heightAt(desired.x,desired.z)+radius));
    const steps=Math.max(1,Math.ceil(length/.28)),sample=new T.Vector3(),safe=anchor.clone();
    for(let index=1;index<=steps;index++){
      sample.copy(anchor).addScaledVector(direction,index/steps);
      const ground=this.heightAt(sample.x,sample.z)+radius;
      let blocked=sample.y<ground;
      // The normal arena has a low circular stone wall. High isometric cameras
      // may pass above it, while third-person cameras stop before its surface.
      const radial=Math.hypot(sample.x,sample.z);if(!this.obstacleProvider&&radial>arena-.6&&radial<arena+2.8&&sample.y<5.2)blocked=true;
      if(!blocked)for(const collider of this.nearby(sample.x,sample.z,radius)){
        if(collider.destroyed||sample.y<collider.y-radius||sample.y>collider.y+collider.height+radius)continue;
        if(Math.hypot(sample.x-collider.x,sample.z-collider.z)<collider.radius+radius){blocked=true;break}
      }
      if(blocked)break;safe.copy(sample);
    }
    safe.y=Math.max(safe.y,this.heightAt(safe.x,safe.z)+radius);return safe;
  },
  resolve(position,radius,arena=arenaRadius,options={}){
    const useObstacles=options.obstacles!==false;
    if(useObstacles){
      // Two passes are enough to leave corners formed by overlapping round props.
      for(let pass=0;pass<2;pass++)for(const collider of this.nearby(position.x,position.z,radius)){
        if(collider.destroyed)continue;
        const dx=position.x-collider.x,dz=position.z-collider.z,min=radius+collider.radius,d2=dx*dx+dz*dz;
        if(d2>=min*min)continue;
        if(d2<1e-8){const angle=((collider.id||0)*2.399963229728653)% (Math.PI*2);position.x=collider.x+Math.cos(angle)*min;position.z=collider.z+Math.sin(angle)*min}
        else{const scale=min/Math.sqrt(d2);position.x=collider.x+dx*scale;position.z=collider.z+dz*scale}
      }
    }
    const distance=Math.hypot(position.x,position.z),limit=Math.max(0,arena-radius);
    if(distance>limit&&distance>1e-6){position.x*=limit/distance;position.z*=limit/distance}
    if(options.ground)position.y=this.heightAt(position.x,position.z)+(options.offset||0);
    return position;
  },
  separate(bodies){
    for(let pass=0;pass<2;pass++)for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
      const a=bodies[i],b=bodies[j],dx=b.position.x-a.position.x,dz=b.position.z-a.position.z,min=a.radius+b.radius,d2=dx*dx+dz*dz;
      if(d2>=min*min)continue;
      const distance=Math.sqrt(d2),nx=distance>1e-5?dx/distance:Math.cos((i*31+j)*1.7),nz=distance>1e-5?dz/distance:Math.sin((i*31+j)*1.7),overlap=min-(distance||0);
      const ai=a.inverseMass??1,bi=b.inverseMass??1,total=ai+bi;if(total<=0)continue;
      a.position.x-=nx*overlap*ai/total;a.position.z-=nz*overlap*ai/total;
      b.position.x+=nx*overlap*bi/total;b.position.z+=nz*overlap*bi/total;
    }
  }
};

function resolveCombatCollisions(){
  if(typeof players==='undefined'||typeof A==='undefined')return;
  const bodies=[];
  for(const player of players.values())if(player.hp>0)bodies.push({position:player.pos,radius:.65,inverseMass:1,kind:'player',entity:player});
  for(const unit of A.u)if(!unit.dead&&unit.rise>=1)bodies.push({position:unit.g.position,radius:.62,inverseMass:1,kind:'skeleton',entity:unit});
  if(typeof R!=='undefined'&&R.on&&!R.dead)bodies.push({position:rg.position,radius:3.4*Math.max(1,rg.scale.x),inverseMass:.06,kind:'golem'});
  if(typeof E!=='undefined'&&E.on&&!E.dead)bodies.push({position:eg.position,radius:2.5*Math.max(1,eg.scale.x),inverseMass:.08,kind:'ettin'});
  if(typeof B!=='undefined'&&!B.dead)for(let i=0;i<B.chain.length;i+=2)bodies.push({position:B.chain[i],radius:B.segs[i].s*Math.max(1,B.segs[i].root.scale.x)*.72,inverseMass:0,kind:'centipede',index:i});
  Collision.separate(bodies);
  for(const body of bodies){
    const crushes=body.kind==='golem'||body.kind==='ettin'||body.kind==='centipede';
    Collision.resolve(body.position,body.radius,arenaRadius,{obstacles:!crushes});
    if(body.kind==='player'){if(body.entity.ground)body.position.y=Collision.heightAt(body.position.x,body.position.z);body.entity.g.position.copy(body.position)}
    else if(body.kind==='skeleton')body.position.y=Collision.heightAt(body.position.x,body.position.z);
    else if(body.kind==='golem'&&R.state!=='land')body.position.y=Collision.heightAt(body.position.x,body.position.z);
    else if(body.kind==='ettin'&&E.state!=='air')body.position.y=Collision.heightAt(body.position.x,body.position.z);
    else if(body.kind==='centipede'){const i=body.index;B.disp[i].x=body.position.x;B.disp[i].z=body.position.z;B.segs[i].root.position.x=body.position.x;B.segs[i].root.position.z=body.position.z}
  }
}
