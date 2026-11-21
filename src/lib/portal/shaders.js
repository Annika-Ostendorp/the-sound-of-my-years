// Claude prototype shader with a small, isolated idle-motion addition.
// The original tunnel algorithm is preserved. The new movement only affects
// the visible outer capsule while p is near zero; no 3D mesh is introduced.
// Restore the original from prototypes/liquid-glass-original.html if needed.
export const vertexShader = `varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}`;
export const fragmentShader = `precision highp float;varying vec2 v;uniform sampler2D t1,t2;uniform float asp,p,time,a1,a2;
const vec2 C=vec2(.494,.498);
vec2 rot(vec2 q,float a){float c=cos(a),s=sin(a);return vec2(c*q.x-s*q.y,s*q.x+c*q.y);}
vec3 lay(vec2 q,float sc,vec2 off,out float m){
 vec2 sz=vec2(a2*max(1.,asp/a2),max(1.,asp/a2));
 vec2 u=.5+(q-off)/(sz*sc);
 float d=length((u-.5)*vec2(a2,1.));
 m=smoothstep(.05,.36,d);
 return texture2D(t2,u).rgb;}
vec3 pf(vec2 q0,float Z){vec2 sz1=vec2(.95*a1,.95);vec2 o=(.5-C)*sz1;vec2 u=C+(q0+o/Z)/(sz1*Z);return (u.x>0.&&u.x<1.&&u.y>0.&&u.y<1.)?texture2D(t1,u).rgb:vec3(0.);}
void main(){
 vec2 q0=(v-.5)*vec2(asp,1.);
 float e=clamp(p/.36,0.,1.);float ee=e*e*e*(e*(e*6.-15.)+10.);
 float pk=sin(3.14159*ee);
 vec2 q=q0*mix(2.4,1.,ee);
 float tw=1.;
 float pn=max(0.,p-.1)/.9;
 float ph=(pn+pn*pn*.9)*6.5+time*.04;
 float f=fract(ph);
 float K=1.7;
 float S0=1.3*exp(f*log(K));
 vec2 qt=rot(q,sin(time*.12+ph*.4)*.08);
 vec2 w=vec2(sin(time*.23+ph*.8),cos(time*.19+ph*.6))*.035;
 float m0,m1,m2,m3,m4;
 vec3 c4=lay(qt,S0/(K*K*K*K),w*(4.-f)*.45,m4);
 vec3 c3=lay(qt,S0/(K*K*K),w*(3.-f)*.45,m3);
 vec3 c2=lay(qt,S0/(K*K),w*(2.-f)*.45,m2);
 vec3 c1=lay(qt,S0/K,w*(1.-f)*.45,m1);
 vec3 c0=lay(qt,S0,w*(-f)*.45,m0);
 c4=mix(c3,c4,smoothstep(0.,.6,f));
 m0*=1.-smoothstep(.6,1.,f);
 vec3 tun=mix(c4,c3,m3);tun=mix(tun,c2,m2);tun=mix(tun,c1,m1);tun=mix(tun,c0,m0);
 tun*=mix(.78,1.,smoothstep(.0,.35,length(q)));
 float g=smoothstep(.68,1.,p);
 float glow=smoothstep(.12+g*1.8,.0,length(q))*g;
 float an=atan(q.y,q.x);
 float st=pow(.5+.5*sin(an*36.+time*2.),6.)*g*smoothstep(1.2,.1,length(q));
 tun+=vec3(1.,.85,.6)*st*.6;
 tun=mix(tun,vec3(1.,.96,.9),clamp(glow*1.5,0.,1.));
 float len=length(q0);
 float Z=exp(ee*log(14.));
 vec2 qp=rot(q0,ee*ee*2.4*exp(-len*2.2));
 // Subtle living-liquid distortion of the OUTER capsule, even at p=0.
 // It fades out before the original tunnel takes over (p >= .22).
 float idle=1.-smoothstep(.015,.22,p);
 float radius=max(length(qp),.0001);
 float angle=atan(qp.y,qp.x);
 float swirl=idle*(.016*sin(time*.42+radius*9.)+.006*sin(5.*angle-time*.23));
 qp=rot(qp,swirl);
 vec2 outward=qp/radius;
 vec2 tangent=vec2(-outward.y,outward.x);
 float surfaceFlow=sin(angle*5.+radius*13.-time*.58);
 float surfaceBreath=sin(angle*3.-radius*15.+time*.43);
 qp+=idle*(tangent*.007*surfaceFlow+outward*.009*surfaceBreath);
 qp*=1.+idle*.010*sin(time*.54);
 float bl=pk*.12+ee*.04,ca=pk*.03;
 vec3 pt=vec3(0.);
 for(int i=0;i<6;i++){float k=float(i)/5.;float zz=Z*(1.+bl*k);
  pt.r+=pf(qp,zz*(1.+ca)).r;pt.g+=pf(qp,zz).g;pt.b+=pf(qp,zz*(1.-ca)).b;}
 pt=pt/6.*(1.+pk*.4);
 float rv=smoothstep(0.,.5,(ee-.32)*2.4-len*1.0);
 vec3 col=mix(pt,tun,rv);
 col+=vec3(1.,.78,.55)*rv*(1.-rv)*1.3;
 col*=1.-pk*.35*smoothstep(.3,1.1,len);
 gl_FragColor=vec4(col,1.);}`;
