const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {create}=require('../customer-page-controls'),e=require('../PAGE-CONTROLS-EXTRACTION-2026-11-25.json');
function element(id){return {id,src:'',style:{},listeners:{},addEventListener(k,fn,options){(this.listeners[k]??=[]).push({fn,options});}};}
function fixture({hidden=false,height=100,header=true,fallback=false,reduced=false,ua='Desktop',lightbox=true,image=true}={}){
 const f={window:element(),navigator:{userAgent:ua},calls:[],properties:{},nodes:{},images:[element('first'),element('second')]};f.images[0].src='food.jpg';
 f.document={documentElement:{classList:{contains:()=>hidden},scrollHeight:2000,style:{setProperty:(k,v)=>f.properties[k]=v}},querySelector:s=>(s==='.site-header'?header&&!fallback:header)?{getBoundingClientRect:()=>({height})}:null,querySelectorAll:()=>f.images,getElementById:id=>f.nodes[id]||null};
 f.window.scrollY=400;f.window.innerHeight=600;f.window.matchMedia=()=>({matches:reduced});f.window.scrollTo=x=>f.calls.push(x);
 if(lightbox)f.nodes.lightbox=element('lightbox');if(image)f.nodes['lightbox-img']=element('lightbox-img');return f;
}
function old(f){return vm.runInNewContext(e.regions.map(r=>r.name.startsWith('bind')?'function '+r.name+'(){'+r.before+'}':r.before).join('\n')+'\n({computeHeaderOffset,applyHeaderOffset,smoothScrollToElTop,bindHeader,bindLightbox})',f);}
const plain=x=>JSON.parse(JSON.stringify(x));
function state(f){return plain({properties:f.properties,calls:f.calls,nodes:f.nodes,images:f.images,events:f.window.listeners});}
function fire(el,type,event={}){for(const {fn} of el?.listeners[type]||[])fn(event);}
test('page controls reconstruct the released bootstrap and have no registration/creation DOM effects',()=>{require('./page-controls-source.cjs').reconstructPageControls();const window={};vm.runInNewContext(fs.readFileSync(require.resolve('../customer-page-controls'),'utf8'),{window});create({document:new Proxy({},{get(){throw Error('startup DOM access');}})});assert.equal(typeof window.RTKPageControls.create,'function');});
test('header offsets preserve hidden header, fallback header, missing header and event options',()=>{
 for(const options of [{},{hidden:true},{height:100.6},{header:false},{fallback:true}]){const a=fixture(options),b=fixture(options),x=create(a),y=old(b);assert.equal(x.computeHeaderOffset(),y.computeHeaderOffset());x.bindHeader();y.bindHeader();assert.deepEqual(state(a),state(b));for(const name of ['load','resize','orientationchange','scroll']){assert.equal(a.window.listeners[name].length,1);assert.deepEqual(a.window.listeners[name][0].options,{passive:true});fire(a.window,name);fire(b.window,name);assert.deepEqual(state(a),state(b));}}
});
test('smooth scroll preserves page-bound clamping and reduced-motion/iOS behaviour',()=>{
 for(const reduced of [false,true])for(const ua of ['Desktop','iPad','iPhone','iPod'])for(const top of [-1000,0,500,3000]){const a=fixture({reduced,ua}),b=fixture({reduced,ua}),x=create(a),y=old(b),el={getBoundingClientRect:()=>({top})};x.smoothScrollToElTop(el);y.smoothScrollToElTop(el);assert.deepEqual(state(a),state(b));assert.ok(a.calls[0].top>=0&&a.calls[0].top<=1400);assert.equal(a.calls[0].behavior,reduced||ua!=='Desktop'?'auto':'smooth');x.smoothScrollToElTop(null);assert.equal(a.calls.length,1);}
});
test('actual lightbox bindings preserve image source, backdrop/image dismissal and missing-element guards',()=>{
 for(const options of [{},{lightbox:false},{image:false}]){const a=fixture(options),b=fixture(options),x=create(a),y=old(b);x.bindLightbox();y.bindLightbox();for(let i=0;i<2;i++){fire(a.images[i],'click');fire(b.images[i],'click');assert.deepEqual(state(a),state(b));for(const id of ['other','lightbox-img','lightbox']){fire(a.nodes.lightbox,'click',{target:{id}});fire(b.nodes.lightbox,'click',{target:{id}});assert.deepEqual(state(a),state(b));}}}
});
