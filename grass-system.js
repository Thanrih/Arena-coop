// GPU grass layer: deterministic placement happens only when the arena changes;
// the frame loop updates global shader uniforms, never individual tufts.
const GRASS_CONFIG={
  grassDensity:1200,
  grassFinalDensity:2600,
  grassMinScale:.38,
  grassMaxScale:.78,
  grassWindStrength:.17,
  grassWindSpeed:1,
  grassInteractionRadius:2.7,
  grassRenderDistance:100,
  grassDensityMultiplier:(()=>{const current=localStorage.getItem('arena-grass-amount-v2'),legacy=localStorage.getItem('arena-grass-amount');const amount=Number(current??(legacy===null?10:Number(legacy)/10));return Math.max(.1,Math.min(10,amount/10))})(),
  showGrassBounds:false,
  showGrassDensity:false,
  disableGrassWind:false,
  disableGrassInteraction:false,
  seed:0x51a55eed
};

class GrassSystem{
  constructor(scene,texture,config={}){
    this.scene=scene;this.texture=texture;this.config=Object.assign({},GRASS_CONFIG,config);
    this.supported=ren.capabilities.isWebGL2||!!ren.extensions.get('ANGLE_instanced_arrays');
    this.radius=0;this.mesh=null;this.time=0;this.gustClock=0;this.gustIndex=0;this.gustDuration=2.7;
    this.windDirection=new T.Vector2(.86,.51).normalize();this.windStrength=1;
    this.players=[];this.impacts=[];this.exclusionZones=[];this.shader=null;
    this.uniforms={
      uGrassTime:{value:0},uWindDirection:{value:this.windDirection.clone()},uWindStrength:{value:this.config.grassWindStrength},
      uGust:{value:new T.Vector4(1,0,0,-80)},uCameraXZ:{value:new T.Vector2()},uRenderDistance:{value:this.config.grassRenderDistance},
      uPlayerCount:{value:0},uPlayerData:{value:Array.from({length:4},()=>new T.Vector4())},
      uImpactCount:{value:0},uImpactData:{value:Array.from({length:4},()=>new T.Vector4())}
    };
    this.densityPixels=this.readDensityMap(texture);this.material=this.createMaterial();this.bounds=this.createBounds();
  }
  random(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  readDensityMap(texture){
    const image=texture&&texture.image;if(!image||!image.width||!image.height)return null;
    try{const context=image.getContext&&image.getContext('2d');return context?{width:image.width,height:image.height,data:context.getImageData(0,0,image.width,image.height).data}:null}catch(error){return null}
  }
  densityAt(x,z,radius){
    const map=this.densityPixels;if(!map)return 1;
    const u=Math.max(0,Math.min(.9999,x/(radius*2)+.5)),v=Math.max(0,Math.min(.9999,z/(radius*2)+.5));
    const offset=(Math.floor(v*map.height)*map.width+Math.floor(u*map.width))*4,d=map.data;
    const light=(d[offset]*.25+d[offset+1]*.6+d[offset+2]*.15)/255;
    return .48+(1-light)*.9;
  }
  createGeometry(){
    const vertices=[],normals=[];const half=.13;
    // Two crossed rectangular cards: four large pixel-readable triangles per tuft.
    for(let card=0;card<2;card++){
      const angle=card*Math.PI/2,dx=Math.cos(angle)*half,dz=Math.sin(angle)*half,nx=Math.sin(angle),nz=-Math.cos(angle);
      vertices.push(-dx,0,-dz, dx,0,dz, dx,1,dz, -dx,0,-dz, dx,1,dz, -dx,1,-dz);
      for(let i=0;i<6;i++)normals.push(nx,0,nz);
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
    geometry.computeBoundingSphere();geometry.name='Crossed rectangular grass sprites';return geometry;
  }
  createMaterial(){
    // An explicit WebGL 1 shader avoids driver-specific failures caused by
    // patching Three.js' generated material shader with onBeforeCompile.
    const vertexShader=`
attribute float grassPhase;
attribute float grassFlex;
attribute vec3 grassTint;
varying vec3 vGrassTint;
uniform float uGrassTime;
uniform vec2 uWindDirection;
uniform float uWindStrength;
uniform vec4 uGust;
uniform vec2 uCameraXZ;
uniform float uRenderDistance;
uniform int uPlayerCount;
uniform vec4 uPlayerData[4];
uniform int uImpactCount;
uniform vec4 uImpactData[4];
vec2 playerPush(vec4 data,vec2 base,float phase){
  vec2 away=base-data.xy;float distanceToPlayer=length(away);
  vec2 direction=distanceToPlayer>.04?away/distanceToPlayer:vec2(cos(phase),sin(phase));
  return direction*(1.0-smoothstep(.15,data.z,distanceToPlayer))*data.w;
}
vec2 impactPush(vec4 data,vec2 base,float phase){
  vec2 away=base-data.xy;float distanceToImpact=length(away);
  vec2 direction=distanceToImpact>.04?away/distanceToImpact:vec2(cos(phase),sin(phase));
  float wave=.72+.28*sin(distanceToImpact*3.2-uGrassTime*11.0);
  return direction*(1.0-smoothstep(0.0,data.z,distanceToImpact))*data.w*wave;
}
void main(){
vGrassTint=grassTint;
vec4 grassBase=modelMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0);
float grassHeight=clamp(position.y,0.0,1.0);
vec2 grassBend=vec2(0.0);
float windA=sin(uGrassTime*1.65+grassPhase+dot(grassBase.xz,vec2(.105,.073)));
float windB=sin(uGrassTime*3.15-grassPhase*.67+dot(grassBase.xz,vec2(-.19,.16)))*.38;
grassBend+=uWindDirection*(windA+windB)*uWindStrength*grassFlex;
float gustDistance=dot(grassBase.xz,uGust.xy)-uGust.w;
float gustBand=1.0-smoothstep(0.0,15.0,abs(gustDistance));
grassBend+=uGust.xy*uGust.z*gustBand*grassFlex;
if(uPlayerCount>0)grassBend+=playerPush(uPlayerData[0],grassBase.xz,grassPhase);
if(uPlayerCount>1)grassBend+=playerPush(uPlayerData[1],grassBase.xz,grassPhase);
if(uPlayerCount>2)grassBend+=playerPush(uPlayerData[2],grassBase.xz,grassPhase);
if(uPlayerCount>3)grassBend+=playerPush(uPlayerData[3],grassBase.xz,grassPhase);
if(uImpactCount>0)grassBend+=impactPush(uImpactData[0],grassBase.xz,grassPhase);
if(uImpactCount>1)grassBend+=impactPush(uImpactData[1],grassBase.xz,grassPhase);
if(uImpactCount>2)grassBend+=impactPush(uImpactData[2],grassBase.xz,grassPhase);
if(uImpactCount>3)grassBend+=impactPush(uImpactData[3],grassBase.xz,grassPhase);
vec4 grassWorld=modelMatrix*instanceMatrix*vec4(position,1.0);
grassWorld.xz+=grassBend*grassHeight;
if(distance(grassBase.xz,uCameraXZ)>uRenderDistance)grassWorld.y=-1000.0;
gl_Position=projectionMatrix*viewMatrix*grassWorld;
}`;
    const fragmentShader=`
precision mediump float;
varying vec3 vGrassTint;
void main(){gl_FragColor=vec4(vGrassTint,1.0);}`;
    const material=new T.ShaderMaterial({uniforms:this.uniforms,vertexShader,fragmentShader,side:T.DoubleSide,transparent:false,depthWrite:true,depthTest:true});
    material.name='Animated grass shader';material.userData.shader=material;this.shader=material;
    return material;
  }
  createBounds(){
    const points=[];for(let i=0;i<96;i++){const a=i/96*Math.PI*2;points.push(new T.Vector3(Math.cos(a),.04,Math.sin(a)))}
    const line=new T.LineLoop(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0xffef65,depthTest:false}));line.name='Grass debug bounds';line.visible=!!this.config.showGrassBounds;line.renderOrder=20;this.scene.add(line);return line;
  }
  isExcluded(x,z){return this.exclusionZones.some(zone=>Math.hypot(x-zone.x,z-zone.z)<zone.radius)}
  setExclusionZones(zones=[]){this.exclusionZones=zones.slice();if(this.radius)this.rebuild()}
  countForRadius(radius){const base=radius>40?this.config.grassFinalDensity:this.config.grassDensity;return Math.max(0,Math.round(base*this.config.grassDensityMultiplier))}
  setArenaRadius(radius){if(this.radius===radius&&this.mesh)return;this.radius=radius;this.rebuild()}
  rebuild(){
    if(this.mesh){this.scene.remove(this.mesh);this.mesh.geometry.dispose()}
    if(!this.supported){this.mesh=null;return}
    const count=this.countForRadius(this.radius),geometry=this.createGeometry(),phases=new Float32Array(count),flexes=new Float32Array(count),tints=new Float32Array(count*3);
    const mesh=new T.InstancedMesh(geometry,this.material,count),dummy=new T.Object3D(),random=this.random(this.config.seed+(this.radius*997|0));
    mesh.name='Animated arena grass';mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=false;mesh.userData.grassSystem=true;
    const edgeStart=this.radius*.82;let placed=0,attempts=0;
    while(placed<count&&attempts<count*80){attempts++;const angle=random()*Math.PI*2,radius=Math.sqrt(random())*(this.radius-.65),x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;if(this.isExcluded(x,z))continue;
      const edge=1-Math.max(0,(radius-edgeStart)/(this.radius-edgeStart))*.68,density=this.densityAt(x,z,this.radius)*edge;if(random()>Math.min(1,density))continue;
      const scale=this.config.grassMinScale+random()*(this.config.grassMaxScale-this.config.grassMinScale),height=scale*(.82+random()*.38),width=scale*(.82+random()*.3);
      dummy.position.set(x,.025,z);dummy.rotation.set((random()-.5)*.08,random()*Math.PI*2,(random()-.5)*.08);dummy.scale.set(width,height,width);dummy.updateMatrix();mesh.setMatrixAt(placed,dummy.matrix);
      phases[placed]=random()*Math.PI*2;flexes[placed]=.68+random()*.58;
      const densityShade=this.densityAt(x,z,this.radius),color=this.config.showGrassDensity?new T.Color().setHSL(.33,1,.25+.25*densityShade):new T.Color([0x76c95a,0x82d463,0x91dc6c,0x6fbd55][Math.floor(random()*4)]);color.toArray(tints,placed*3);placed++;
    }
    geometry.setAttribute('grassPhase',new T.InstancedBufferAttribute(phases,1));geometry.setAttribute('grassFlex',new T.InstancedBufferAttribute(flexes,1));geometry.setAttribute('grassTint',new T.InstancedBufferAttribute(tints,3));mesh.instanceMatrix.setUsage(T.StaticDrawUsage);mesh.instanceMatrix.needsUpdate=true;
    this.mesh=mesh;this.scene.add(mesh);this.bounds.scale.set(this.radius,1,this.radius);this.bounds.visible=!!this.config.showGrassBounds;
  }
  setPlayerPosition(position){this.players=position?[position]:[]}
  setWind(direction,strength=1){if(direction){this.windDirection.set(direction.x,direction.z===undefined?direction.y:direction.z).normalize();this.uniforms.uWindDirection.value.copy(this.windDirection)}this.windStrength=strength}
  addImpact(position,radius=6,strength=1){if(!position)return;this.impacts.push({x:position.x,z:position.z,radius,strength,age:0,life:1.25});if(this.impacts.length>4)this.impacts.shift()}
  applyConfig(changes={}){Object.assign(this.config,changes);this.uniforms.uRenderDistance.value=this.config.grassRenderDistance;if(this.radius)this.rebuild()}
  update(dt,playerPositions){
    this.gustClock+=dt;const cycle=9.2,local=this.gustClock%cycle,gustEnvelope=local<this.gustDuration?Math.sin(local/this.gustDuration*Math.PI):0;
    this.time+=dt*this.config.grassWindSpeed*(1+gustEnvelope*.5);this.uniforms.uGrassTime.value=this.time;this.uniforms.uCameraXZ.value.set(cam.position.x,cam.position.z);
    const wind=this.config.disableGrassWind?0:this.config.grassWindStrength*this.windStrength;this.uniforms.uWindStrength.value=wind;
    if(local<dt){this.gustIndex++;const angle=this.gustIndex*2.399963;this.uniforms.uGust.value.set(Math.cos(angle),Math.sin(angle),0,-this.radius-12)}
    const gust=this.uniforms.uGust.value;if(!this.config.disableGrassWind&&local<this.gustDuration){const envelope=Math.sin(local/this.gustDuration*Math.PI);gust.z=envelope*.34*this.windStrength;gust.w=-this.radius-10+local/this.gustDuration*(this.radius*2+20)}else gust.z=0;
    const source=playerPositions||this.players,playerUniforms=this.uniforms.uPlayerData.value;let playerCount=0;
    if(!this.config.disableGrassInteraction&&source)for(const entry of source){if(playerCount===4)break;if(entry&&entry.hp!==undefined&&entry.hp<=0)continue;const position=entry&&entry.pos!==undefined?entry.pos:entry;if(!position)continue;const x=position.x!==undefined?position.x:position[0],z=position.z!==undefined?position.z:position[2];if(x===undefined||z===undefined)continue;playerUniforms[playerCount++].set(x,z,this.config.grassInteractionRadius,1.05)}
    this.uniforms.uPlayerCount.value=playerCount;
    for(let i=this.impacts.length-1;i>=0;i--){const impact=this.impacts[i];impact.age+=dt;if(impact.age>=impact.life)this.impacts.splice(i,1)}
    const impactUniforms=this.uniforms.uImpactData.value;let impactCount=0;if(!this.config.disableGrassInteraction)for(const impact of this.impacts){const fade=1-impact.age/impact.life;impactUniforms[impactCount++].set(impact.x,impact.z,impact.radius,impact.strength*fade*fade);if(impactCount===4)break}this.uniforms.uImpactCount.value=impactCount;
  }
}

const grassSystem=new GrassSystem(scene,groundTexture);grassSystem.setArenaRadius(32);
