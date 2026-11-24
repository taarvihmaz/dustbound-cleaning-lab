/* The field guide and game use the same location, fixtures and character selection. */
(function (root) {
  "use strict";
  const designs = root.Locations.designs;
  const characters = [
    {name:"Pip", kind:"Survey rover", body:"#e8884b"},
    {name:"Juniper", kind:"Courier fox", body:"#c87242"},
    {name:"Rivet", kind:"Clockwork beetle", body:"#69a899"},
    {name:"Tiller", kind:"Brush turtle", body:"#adc176"},
    {name:"Mote", kind:"Lantern drone", body:"#e9bf65"},
    {name:"Moss", kind:"Pond walker", body:"#9db17c"},
    {name:"Cinder", kind:"Track sweeper", body:"#b391b7"},
    {name:"Kite", kind:"Survey glider", body:"#76a7bd"}
  ];
  const memory = new WeakMap();
  const PI = Math.PI, TAU = 2 * PI;
  const mix = (a,b,t) => a+(b-a)*t;
  const bound = (x,min,max) => Math.max(min, Math.min(max,x));
  function ink(a,b,t) {
    const n=parseInt(a.slice(1),16), m=parseInt(b.slice(1),16);
    const v = shift => Math.round(mix(n >> shift & 255,m >> shift & 255,t));
    return "rgb(" + [v(16),v(8),v(0)].join(",") + ")";
  }
  function noise(seed) {
    let z = seed | 0;
    return () => {
      z = z + 0x6d2b79f5 | 0;
      let h = Math.imul(z ^ z >>> 15, 1 | z);
      h ^= h + Math.imul(h ^ h >>> 7, 61 | h);
      return ((h ^ h >>> 14) >>> 0) / 4294967296;
    };
  }
  const stage = (w,h) => { const c=document.createElement("canvas"); c.width=w; c.height=h; return c; };
  function poly(g,points,fill,stroke,width=1) {
    g.beginPath(); g.moveTo(points[0],points[1]);
    for(let i=2;i<points.length;i+=2) g.lineTo(points[i],points[i+1]);
    if (fill) { g.closePath(); g.fillStyle=fill; g.fill(); }
    if (stroke) { g.strokeStyle=stroke; g.lineWidth=width; g.stroke(); }
  }
  function oval(g,x,y,rx,ry,col) {
    g.fillStyle=col; g.beginPath(); g.ellipse(x,y,Math.max(.001,rx),Math.max(.001,ry),0,0,TAU);g.fill();
  }
  function rect(g,x,y,w,h,col) {g.fillStyle=col;g.fillRect(x,y,w,h);}
  function line(g,x,y,xx,yy,col,width) {poly(g,[x,y,xx,yy],null,col,width);}
  function grad(g,x,y,x2,y2,...colors) {
    const v=g.createLinearGradient(x,y,x2,y2); colors.forEach((c,i)=>v.addColorStop(i/(colors.length-1),c)); return v;
  }
  function ambient(g,d,w,h,t) {
    const r=noise(d.id*17+151); const count=d.air==="rain"?28:14;
    g.save();
    for(let i=0;i<count;i++) {
      let x=r()*w, y=r()*h; const k=.5+r();
      x=(w+x+t*.008*k)%w;y=(y+t*(d.air==="snow"?.017:d.air==="rain"?.105:.002)*k)%h;
      if(d.air==="rain") {line(g,x,y,x-2,y+7,"rgba(238,244,231,.4)",1);continue;}
      const luminous=["spores","fireflies","stars"].includes(d.air);
      const a=.22+.32*(.5+.5*Math.sin(t*.0015+i*2.37));
      g.globalAlpha=a;
      if(d.air==="leaves") {poly(g,[x,y,x+3.1,y-1,x+1.1,y+1.2],d.colors[5]);}
      else {oval(g,x,y,luminous?1.6:1.3,luminous?1.6:.8,d.air==="snow"?"#ffffff":d.colors[5]);}
    }
    g.restore();
  }
  function landscapeRidge(g,d,w,h,depth,r) {
    const [sky,far,near,floor,dark,light]=d.colors;
    const color=depth ? near : far, baseline=h*(depth?.58:.51), amp=h*(depth?.17:.24);
    const step=w/(depth?11:15);
    let points=[-step,h]; let y=baseline, phase=r()*5;
    for(let i=-1;i<=Math.ceil(w/step)+1;i++){
      const x=i*step; const roll=.2+.8*r();
      const next=baseline-amp*(.22+.23*Math.sin(i*.75+phase)+.45*roll);
      switch(d.horizon){
        case "mesa": points.push(x,y,x+step*.08,next,x+step*.68,next,x+step*.9,next+amp*.32);break;
        case "city": {const high=baseline-amp*roll;points.push(x,y,x,high,x+step*.35,high,x+step*.35,high+amp*.3,x+step*.7,high+amp*.3,x+step*.7,next);break;}
        case "peaks": case "ice": points.push(x,next+amp*.30,x+step*.66,next-amp*.20);break;
        case "spires": points.push(x,next+amp*.42,x+step*.23,next+.02*amp,x+step*.32,next-.29*amp,x+step*.51,next+.24*amp);break;
        case "forest": for(let j=0;j<5;j++){const px=x+step*j/5;points.push(px,next+amp*.19,px+step*.09,next-amp*r()*.32);}break;
        case "coast":case "marsh":points.push(x,next*.2+baseline*.8,x+step*.5,next*.45+baseline*.55);break;
        default: for(let j=0;j<4;j++){ const f=j/4;points.push(x+f*step,mix(y,next,(1-Math.cos(f*PI))*.5));}break;
      }
      y=next;
    }
    points.push(w+step,h);
    poly(g,points,d.mode===2?grad(g,0,baseline-amp,0,h,color,depth?floor:near):color);
    if(d.mode===0||d.mode===3) {
      g.save();g.clip();
      for(let i=0;i<w/8;i++){let x=r()*w, yy=baseline-r()*amp;line(g,x,yy,x+2+r()*15,yy+(d.horizon==="peaks"?-5:0),"rgba(245,225,178,.25)",1);}
      g.restore();
    }
    if(!depth && ["peaks","ice"].includes(d.horizon)) {
      for(let i=2;i<points.length-4;i+=4) {
        const px=points[i+2],py=points[i+3];
        poly(g,[px-step*.13,py+amp*.14,px,py,px+step*.13,py+amp*.16,px+step*.025,py+amp*.08],ink(light,far,.25));
      }
    }
  }
  // Offset front and side faces give every structure a consistent light source.
  function box(g,x,y,w,h,depth,top,front,side) {
    rect(g,x,y-h,w,h,front);
    poly(g,[x,y-h,x+depth,y-h-depth*.48,x+w+depth,y-h-depth*.48,x+w,y-h],top);
    poly(g,[x+w,y-h,x+w+depth,y-h-depth*.48,x+w+depth,y-depth*.48,x+w,y],side);
  }
  function sprite(g,index,x,y,s,anim,face=1) {
    const c=characters[index%characters.length];const outline="#333d39", cream="#f4e5b9", metal="#889c90",rubber="#4e5951";
    g.save();g.translate(x,y);g.scale(s*face,s);g.lineCap="round";g.lineJoin="round";
    oval(g,2,12,28,6,"rgba(41,46,36,.24)");
    const beat=Math.sin(anim);
    g.translate(0,-Math.abs(beat)*1.15);
    if(index===0) {
      // Rounded pressure vessel, two ribbed tracks and the twin-lens rangefinder.
      for(const [xx,yy] of [[-11,8],[9,11]]) {
        oval(g,xx,yy,18,7,outline);rect(g,xx-11,yy-5,22,10,rubber);
        for(let a=-9;a<=11;a+=5)line(g,xx+a,yy+1,xx+a-2,yy+4,metal,1.8);
      }
      poly(g,[-30,-5,-22,-15,10,-18,26,-10,29,1,17,8,-15,7,-27,2],c.body,outline,2);
      poly(g,[-26,-9,-17,-16,8,-18,18,-13,6,-8,-16,-7],cream);
      poly(g,[10,-7,24,-10,28,-2,26,1,11,5],ink(c.body,outline,.25));
      rect(g,-16,-9,9,3,outline);line(g,-17,-6,-11,-6,cream,1.4);
      poly(g,[-9,-17,-5,-30,10,-31,16,-24,15,-16],cream,outline,2);
      poly(g,[-2,-25,13,-27,15,-20,0,-17],outline);
      oval(g,3,-22,1.8,2,"#b6dfc5");oval(g,10,-23,1.8,2,"#b6dfc5");
      line(g,-11,-14,-15,-33,outline,2.2);oval(g,-15,-34,2.7,2.7,c.body);
      line(g,17,4,25,8,outline,1.6);line(g,19,4,29,6,outline,1.6);
    } else if(index===1||index===5) {
      const fox=index===1;
      for(const [xx,phase] of [[-10,1],[8,-1]]){poly(g,[xx-4,2,xx+5,2,xx+5+beat*phase*2,11,xx+1,13,xx-4,11],outline);}
      if(fox) {
        poly(g,[-9,-7,-21,-12,-31,-7,-27,1,-16,5,-8,3],c.body,outline,2);poly(g,[-25,-10,-31,-7,-27,1,-23,2,-21,-3],cream);
        oval(g,0,-3,14,12,c.body);poly(g,[-10,-9,-13,-25,-1,-20,9,-22,17,-30,17,-16,24,-9,14,-3,0,-4],c.body,outline,2);
        poly(g,[1,-10,9,-13,16,-10,23,-10,14,-4,4,-4],cream);oval(g,23,-10,2.4,2,outline);oval(g,11,-15,1.8,2,outline);
        box(g,-16,-3,10,11,3,"#89a99d","#627b6c",outline);
      } else {
        oval(g,-1,-3,18,13,c.body);oval(g,7,-14,17,11,c.body);oval(g,2,-23,6,6.5,c.body);oval(g,16,-23,6,6.5,c.body);
        oval(g,3,-23,2.2,3,outline);oval(g,17,-23,2.2,3,outline);line(g,9,-9,19,-11,outline,1.6);
        poly(g,[-23,7,-14,-1,-6,5,-13,11,-21,11],c.body,outline,1.5);
      }
    } else if(index===2||index===3) {
      for(let i=-2;i<=2;i++){const xx=i*7;poly(g,[xx-2,1,xx-6,7+beat*(i%2),xx-11,9+beat*(i%2)],null,outline,3);}
      oval(g,14,-2,10,8,c.body);oval(g,19,-4,2,2,outline);
      if(index===2){
        oval(g,-5,-4,20,13,outline);oval(g,-6,-7,18,12,c.body);poly(g,[-17,-8,-10,-15,-1,-17,-7,-6],cream);
        line(g,-21,-6,10,-8,outline,1.8);line(g,18,-6,25,-14,outline,1.5);line(g,19,-4,28,-8,outline,1.5);
      }else{
        oval(g,-5,-5,19,12,"#506b52");poly(g,[-23,-7,-14,-18,0,-21,12,-14,13,-5,3,-1,-15,-1],c.body,outline,2);
        poly(g,[-11,-12,-4,-17,3,-14,4,-7,-5,-5],null,"#617553",2);line(g,-13,5,-20,11,outline,4);
      }
    } else if(index===4||index===7) {
      const hover=2+Math.sin(anim)*1.7;g.translate(0,-hover);
      if(index===4){
        for(const xx of [-18,18]){line(g,xx*.5,-13,xx,-18,outline,2);oval(g,xx,-19,10,1.7,metal);oval(g,xx,-19,2,3,outline);}
        poly(g,[-11,-15,-6,-21,7,-21,13,-14,11,-2,3,3,-6,1,-11,-5],c.body,outline,2);
        rect(g,-6,-14,16,5,outline);rect(g,2,-13,5,2,cream);line(g,-6,2,-8,6,outline,2);line(g,6,2,8,6,outline,2);
      }else{
        poly(g,[-26,-4,4,-13,27,-11,8,1,-2,1,-13,8,-19,7,-10,-2],c.body,outline,2);
        poly(g,[-17,-7,-20,-16,-2,-11,2,-9],cream,outline,1.6);poly(g,[0,-10,11,-13,19,-11,8,-8],outline);line(g,-22,-3,-29,-3,cream,2);
      }
    }else{
      oval(g,-1,7,23,7,outline);for(let i=-14;i<17;i+=8)oval(g,i,8,2.7,3,metal);
      box(g,-18,3,34,14,5,cream,c.body,outline);box(g,-11,-12,15,10,5,metal,c.body,outline);rect(g,-7,-21,7,4,cream);
      line(g,15,3,27,8,outline,2);line(g,14,4,26,11,outline,2);line(g,12,5,23,13,outline,2);
    }
    g.restore();
  }

  function fixture(g,d,x,y,scale,index,variant=0) {
    const spec=d.fixtures[index % d.fixtures.length];
    root.LocationProps.draw(g,spec,x,y,scale,d,variant);
  }

  function interiorBackdrop(g,d,w,h,preview) {
    const [sky,far,near,floor,dark,light]=d.colors;
    const random=noise(d.id+379);
    const horizon=h*(preview ? .60 : .34);
    const wall=ink(far,light,.42);
    rect(g,0,0,w,horizon,grad(g,0,0,w,horizon,wall,ink(far,near,.66)));
    rect(g,0,horizon,w,h-horizon,grad(g,0,horizon,0,h,ink(near,floor,.38),floor,ink(floor,dark,.2)));
    const spacing=w/(3+d.id%4), sill=horizon*(.60+random()*.13);
    if(d.region==="industrial"){
      for(let x=-spacing;x<w+spacing;x+=spacing){
        poly(g,[x,0,x+spacing*.12,0,x+spacing*.13,horizon,x,horizon],near);
        line(g,x,0,x+spacing,sill,ink(near,dark,.35),Math.max(1,w*.008));
        line(g,x,sill,x+spacing,0,ink(near,dark,.35),Math.max(1,w*.008));
        rect(g,x+spacing*.18,horizon*.18,spacing*.62,horizon*.35,ink(sky,light,.6));
        line(g,x+spacing*.5,horizon*.18,x+spacing*.5,horizon*.53,near,1.5);
      }
    }else{
      for(let x=-spacing*.4;x<w;x+=spacing){
        const wx=x+spacing*.23, ww=spacing*.55, top=horizon*.15;
        rect(g,wx-3,top-3,ww+6,sill-top+7,ink(near,dark,.33));
        rect(g,wx,top,ww,sill-top,grad(g,0,top,0,sill,sky,light));
        line(g,wx+ww*.52,top,wx+ww*.52,sill,near,2);
        line(g,wx,(sill+top)*.52,wx+ww,(sill+top)*.52,near,1.4);
        rect(g,wx-5,sill,ww+10,3.3,light);
        poly(g,[wx,sill+1,wx+ww,sill+1,wx+ww*.2,horizon+h*.20,wx-ww*.5,horizon+h*.20],"rgba(252,234,179,.15)");
      }
    }
    // The far wall changes with the building. These structures use the same
    // camera horizon as the fixture sprites on the playable floor.
    const shadow=ink(near,dark,.48),trim=ink(far,light,.54);
    if(d.category==="cave"){
      rect(g,0,0,w,horizon,grad(g,0,0,0,horizon,dark,near,far));
      for(let i=0;i<6;i++){
        const left=i*w/5-w*.11,hh=horizon*(.36+random()*.45);
        poly(g,[left,0,left+w*.19,0,left+w*.14,hh*.31,left+w*.10,hh,left+w*.065,hh*.50],
          i%2?shadow:near);
      }
      const cx=w*(.50+random()*.12);
      g.fillStyle=dark;g.beginPath();g.arc(cx,horizon,horizon*.65,Math.PI,Math.PI*2);g.fill();
      poly(g,[cx-horizon*.42,horizon,cx-horizon*.34,horizon*.59,cx-horizon*.08,horizon*.49,
        cx+horizon*.18,horizon*.57,cx+horizon*.30,horizon],shadow);
      line(g,0,horizon*.28,w,horizon*.18,shadow,2);
      for(let i=0;i<4;i++){const x=w*(.12+i*.25);line(g,x,horizon*.25,x,horizon*.41,dark,1.6);
        oval(g,x,horizon*.42,w*.011,w*.009,"#f2d487");}
    }else if(d.category==="stacks"||d.category==="shop"){
      const count=d.category==="stacks"?4:3;
      for(let bay=0;bay<count;bay++){
        const x=w*(.025+bay/count), y=horizon*.21,bw=w*(.75/count),bh=horizon*.74;
        rect(g,x,y,bw,bh,shadow);rect(g,x+2,y+2,bw-4,bh-4,near);
        for(let shelf=0;shelf<3;shelf++){
          const baseline=y+bh*(.31+shelf*.32);
          let cursor=x+bw*.06;
          while(cursor<x+bw*.88){
            const bw2=bw*(.035+.055*random()),bh2=bh*(.10+.16*random());
            rect(g,cursor,baseline-bh2,bw2,bh2,[far,trim,floor,dark][Math.floor(random()*4)]);
            cursor+=bw2+bw*.012;
          }
          rect(g,x,baseline,bw,Math.max(1,bh*.022),trim);
        }
      }
    }else if(d.category==="glass"){
      for(let i=-4;i<11;i++)line(g,w*.5,-horizon*.52,i*w*.12,horizon,trim,2);
      line(g,0,horizon*.51,w,horizon*.51,trim,2.3);
      for(let i=0;i<13;i++){
        const x=i*w/12,y=horizon*(.85+random()*.13);
        for(let j=-2;j<=2;j++){
          const height=horizon*(.12+random()*.22);
          poly(g,[x,y,x+j*w*.012-w*.008,y-height*.7,x+j*w*.023,y-height,x+j*w*.012,y-height*.42],near);
        }
      }
    }else if(d.category==="arena"||d.category==="lab"){
      for(let i=0;i<5;i++){
        const x=(i+.3)*w/5;
        rect(g,x,horizon*.10,w*.09,3,light);
        if(d.category==="lab"){
          box(g,x-w*.03,horizon,w*.15,horizon*.28,w*.012,trim,near,shadow);
          line(g,x,horizon*.75,x,horizon*.97,trim,1.4);
          rect(g,x+w*.075,horizon*.77,w*.016,2,dark);
        }else{
          for(let step=0;step<3;step++)
            rect(g,x-w*.09,horizon*(.68+step*.12),w*.19,horizon*.08,step%2?near:shadow);
        }
      }
    }else if(d.category==="foundry"){
      for(let i=0;i<3;i++){
        const x=w*(.14+i*.35),ht=horizon*(.35+.16*random());
        box(g,x-w*.055,horizon,w*.11,ht,w*.018,trim,near,shadow);
        rect(g,x-w*.035,horizon-ht*.55,w*.066,ht*.41,dark);
        rect(g,x-w*.027,horizon-ht*.28,w*.05,ht*.14,"#d39564");
      }
    }
    rect(g,0,horizon-3,w,4,ink(near,dark,.40));
    for(let i=-5;i<13;i++) line(g,w*.53,horizon,i*w*.15,h,ink(floor,near,.40),.55);
    for(let j=1;j<7;j++){
      const yy=horizon+(h-horizon)*(j/7)**1.75;
      line(g,0,yy,w,yy,ink(floor,light,.34),.7);
    }
  }

  function outdoorBackdrop(g,d,w,h,preview) {
    const [sky,far,near,ground,dark,light]=d.colors;
    const horizon=h*(preview?.64:.33),r=noise(d.id*17+349);
    rect(g,0,0,w,h,grad(g,0,0,0,h,sky,ink(sky,light,.72),ground));
    const sx=w*(.16+.65*r()), sy=horizon*(.24+.15*r()),sz=Math.min(w,h)*.074;
    oval(g,sx,sy,sz,sz,light);
    for(let i=0;i<8;i++){
      const x=r()*w,y=r()*horizon*.5,ww=(.04+.08*r())*w;
      poly(g,[x,y,x+ww*.18,y-1.2,x+ww*.34,y-4,x+ww*.57,y-3,
        x+ww*.7,y-1,x+ww,y+1,x+ww*.22,y+1],"rgba(248,244,220,.50)");
    }
    g.save();g.scale(1,horizon/(h*.57));landscapeRidge(g,d,w,h,0,r);landscapeRidge(g,d,w,h,1,r);g.restore();
    rect(g,0,horizon,w,h-horizon,grad(g,0,horizon,0,h,ink(ground,far,.32),ground,ink(ground,near,.25)));
    const water=["coast","water"].includes(d.region);
    if(water) {
      const waterline=horizon+(h-horizon)*.20;
      rect(g,0,horizon,w,waterline-horizon,ink(sky,near,.33));
      for(let i=0;i<32;i++) {
        const x=r()*w, y=horizon+r()*(waterline-horizon);
        line(g,x,y,x+r()*w*.07,y,ink(sky,light,.36),.8);
      }
    }
    for(let i=0;i<65;i++){
      const x=r()*w,y=horizon+r()*(h-horizon);
      line(g,x,y,x+2+r()*w*.035,y+r()*.9,ink(ground,near,.35),.7);
    }
    if(d.region==="urban"){
      for(let i=0;i<9;i++){
        const x=i*w/8-w*.025, ht=horizon*(.16+.45*r());
        box(g,x,horizon,w*.075,ht,w*.016,light,near,ink(near,dark,.45));
        for(let xx=0;xx<3;xx++)for(let yy=0;yy<3;yy++)
          rect(g,x+w*(.008+xx*.019),horizon-ht*(.81-yy*.25),w*.01,ht*.11,ink(light,near,.38));
      }
    }
  }

  function roomTrim(g,d,w,h,preview) {
    const [,far,near,,dark,light]=d.colors;
    const horizon=h*(preview?.60:.34), unit=horizon/104;
    const edge=ink(near,dark,.48), molding=ink(far,light,.62);
    // Rails and panelling wrap behind the furnished floor. The roof defines the venue.
    g.save();g.scale(unit,unit);
    const width=w/unit;
    if(d.category==="salon" || d.category==="stage"){
      const cafe=d.category==="salon", fabric=cafe?"#aa5646":"#875568";
      rect(g,0,0,width,13,fabric);
      for(let x=-10;x<width+12;x+=22) {
        rect(g,x,0,11,12,cafe?light:near);
        poly(g,[x,11,x+11,11,x+11,15,x+7,18,x+3,18,x,15],cafe?light:near);
        poly(g,[x+11,11,x+22,11,x+22,15,x+18,18,x+14,18,x+11,15],fabric);
      }
      rect(g,0,75,width,27,edge);
      for(let x=-5;x<width;x+=19){
        rect(g,x+1,79,16,20,near);
        line(g,x+2,80,x+16,80,molding,.65);
      }
      rect(g,0,73,width,3,molding);rect(g,0,99,width,4,dark);
    }else if(d.category!=="cave") {
      rect(g,0,0,width,4,edge);rect(g,0,4,width,1.5,molding);
      rect(g,0,99,width,3,edge);rect(g,0,102,width,1.2,molding);
    }
    if(["salon","stacks","stage","shop","foundry"].includes(d.category)){
      const count=2+d.id%3;
      for(let i=0;i<count;i++){
        const x=(i+.5)*width/count, cord=13+(i+d.id)%3*3;
        line(g,x,0,x,cord,dark,1.2);
        oval(g,x,cord+5,5,4.5,"#ffda93");
        poly(g,[x-10,cord+4,x-5,cord-2,x-2,cord-4,x+2,cord-4,x+5,cord-2,x+10,cord+4],edge);
        line(g,x-9,cord+4,x+9,cord+4,molding,1);
      }
    }
    g.restore();
  }

  function landscapeLandmarks(g,d,w,h,preview) {
    const [sky,far,near,ground,dark,light]=d.colors;
    const horizon=h*(preview?.64:.33), unit=horizon/93, width=w/unit, r=noise(902+d.id*31);
    const edge=ink(near,dark,.42), roof=ink(near,far,.35), sunlit=ink(far,light,.60);
    g.save();g.scale(unit,unit);
    const baseline=91;
    const reflected= ink(sky,light,.30);
    if(["coast","water"].includes(d.region)){
      const left=width*(.17+.17*r());
      if(d.region==="water"){
        // River mouths and inland lakes have tree-lined banks instead of an open sea.
        const lake=/lake|rowing/i.test(d.name), marsh=d.category==="wetland";
        for(let i=-1;i<30;i++){
          const x=(i+r()*.55)*width/28, tall=(lake?9:5)+r()*(lake?13:7);
          const shade=ink(near,far,r()*.44);
          if(lake){
            poly(g,[x-tall*.37,baseline-2,x,baseline-tall,x+tall*.36,baseline-2],shade);
            poly(g,[x-tall*.16,baseline-1,x,baseline-tall*.48,x+tall*.26,baseline-1],near);
            line(g,x,baseline+2,x,baseline+2+tall*.23,ink(sky,near,.37),1.5);
          }else if(marsh){
            for(let j=-2;j<=2;j++)
              poly(g,[x-1.5,baseline+1,x+j*2,baseline-tall*(1-Math.abs(j)*.18),x+1.5,baseline+1],shade);
          }else{
            oval(g,x,baseline-tall*.32,tall*.72,tall*.65,shade);
            rect(g,x-1,baseline-tall*.44,2,tall*.44,near);
          }
        }
        if(lake){
          const x=width*.22;
          rect(g,x-18,baseline-9,35,8,ink(ground,near,.43));
          poly(g,[x-21,baseline-9,x-5,baseline-20,x+15,baseline-17,x+22,baseline-9],"#98695a");
          rect(g,x-4,baseline-8,11,7,edge);
          line(g,x-19,baseline+1,x+26,baseline+1,roof,2);
        }else if(!marsh){
          const x=width*.55;
          for(let i=0;i<4;i++){
            const px=x+i*6;
            rect(g,px,baseline-9,1,9,edge);
          }
          line(g,x-6,baseline-9,x+25,baseline-9,edge,1.3);
          line(g,x-6,baseline-5,x+25,baseline-5,edge,1.6);
        }
      }else if(d.category==="pier"){
        // Hoists and pilings give the salvage and ferry docks an industrial shore.
        for(let i=0;i<3;i++){
          const x=(i*.28+.10+r()*.05)*width,y=baseline-1,ht=10+r()*12;
          poly(g,[x-5,y,x-2,y-ht,x+1,y-ht,x+4,y],edge);
          line(g,x-5,y-ht,x+19,y-ht-6,edge,1.4);
          line(g,x-1,y-ht-8,x+19,y-ht-6,near,.95);
          line(g,x+16,y-ht-5,x+16,y-ht+3,near,1);
          rect(g,x+14,y-ht+3,4,2,edge);
        }
        for(let i=0;i<7;i++){const x=left-24+i*9;rect(g,x,baseline+3,1.7,5+(i%2),edge);}
        rect(g,left-27,baseline+2,61,2,roof);
        for(let i=0;i<3;i++){
          const x=width*(.32+i*.26)+r()*7, y=baseline+6+i%2*2;
          poly(g,[x-2,y,x-1,y-4,x+1,y-4,x+2,y],"#bf7456");
          line(g,x-4,y+1,x+4,y+1,reflected,.9);
        }
      }else{
        for(let i=0;i<3;i++){
          const x=width*(.39+i*.20)+r()*7,y=baseline+4+i%2*2,k=.60+r()*.25;
          poly(g,[x-9*k,y,x+9*k,y,x+5*k,y+3*k,x-6*k,y+3*k],edge);
          line(g,x,y,x,y-16*k,edge,.9);
          poly(g,[x-1,y-15*k,x-1,y-1,x-7*k,y-1],sunlit);
          line(g,x-7*k,y+5*k,x+6*k,y+5*k,reflected,.8);
        }
        const x=left,towerHeight=21+r()*6;
        poly(g,[x-3,baseline,x-1.8,baseline-towerHeight,x+1.6,baseline-towerHeight,x+3.6,baseline],light);
        rect(g,x-2,baseline-towerHeight,4,4,edge);rect(g,x-3,baseline-towerHeight,6,.9,light);
        poly(g,[x-3.4,baseline-towerHeight,x,baseline-towerHeight-3,x+3.4,baseline-towerHeight],near);
        rect(g,x-2.6,baseline-towerHeight*.52,5.1,2.8,"#af6751");
      }
    }else if(["woodland","mountain"].includes(d.region)){
      for(let i=0;i<8;i++){
        const x=(i+.24+r()*.38)*width/8,y=baseline-1+r()*4, tall=8+r()*14;
        rect(g,x-1,y-tall*.5,1.6,tall*.5,edge);
        if(d.category==="alpine"||d.category==="ice"||d.category==="forest"){
          for(let k=0;k<3;k++){
            const base=y-tall*.16-k*tall*.18,rad=tall*(.23-k*.037);
            poly(g,[x-rad,base,x,base-tall*.48,x+rad,base],k%2?near:edge);
          }
        }else{
          oval(g,x-2,y-tall*.62,tall*.28,tall*.32,near);
          oval(g,x+2,y-tall*.73,tall*.26,tall*.29,roof);
        }
      }
      if(d.category==="farm"){
        const x=width*.73,y=baseline-2;
        poly(g,[x-6,y,x-3,y-21,x+3,y-21,x+6,y],sunlit);
        const dx=x,dy=y-17;
        for(let k=0;k<4;k++){g.save();g.translate(dx,dy);g.rotate(k*PI/2+.3);
          poly(g,[0,-1,12,-1,13,-3,15,-3,14,1,0,1],edge);g.restore();}
      }
    }else if(d.region==="desert"){
      for(let i=0;i<5;i++){
        const x=(i+r()*.6)*width/5,y=baseline+3+r()*2,tall=9+r()*10;
        poly(g,[x-8,y,x-5,y-7,x-2,y-8,x+1,y-tall,x+5,y-tall+1,x+8,y-5,x+12,y],near);
        poly(g,[x+1,y-tall,x+4,y-tall+1,x+6,y-4,x+3,y],roof);
      }
    }else{
      const skyline= d.region==="industrial";
      for(let i=0;i<5;i++){
        const x=(i+.3+r()*.45)*width/5,y=baseline,tall=10+r()*6;
        if(skyline){
          line(g,x,y,x,y-tall-7,edge,2);line(g,x-6,y-tall-7,x+16,y-tall-7,edge,1.2);
          line(g,x,y-tall-12,x+16,y-tall-7,edge,.85);line(g,x+13,y-tall-6,x+13,y-tall,edge,.65);
        }else{
          line(g,x,y,x,y-tall,edge,1.2);poly(g,[x-2,y-tall-3,x+2,y-tall-3,x+1,y-tall,x-1,y-tall],sunlit);
          line(g,x-2,y-tall-3,x+2,y-tall-3,edge,1);
        }
      }
    }
    g.restore();
  }

  function sceneBackdrop(g,d,w,h,preview) {
    if(d.indoors) interiorBackdrop(g,d,w,h,preview);
    else outdoorBackdrop(g,d,w,h,preview);
    if(!d.indoors) landscapeLandmarks(g,d,w,h,preview);
    if(d.indoors) roomTrim(g,d,w,h,preview);
    if(preview){
      const scale=Math.min(w/330,h/230);
      fixture(g,d,w*.74,h*.79,scale*1.72,0,3);
      fixture(g,d,w*.91,h*.84,scale*.94,1,2);
      fixture(g,d,w*.14,h*.75,scale*1.1,2,1);
    }
  }

  function drawSprite(g,d,index,x,y,scale,anim,face) {
    sprite(g,index,x,y,scale,anim,face);
  }

  function rhombus(g,x,y,hw,hh,fill,stroke) {
    poly(g,[x,y-hh,x+hw,y,x,y+hh,x-hw,y,x,y-hh],fill,stroke,.8);
  }

  // Eight variants of the same physical surface avoid a repeating stamp on large boards.
  function floorAtlas(d) {
    const floors=[],[, ,near,ground,,light]=d.colors;
    for(let i=0;i<8;i++){
      const tile=stage(100,55), g=tile.getContext("2d"), r=noise(d.id*47+i*319+101);
      rhombus(g,50,27,50,27,ink(ground,i%3===1?light:near,.04+r()*.08));
      g.save();g.clip();
      const soft=ink(ground,near,.22),pale=ink(ground,light,.30);
      if(["brick","tile","iron","deck","slate","wood","concrete","marble"].includes(d.surface)){
        for(let j=-2;j<5;j++){
          const offset=j*17+(i%2)*4;
          line(g,0,offset,100,offset+53,soft,1);
          if(["brick","tile","marble"].includes(d.surface)) line(g,36,offset+18,52,offset+10,soft,.9);
          if(d.surface==="deck"||d.surface==="wood")line(g,62,offset+33,70,offset+36,pale,1);
        }
      }else{
        for(let j=0;j<19;j++){
          const xx=r()*100,yy=r()*55,ww=1+r()*7;
          if(["grass","mud","moss","snow"].includes(d.surface))
            poly(g,[xx-2,yy-2,xx+1,yy,xx+2,yy-3],null,j%3?soft:pale,.75);
          else line(g,xx,yy,xx+ww,yy+(r()-.5)*2,j%3?soft:pale,.7);
        }
      }
      if(d.mode===3){
        // The torn top and shadowed fold give the paper tiles a layered edge.
        poly(g,[1,27,49,1,54,3,96,26,90,24,53,5,48,3],ink(ground,light,.44));
        poly(g,[2,28,49,52,99,27,93,32,49,54],ink(ground,near,.36));
      }else if(d.mode===1){
        for(let j=0;j<5;j++)rect(g,Math.round(r()*25)*4,Math.round(r()*14)*4,2,1,j%4?soft:pale);
      }
      poly(g,[0,27,50,54,100,27],null,ink(ground,near,.34),1);
      g.restore();floors.push(tile);
    }
    return floors;
  }

  function projection(s,d,w,h,options={}) {
    const size=s.size,span=Math.min(size,9);
    let col=s.position%size,row=Math.floor(s.position/size);
    let face=options.face??1;
    const from=options.moveFrom;
    if(Number.isInteger(from)&&from>=0&&Math.abs(from%size-col)+Math.abs(Math.floor(from/size)-row)===1){
      const fromCol=from%size,fromRow=Math.floor(from/size);
      face=(col-fromCol)-(row-fromRow)>0?1:-1;
      const amount=options.motion===false?1:bound(options.moveProgress??1,0,1);
      col=mix(fromCol,col,amount);row=mix(fromRow,row,amount);
    }
    const margin=(span-1)/2,cc=bound(col,margin,size-1-margin),rr=bound(row,margin,size-1-margin);
    const overviewSide=Math.min(w*.23,h*.22,126);
    const mini=size>9?{x:w-overviewSide-9,y:9,side:overviewSide}:null;
    const hw=Math.min(w*.45/span,h*.34/(span*.53));
    const hh=hw*.53,px=w*.5-(cc-rr)*hw,py=h*.56-(cc+rr)*hh;
    const perspectiveStage=d.mode===2;
    const widthPerCell=Math.min(w*.82,h*1.65)/span, depthPerCell=h*.40/span, cy=h*.68;
    function point(c,r){
      if(!perspectiveStage)return [px+(c-r)*hw,py+(c+r)*hh];
      const depth=r-rr,perspective=1-.58*depth/span;
      return [w*.5+(c-cc)*widthPerCell/perspective,cy+depth*depthPerCell/perspective];
    }
    function world(x,y){
      if(!perspectiveStage){
        const across=(x-px)/hw,down=(y-py)/hh;
        return [(down+across)/2,(down-across)/2];
      }
      const dy=y-cy;
      const depth=dy/(depthPerCell+.58*dy/span);
      return [cc+(x-w*.5)*(1-.58*depth/span)/widthPerCell,rr+depth];
    }
    function radius(r){ return perspectiveStage?widthPerCell*.49/(1-.58*(r-rr)/span):hw; }
    const horizon=perspectiveStage ? Math.max(0,point(cc,rr-span*.52)[1]) : 0;
    const bottom=h;
    function within(x,y){return x>=0&&x<w&&y>=horizon-.1&&y<bottom;}
    const corners=[[0,horizon],[w,horizon],[0,bottom],[w,bottom]].map(([x,y])=>world(x,y));
    const minCol=bound(Math.floor(Math.min(...corners.map(p=>p[0])))-2,0,size-1);
    const maxCol=bound(Math.ceil(Math.max(...corners.map(p=>p[0])))+2,0,size-1);
    const minRow=bound(Math.floor(Math.min(...corners.map(p=>p[1])))-1,0,size-1);
    const maxRow=bound(Math.ceil(Math.max(...corners.map(p=>p[1])))+1,0,size-1);
    return {w,h,size,col,row,face,cc,rr,hw,hh,point,world,radius,within,mini,perspectiveStage,
      horizon,minCol,maxCol,minRow,maxRow};
  }

  function cellOutline(g,view,col,row,fill,stroke,weight=1) {
    const {point}=view;
    const points=[point(col-.5,row-.5),point(col+.5,row-.5),point(col+.5,row+.5),
      point(col-.5,row+.5),point(col-.5,row-.5)].flat();
    poly(g,points,fill,stroke,weight);
  }

  function visibleCells(view,s) {
    const cells=[];
    for(let row=view.minRow;row<=view.maxRow;row++){
      for(let col=view.minCol;col<=view.maxCol;col++){
        const [x,y]=view.point(col,row),hw=view.radius(row);
        if(x< -hw || x>view.w+hw || y<view.horizon-hw*.38 || y>view.h+hw)continue;
        const id=row*s.size+col;
        const variant=(Math.imul(id+7,24593)^(s.levelSeed>>>8)^Math.imul(row,5))&7;
        cells.push({id,col,row,x,y,hw,variant});
      }
    }
    cells.sort((a,b)=>a.y-b.y || a.x-b.x);
    return cells;
  }

  function floorLayer(g,s,d,view,cache,cells) {
    const [,far,near,ground,dark,light]=d.colors;
    const rim=ink(near,dark,.56), rimLight=ink(ground,light,.44);
    g.drawImage(cache.backdrop,0,0,view.w,view.h);
    // The tray casts one soft shadow. All tile edges, bases and fixtures share its light.
    if(s.size<=9) {
      const last=s.size-.5, offset=view.radius(view.rr)*.16;
      const corners=[[-.5,-.5],[last,-.5],[last,last],[-.5,last]].map(([col,row])=>view.point(col,row));
      for(let layer=3;layer>=1;layer--){
        const drift=offset*(.7+layer*.27);
        const vertices=corners.flatMap(([x,y])=>[x+drift,y+offset*1.25+drift*.6]);
        poly(g,vertices,"rgba(34,44,39,.075)");
      }
    }
    g.save();
    if(view.perspectiveStage){
      g.beginPath();g.rect(0,view.horizon,view.w,view.h-view.horizon);g.clip();
    }
    for(const item of cells){
      const {col,row,x,y,hw,variant}=item, hh=view.hh;
      const depth=Math.max(3,hw*(d.mode===3?.20:.145));
      if(view.perspectiveStage){
        const pt=(a,b)=>view.point(col+a,row+b);
        const lr=pt(.5,.5),ll=pt(-.5,.5);
        if(row===s.size-1)poly(g,[...ll,...lr,lr[0],lr[1]+depth,ll[0],ll[1]+depth],rim);
        const flat=ink(ground,variant%2?light:far,.035+variant*.018);
        cellOutline(g,view,col,row,flat,ink(ground,near,.52),Math.max(.7,hw*.025));
        // Perspective joints follow the vanishing point so the floor reads as a model.
        if(["wood","deck","brick","iron","tile"].includes(d.surface)){
          for(const offset of [-.21,.22]){
            const p1=pt(-.49,offset),p2=pt(.49,offset);
            line(g,...p1,...p2,ink(ground,near,.24),Math.max(.5,hw*.022));
          }
          const joint=(variant%3-1)*.22;
          line(g,...pt(joint,-.47),...pt(joint,-.22),ink(ground,near,.26),Math.max(.5,hw*.024));
        }else{
          const fold=(variant-3)*.05;
          poly(g,[...pt(-.49,-.45),...pt(.48,-.42),...pt(.49,fold),...pt(-.35,fold+.14)],ink(ground,far,.10));
        }
        line(g,...pt(-.45,-.45),...pt(.45,-.45),rimLight,Math.max(.6,hw*.028));
      }else{
        if(col===s.size-1)poly(g,[x+hw,y,x,y+hh,x,y+hh+depth,x+hw,y+depth],rim);
        if(row===s.size-1)poly(g,[x-hw,y,x,y+hh,x,y+hh+depth,x-hw,y+depth],ink(ground,near,.78));
        if(d.mode===3 && (col===s.size-1||row===s.size-1)) {
          const side=col===s.size-1?1:-1;
          line(g,x,y+hh+depth*.55,x+side*hw,y+depth*.55,rimLight,Math.max(.7,hw*.026));
        }
        g.drawImage(cache.floors[variant],x-hw-.25,y-hh-.25,hw*2+.5,hh*2+.5);
      }
      if(s.walls[item.id]){
        cellOutline(g,view,col,row,"rgba(44,58,51,.19)",ink(ground,near,.62),.9);
      }
    }
    g.restore();
  }

  function staticMap(s,d) {
    const c=stage(s.size,s.size),g=c.getContext("2d");
    rect(g,0,0,s.size,s.size,ink(d.colors[3],d.colors[5],.52));
    const dirty=[];
    for(let id=0;id<s.walls.length;id++){
      if(!s.walls[id]&&!s.truth[id])continue;
      g.fillStyle=s.walls[id]?d.colors[4]:"#a53e26";
      g.fillRect(id%s.size,Math.floor(id/s.size),1,1);
      if(s.truth[id]) dirty.push(id);
    }
    return {terrain:c,dirty};
  }

  function overview(g,s,d,view,cache) {
    const mini=view.mini;if(!mini)return;
    if(cache.miniRemaining!==s.dirtRemaining){
      cache.overview=staticMap(s,d);cache.miniRemaining=s.dirtRemaining;
    }
    const {x,y,side}=mini,scale=side/s.size, pad=3;
    const coords=id=>[x+(id%s.size+.5)*scale,y+(Math.floor(id/s.size)+.5)*scale];
    g.save();g.imageSmoothingEnabled=false;
    rect(g,x-pad-1,y-pad-1,side+pad*2+2,side+pad*2+2,"#26332d");
    rect(g,x-pad,y-pad,side+pad*2,side+pad*2,"#faf2dc");
    g.drawImage(cache.overview.terrain,x,y,side,side);
    if(scale<3.5) {
      for(const id of cache.overview.dirty) {
        const [mx,my]=coords(id);
        oval(g,mx,my,2.4,2.4,"#ffe4a2");oval(g,mx,my,1.6,1.6,"#a43b23");
      }
    }
    if(Number.isInteger(s.targetCell)){
      const [mx,my]=coords(s.targetCell),r=Math.max(3.4,scale*.57);
      g.strokeStyle="#137b78";g.lineWidth=1.6;g.strokeRect(mx-r,my-r,r*2,r*2);
    }
    const px=x+(view.col+.5)*scale,py=y+(view.row+.5)*scale;
    oval(g,px,py,3.4,3.4,"#fff6dd");oval(g,px,py,2.4,2.4,"#164f51");g.restore();
  }

  function dustStamp(d,id,seed) {
    const c=stage(84,46),g=c.getContext("2d"),r=noise(Math.imul(id+1,7919)^seed);
    const leaves=["grass","moss","mud"].includes(d.surface);
    const gravel=["sand","stone","slate","shell","ice"].includes(d.surface);
    const dark=leaves?"#493b28":gravel?"#493b36":"#553929",mid=leaves?"#866332":gravel?"#956f56":"#af7645";
    const gold=leaves?"#e2b95b":"#e7b882";
    g.translate(42,23);g.rotate((r()-.5)*.26);g.lineJoin="round";
    // An irregular, grounded clump is visible before the first inspection.
    // Its shape is a function of the venue and cell, independent of the scanner.
    oval(g,1,3,27,10,"rgba(60,46,36,.20)");
    for(let i=0;i<5;i++){
      const x=(i-2)*7+(r()-.5)*5,y=(r()-.5)*6,rx=5+r()*4,ry=3+r()*3;
      poly(g,[x-rx,y,x-rx*.5,y-ry,x+rx*.55,y-ry*.8,x+rx,y+.5,
        x+rx*.25,y+ry,x-rx*.67,y+ry*.65],i%2?dark:mid,dark,1.4);
      if(leaves)line(g,x-rx*.65,y+ry*.45,x+rx*.57,y-ry*.5,gold,1.5);
      if(gravel)poly(g,[x-rx*.6,y-ry*.35,x-rx*.4,y-ry,x+rx*.5,y-ry*.7,x,y-ry*.1],gold);
      if(!gravel&&!leaves)oval(g,x-rx*.2,y-ry*.4,1.9,1,gold);
    }
    for(let i=0;i<7;i++){
      const a=(i+r()*.50)*TAU/7,dist=.67+r()*.26;
      const x=Math.cos(a)*32*dist,y=Math.sin(a)*13*dist,rx=1.5+r()*1.45;
      oval(g,x,y,rx,rx*.75,i%3?dark:mid);
    }
    return c;
  }

  function drawDust(g,d,item,cache,s) {
    const variant=(item.id^(item.id>>>4))&15;
    if(!cache.dust.has(variant)) cache.dust.set(variant,dustStamp(d,variant,s.levelSeed));
    const width=item.hw*1.39, height=width*46/84;
    g.drawImage(cache.dust.get(variant),item.x-width*.5,item.y-height*.5,width,height);
  }

  function drawObject(g,s,d,item,cache) {
    const spec=root.Locations.fixtureAt(d.id,item.id,s.size);
    const key=spec.kind+"/"+spec.name+"/"+(item.variant%3);
    let c=cache.fixtures.get(key);
    if(!c){
      const pixel=d.mode===1;
      c=stage(pixel?68:136,pixel?70:140);
      const cg=c.getContext("2d"),scale=c.width/68;
      cg.scale(scale,scale);
      root.LocationProps.draw(cg,spec,34,53,1.32,d,item.variant%3);
      cache.fixtures.set(key,c);
    }
    const width=item.hw*(d.mode===2?2.2:1.8),height=width*c.height/c.width;
    if(d.mode===2){
      g.save();g.translate(item.x,item.y);g.rotate(-.12);
      const contact=g.createRadialGradient(0,0,1,0,0,width*.30);
      contact.addColorStop(0,"rgba(15,15,12,.53)");contact.addColorStop(1,"rgba(15,15,12,0)");
      g.scale(1,.24);oval(g,width*.06,0,width*.35,width*.34,contact);g.restore();
    }
    g.drawImage(c,item.x-width*.5,item.y-height*(53/70),width,height);
  }

  function drawField(g,s,d,cache,w,h,time,options) {
    const view=projection(s,d,w,h,{...options,face:cache.face}), cells=visibleCells(view,s);
    cache.face=view.face;cache.view=view;
    if(cache.floorCol!==view.cc || cache.floorRow!==view.rr) {
      floorLayer(cache.floorLayer.getContext("2d"),s,d,view,cache,cells);
      cache.floorCol=view.cc;cache.floorRow=view.rr;
    }
    g.drawImage(cache.floorLayer,0,0,w,h);
    if(s.route.length && s.phase==="move"){
      g.save();g.lineCap="round";g.lineJoin="round";
      const weight=Math.max(1.2,view.radius(view.row)*.058);
      g.setLineDash([weight*1.8,weight*2.2]);g.lineWidth=weight;
      g.strokeStyle="#28736c";
      g.beginPath();g.moveTo(...view.point(view.col,view.row));
      for(let i=s.routeIndex+1;i<s.route.length;i++){
        const cell=s.route[i],row=Math.floor(cell/s.size);
        if(row<view.minRow-1||row>view.maxRow+1)break;
        g.lineTo(...view.point(cell%s.size,row));
      }
      g.stroke();g.restore();
    }
    for(const item of cells){
      if(s.truth[item.id]) drawDust(g,d,item,cache,s);
      // A teal cell border denotes the user's instruction, including on bare floor.
      const hover=s.phase==="select" && options.hoverCell===item.id;
      if(item.id===s.targetCell || hover){
        const blocked=Boolean(s.walls[item.id]),weight=Math.max(1.5,item.hw*.053);
        cellOutline(g,view,item.col,item.row,null,blocked?"#764e49":"#ffeed2",weight+1.8);
        cellOutline(g,view,item.col,item.row,null,blocked?"#864e46":"#20766e",weight);
      }
    }
    const [px,py]=view.point(view.col,view.row), playerWidth=view.radius(view.row);
    const foreground=cells.filter(i=>s.walls[i.id]);foreground.push({x:px,y:py,avatar:true});
    foreground.sort((a,b)=>a.y-b.y);
    for(const item of foreground){
      if(!item.avatar){drawObject(g,s,d,item,cache);continue;}
      const bodyScale=playerWidth*(view.perspectiveStage?.032:.027);
      if(["scan","sensor","bayes"].includes(s.phase)){
        const pulse=.48+(.5+.5*Math.sin(time*.007))*.24;
        g.save();g.strokeStyle="#e9fff4";g.lineWidth=Math.max(1.4,playerWidth*.046);
        g.beginPath();g.ellipse(px,py,playerWidth*pulse,playerWidth*pulse*.43,0,0,TAU);g.stroke();g.restore();
      }
      if(s.phase==="result" && s.decision?.action==="Clean"){
        for(let k=0;k<6;k++){
          const a=time*.004+k*TAU/6;
          const x=px+playerWidth*.50*Math.cos(a),y=py+playerWidth*.23*Math.sin(a);
          line(g,x-2,y,x+2,y,"#f9fff0",1.6);line(g,x,y-2,x,y+2,"#f9fff0",1.5);
        }
      }
      const anim=s.phase==="move"?time*.009:time*.0025;
      drawSprite(g,d,s.characterIndex,px,py-playerWidth*.14,bodyScale,anim,view.face,cache);
    }
    overview(g,s,d,view,cache);
    return {x:px,y:py-playerWidth*(view.perspectiveStage?1.04:.94)};
  }

  const views=new WeakMap();
  function currentView(canvas,state){
    if(!state)return null;
    const bounds=canvas.getBoundingClientRect(),previous=views.get(canvas);
    if(previous && previous.state===state && previous.seed===state.levelSeed &&
        Math.abs(previous.width-bounds.width)<1 && Math.abs(previous.height-bounds.height)<1)return previous;
    if(bounds.width<1||bounds.height<1)return null;
    return {view:projection(state,designs[state.designIndex],bounds.width,bounds.height),width:bounds.width,height:bounds.height};
  }
  function insideMini(mini,x,y){return mini&&x>=mini.x&&y>=mini.y&&x<mini.x+mini.side&&y<mini.y+mini.side;}

  // Pointers are canvas-local CSS pixels. Convert once even when pixel-art uses a smaller backing canvas.
  function cellAt(canvas,state,x,y){
    const data=currentView(canvas,state);
    if(!data || !Number.isFinite(x)||!Number.isFinite(y))return null;
    const {view,width,height}=data;
    x*=view.w/width;y*=view.h/height;
    if(x<0||x>=view.w||y<0||y>=view.h)return null;
    const mini=view.mini;
    if(insideMini(mini,x,y)){
      return Math.floor((y-mini.y)*state.size/mini.side)*state.size+Math.floor((x-mini.x)*state.size/mini.side);
    }
    if(!view.within(x,y))return null;
    const [c,r]=view.world(x,y), col=Math.round(c),row=Math.round(r);
    if(row<0||row>=state.size||col<0||col>=state.size)return null;
    return row*state.size+col;
  }
  function cellPoint(canvas,state,id){
    const data=currentView(canvas,state);
    if(!data || !Number.isInteger(id)||id<0||id>=state.size**2)return null;
    const {view,width,height}=data,col=id%state.size,row=Math.floor(id/state.size);
    let [x,y]=view.point(col,row);
    const mini=view.mini;
    if(mini && (row<view.minRow||row>view.maxRow||!view.within(x,y)||insideMini(mini,x,y))){
      x=mini.x+(col+.5)*mini.side/state.size;y=mini.y+(row+.5)*mini.side/state.size;
    }
    return {x:x*width/view.w,y:y*height/view.h};
  }

  function draw(canvas,state,options={}){
    if(!canvas)return null;
    const gallery=options.preview||!state, d=designs[(gallery?options.designIndex:state.designIndex)??0];
    const bounds=canvas.getBoundingClientRect(),cssW=bounds.width,cssH=bounds.height;
    if(cssW<1||cssH<1)return null;
    const deviceScale=Math.min(root.devicePixelRatio||1,2);
    const width=Math.max(1,Math.round(cssW*deviceScale)),height=Math.max(1,Math.round(cssH*deviceScale));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    const pixel=d.mode===1,f=pixel?Math.min(1,350/cssW,260/cssH):1;
    const w=Math.max(1,Math.round(cssW*f)),h=Math.max(1,Math.round(cssH*f));
    const cacheId=[d.id,w,h,gallery,gallery?0:state.levelSeed].join("/");
    let cache=memory.get(canvas);
    if(cache?.id!==cacheId){
      const backdrop=stage(w,h);
      sceneBackdrop(backdrop.getContext("2d"),d,w,h,gallery);
      cache={id:cacheId,backdrop,frame:pixel?stage(w,h):null,dust:new Map(),fixtures:new Map()};
      if(!gallery) {
        cache.floorLayer=stage(w,h);
        cache.floors=floorAtlas(d);
      }
      memory.set(canvas,cache);
    }
    const output=canvas.getContext("2d"),g=pixel?cache.frame.getContext("2d"):output;
    g.setTransform(pixel?1:width/w,0,0,pixel?1:height/h,0,0);g.imageSmoothingEnabled=!pixel;
    const t=options.motion===false?0:options.time??0;
    let anchor;
    if(gallery){
      g.drawImage(cache.backdrop,0,0,w,h);
      const index=options.characterIndex??0,scale=Math.min(w/245,h/192);
      drawSprite(g,d,index,w*.39,h*(d.mode===2?.84:.79),scale,t*.003,1,cache);
    }else{
      anchor=drawField(g,state,d,cache,w,h,t,options);
      views.set(canvas,{view:cache.view,width:cssW,height:cssH,state,seed:state.levelSeed});
    }
    if(gallery)ambient(g,d,w,h,t);
    if(pixel){
      output.setTransform(1,0,0,1,0,0);output.imageSmoothingEnabled=false;
      output.drawImage(cache.frame,0,0,width,height);
    }
    return anchor?{robot:{x:anchor.x*cssW/w,y:anchor.y*cssH/h}}:null;
  }

  root.GameArt=Object.freeze({designs,characters,draw,cellAt,cellPoint});
})(globalThis);
