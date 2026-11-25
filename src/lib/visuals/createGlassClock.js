import * as THREE from 'three';

/**
 * THE SOUND OF MY YEARS / World 01 / Memory Glass Timepiece
 * Twelve sculpted, data-scaled pieces of optical glass.
 * Data and accessible hit targets stay in RhythmWorld.svelte.
 * 12/3/6/9 dial: AM uses hours 00-11; PM uses hours 12-23.
 */
const COUNT = 12;
const RADIUS = 2.42;
const FULL_LENGTH = 2.18;
const MIN_LENGTH = 0.18;
const COLORS = ['#55316e', '#8260b4', '#b88cdd', '#ebacd5', '#ffcf9e'];
const clamp = (v, a=0, b=1) => Math.min(b, Math.max(a, v));
const easing = (rate, dt) => 1 - Math.exp(-rate * dt);

function tone(value, maxValue) {
  // A GLOBAL scale shared by all weekdays; never rescale each view independently.
  const t = clamp(maxValue > 0 ? value / maxValue : 0);
  const x = t * (COLORS.length - 1);
  const k = Math.min(COLORS.length - 2, Math.floor(x));
  return new THREE.Color(COLORS[k]).lerp(new THREE.Color(COLORS[k+1]), x-k);
}

// Fully closed, curved glass geometry, not a straight cylinder with sphere caps.
// Its reflective waves wrap around an elliptical cross-section.
function sculptedGlass(width = 0.19, depth = 0.19, seed = 0) {
  const LONG = 38, SIDE = 20;
  const vertices = [], normals = [], uv = [], indices = [];
  for(let i=0;i<=LONG;i++) {
    const t=i/LONG;
    const bulge = Math.pow(Math.sin(Math.PI * t), 0.62);
    const tip = .15 + .85*bulge;
    const flutter = .12*Math.sin(t*6.5+seed)*bulge;
    const twist = t*.64 + seed*.18;
    const spineX = .10*Math.sin(t*4.0 + seed)*bulge;
    const spineZ = .12*Math.sin(Math.PI*t)+.055*Math.sin(t*7+seed)*bulge;
    for(let j=0;j<=SIDE;j++) {
      const a=2*Math.PI*j/SIDE;
      const ca=Math.cos(a+twist), sa=Math.sin(a+twist);
      const thickness=1 + flutter*.45 + .12*Math.cos(3*a+7*t+seed);
      vertices.push(spineX+width*tip*ca*thickness, t, spineZ+depth*tip*sa*thickness);
      uv.push(t, j/SIDE);
    }
  }
  for(let i=0;i<LONG;i++) for(let j=0;j<SIDE;j++) {
    const a=i*(SIDE+1)+j, b=a+(SIDE+1);
    indices.push(a,b,a+1, b,b+1,a+1);
  }
  const n0=vertices.length/3;
  vertices.push(0,0,0); uv.push(0,.5);
  const n1=vertices.length/3;
  vertices.push(0,1,0); uv.push(1,.5);
  for(let j=0;j<SIDE;j++) {
    indices.push(n0,j+1,j);
    const end=LONG*(SIDE+1);
    indices.push(n1,end+j,end+j+1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeStudioEnvironment(renderer) {
  const envScene=new THREE.Scene();
  envScene.background=new THREE.Color('#11071f');
  const panel=(color, position, sx, sy, rotY=0, rotX=0)=>{
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(sx,sy),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
    mesh.position.set(...position); mesh.rotation.y=rotY; mesh.rotation.x=rotX;
    envScene.add(mesh); return mesh;
  };
  // Long, narrow, high-contrast luminous studio reflection panels.
  panel('#faf0ff',[-5,2,4],.8,10,.55);
  panel('#f7a0d8',[5,1,3],1.15,10,-.7);
  panel('#8d85ff',[-2,-5,6],10,.65,0,-.15);
  panel('#ffbd87',[2,5,3],7,.55,0,.25);
  panel('#8ca9ff',[0,1,-7],8,8,0);
  const pmrem=new THREE.PMREMGenerator(renderer);
  const target=pmrem.fromScene(envScene,0.045);
  pmrem.dispose();
  envScene.traverse((obj)=>{obj.geometry?.dispose();obj.material?.dispose();});
  return target;
}

// Edge light with angle-dependent pearlescent colour; deliberately distinct from the
// physical glass layer, because plain MeshPhysicalMaterial looked flat in the earlier pass.
function edgeSheen(seed) {
  const mat=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.FrontSide,
    blending:THREE.AdditiveBlending,
    uniforms:{uTime:{value:0},uFocus:{value:0},uIntensity:{value:1},uSeed:{value:seed}},
    vertexShader:`
      varying vec3 vNormal; varying vec3 vView; varying vec2 vUv;
      void main(){
        vec4 world=modelMatrix*vec4(position,1.);
        vNormal=normalize(mat3(modelMatrix)*normal);
        vView=normalize(cameraPosition-world.xyz);
        vUv=uv;
        gl_Position=projectionMatrix*viewMatrix*world;
      }`,
    fragmentShader:`
      uniform float uTime,uFocus,uIntensity,uSeed;
      varying vec3 vNormal; varying vec3 vView; varying vec2 vUv;
      void main(){
        float f=pow(1.-clamp(abs(dot(normalize(vNormal),normalize(vView))),0.,1.),2.35);
        float ribbon=pow(max(0.,sin(vUv.x*16.+vUv.y*4.+uSeed+uTime*.27)),15.);
        float soft=pow(max(0.,sin(vUv.x*5.8+uSeed+uTime*.17)),5.);
        vec3 lilac=vec3(.53,.37,1.);
        vec3 peach=vec3(1.,.55,.34);
        vec3 ice=vec3(.58,.90,1.);
        float hue=.5+.5*sin(vUv.y*6.283+vUv.x*4.6+uSeed);
        vec3 color=mix(lilac,peach,hue);
        color=mix(color,ice,.28+.18*sin(uTime*.14));
        float alpha=(.25*f+.15*ribbon+.12*soft)*uIntensity*(1.+uFocus*.6);
        gl_FragColor=vec4(color,clamp(alpha,0.,.47));
      }`
  });
  return mat;
}

export function createGlassClock(mount, {reducedMotion=false}={}) {
  if(!mount) throw new Error('Clock mount element is missing');
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.12;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
  renderer.domElement.className='memory-glass-renderer';
  renderer.domElement.setAttribute('aria-hidden','true');
  mount.appendChild(renderer.domElement);

  const scene=new THREE.Scene();
  // Perspective + gently oblique lighting reveals thickness without skewing the clock.
  const camera=new THREE.PerspectiveCamera(37,1,0.1,100);
  camera.position.set(0,1.05,17.4);
  camera.lookAt(0,0,0);
  const environment=makeStudioEnvironment(renderer);
  scene.environment=environment.texture;

  const ambient=new THREE.AmbientLight('#e5c7ff',.38);scene.add(ambient);
  const pink=new THREE.PointLight('#ff9db7',72,24,1.4);pink.position.set(-6,2.4,7.5);scene.add(pink);
  const blue=new THREE.PointLight('#839cff',48,24,1.4);blue.position.set(6,1.2,6);scene.add(blue);
  const amber=new THREE.PointLight('#ffc38d',32,24,1.6);amber.position.set(1,-5,6);scene.add(amber);

  const assembly=new THREE.Group();scene.add(assembly);
  const backing=new THREE.Mesh(
    new THREE.CircleGeometry(2.46,120),
    new THREE.MeshBasicMaterial({color:'#110720',transparent:true,opacity:.65,depthWrite:false})
  );backing.position.z=-.38;assembly.add(backing);
  const rimMat=new THREE.MeshPhysicalMaterial({color:'#b3a3eb',metalness:.34,roughness:.13,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:2.1});
  const innerRim=new THREE.Mesh(new THREE.TorusGeometry(2.51,.026,14,220),rimMat);
  innerRim.position.z=.14;assembly.add(innerRim);
  const outerRim=new THREE.Mesh(new THREE.TorusGeometry(5.06,.016,12,230),rimMat);
  outerRim.position.z=-.55;assembly.add(outerRim);
  const orbitMat=new THREE.MeshBasicMaterial({color:'#e9b9ed',transparent:true,opacity:.16,depthWrite:false});
  for(const rr of [2.65,4.85]){
    const line=new THREE.Mesh(new THREE.TorusGeometry(rr,.006,8,220),orbitMat);
    line.position.z=-.26;assembly.add(line);
  }

  const blades=[];
  for(let i=0;i<COUNT;i++) {
    const stem=new THREE.Group();stem.rotation.z=-i*Math.PI/6;assembly.add(stem);
    const geometry=sculptedGlass(.205,.16,i*.31);
    const glowGeometry=sculptedGlass(.125,.085,i*.31);
    const tintMat=new THREE.MeshPhysicalMaterial({
      color:'#a988d5',metalness:0,roughness:.18,clearcoat:1,clearcoatRoughness:.035,
      envMapIntensity:1.15,emissive:'#432661',emissiveIntensity:.18,
      transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide
    });
    const core=new THREE.Mesh(glowGeometry,tintMat);
    core.scale.set(1,1,1);core.position.y=RADIUS;core.position.z=-.045;
    stem.add(core);
    const glassMat=new THREE.MeshPhysicalMaterial({
      color:'#f2e0ff',roughness:.055,metalness:0,transmission:.92,
      thickness:.55,ior:1.46,iridescence:.6,iridescenceIOR:1.22,
      iridescenceThicknessRange:[130,510],clearcoat:1,clearcoatRoughness:.035,
      envMapIntensity:3.0,attenuationColor:'#da98de',attenuationDistance:2.8,
      // NO transparent:true/opacity<1: transmission handles refraction itself.
      transparent:false,opacity:1,side:THREE.DoubleSide
    });
    const glass=new THREE.Mesh(geometry,glassMat);
    glass.position.y=RADIUS;glass.position.z=.08;stem.add(glass);
    const sheenMat=edgeSheen(i*.31);
    const sheen=new THREE.Mesh(geometry,sheenMat);
    sheen.position.copy(glass.position);sheen.scale.z=1.012;
    stem.add(sheen);
    // The submerged track remains quiet and materially related to the main structure.
    const trackMat=new THREE.MeshBasicMaterial({color:'#a36dc4',transparent:true,opacity:.075,depthWrite:false});
    const track=new THREE.Mesh(new THREE.CapsuleGeometry(.095,FULL_LENGTH-.19,5,14),trackMat);
    track.position.y=RADIUS+FULL_LENGTH*.5;track.position.z=-.22;
    stem.add(track);
    blades.push({stem,core,glass,sheen,sheenMat,tintMat,glassMat,track,trackMat,
      current:.03,target:.03,value:0,selected:false,color:tone(0,1)});
  }

  let raf=0,last=0,focus=-1,visible=true,dead=false;
  let pointerX=0,pointerY=0;
  let t=0;
  function setData(values=[], max=1) {
    for(let i=0;i<COUNT;i++) {
      const v=Math.max(0,Number(values[i])||0);
      const b=blades[i];
      b.value=v;b.target=v<.02?0:Math.max(MIN_LENGTH,FULL_LENGTH*Math.sqrt(v/Math.max(1,max)));
      b.color=tone(v,max);
      if(reducedMotion)b.current=b.target;
    }
    if(reducedMotion)paint(0,true);
  }
  function setFocus(next=-1) {focus=Number.isInteger(next)&&next>=0&&next<COUNT?next:-1;if(reducedMotion)paint(0,true);}
  function setPointer(x=0,y=0) {pointerX=clamp(x,-1,1);pointerY=clamp(y,-1,1);}
  function paint(dt,instant=false) {
    if(dead)return;
    t+=dt;
    const smooth=instant?1:easing(5.6,dt);
    for(let i=0;i<COUNT;i++){
      const b=blades[i];
      b.current+=(b.target-b.current)*smooth;
      const hasData=b.value>.02;
      b.glass.visible=b.core.visible=b.sheen.visible=hasData;
      const length=Math.max(.03,b.current);
      // Geometry is 1 unit tall. Only radial extension encodes data length.
      b.glass.scale.y=b.core.scale.y=b.sheen.scale.y=length;
      b.tintMat.color.copy(b.color).lerp(new THREE.Color('#150927'),.38);
      b.tintMat.emissive.copy(b.color);
      const highlighted=focus===i;
      const dimmed=focus>=0&&!highlighted;
      b.tintMat.emissiveIntensity=highlighted?.6:.22;
      b.tintMat.opacity=dimmed?.35:.86;
      b.glassMat.attenuationColor.copy(b.color).lerp(new THREE.Color('#f3c9e6'),.45);
      b.glassMat.envMapIntensity=highlighted?4.2:2.9;
      b.trackMat.opacity=highlighted?.16:.065;
      b.sheenMat.uniforms.uIntensity.value=dimmed?.22:highlighted?1.65:1.0;
      b.sheenMat.uniforms.uFocus.value=highlighted?1:0;
      b.sheenMat.uniforms.uTime.value=t;
      b.stem.position.z=highlighted?.13:0;
    }
    if(!reducedMotion){
      // A near-static, sculptural breathing movement; never spin the clock markings.
      assembly.rotation.x+= ((pointerY*.045)-assembly.rotation.x)*easing(2.5,dt);
      assembly.rotation.y+= ((pointerX*.06)-assembly.rotation.y)*easing(2.5,dt);
      pink.position.x=-6+Math.sin(t*.24)*1.8;
      blue.position.y=1.2+Math.cos(t*.17)*1.2;
    }
    renderer.render(scene,camera);
  }
  function animate(now){if(dead)return;const dt=Math.min(.06,last?(now-last)*.001:.016);last=now;if(visible)paint(dt);raf=requestAnimationFrame(animate);}
  function resize(){if(dead)return;const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();paint(0,true);}
  const observer=new ResizeObserver(resize);observer.observe(mount);resize();
  if(!reducedMotion)raf=requestAnimationFrame(animate);
  function setVisible(v){visible=!!v;if(visible&&reducedMotion)paint(0,true);}
  function destroy(){dead=true;cancelAnimationFrame(raf);observer.disconnect();const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());environment.dispose();renderer.dispose();renderer.domElement.remove();}
  return {setData,setFocus,setPointer,setVisible,destroy};
}