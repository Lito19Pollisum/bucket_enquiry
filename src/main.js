import './styles.css';
import { DATA } from './data.js';

// Product photos live in src/assets/images; keys are the file names without extension.
const urls = import.meta.glob('./assets/images/*.{jpg,png}', { eager: true, query: '?url', import: 'default' });
const IMG = Object.fromEntries(Object.entries(urls).map(([p, u]) => [p.split('/').pop().replace(/\.\w+$/, ''), u]));
/* ===== Configuration ===== */
// Set VITE_SALES_EMAIL in Vercel (Project Settings > Environment Variables) or in .env
const SALES_EMAIL = import.meta.env.VITE_SALES_EMAIL || "sales@pollisum.com";
const COMPANY="Pollisum Fabrication Pte Ltd";
document.getElementById('brandLogo').src=IMG.brand_logo;document.getElementById('brandPic').src=IMG.brand_strips;

const FAM=DATA.fam, CATS=[...new Set(FAM.map(f=>f.cat))];
const BYCODE={};FAM.forEach(f=>f.models.forEach(m=>BYCODE[m.code]={fam:f,m}));
const CUSTOM_TYPES=["Concrete bucket","Sand / skip bucket","Hopper","Man cage / basket","Cylinder rack","Lifting frame / spreader beam","Storage / transfer cage","Tank / other fabrication","Not sure"].concat([]);
const S={step:0,tab:'std',cat:'All',sel:{},customs:[],cust:{},ref:null,editing:null,draft:null,files:[]};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STEPS=["Enquiry type","Choose items","Your details","Review & send"];
let T;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(T);T=setTimeout(()=>t.classList.remove('show'),1800)}
const totalStd=()=>Object.values(S.sel).reduce((a,b)=>a+b,0);
const totalAll=()=>totalStd()+S.customs.reduce((a,c)=>a+c.qty,0);
const itemCount=()=>Object.keys(S.sel).length+S.customs.length;

function stepper(){return `<ol class="steps">${STEPS.map((s,i)=>`<li class="${i===S.step?'on':i<S.step?'done':''}"><span class="n">${i+1}</span><span class="l">${s}</span></li>`).join('')}</ol>`}
function go(n){S.step=n;render();window.scrollTo({top:0})}

function render(){
 const a=$('#app');
 let h='';
 if(S.step<4&&S.step>=0&&S.step!=='done')h+=stepper();
 if(S.step===0)h+=vType();
 else if(S.step===1)h+=vItems();
 else if(S.step===2)h+=vDetails();
 else if(S.step===3)h+=vReview();
 else if(S.step===4)h+=vDone();
 a.innerHTML=h+`<div class="foot">${COMPANY} · Tel (65) 6755 7600 · www.pollisum.com<br>Enquiry only — no payment is taken. Prices are confirmed in our quotation.</div>`;
 bind();
}

/* ---------- Step 1: type ---------- */
function vType(){return `
<h1>What do you need?</h1>
<p class="lead">Pick one. We send you a quotation.</p>
<p class="purpose">Start here. You can add the other kind later.</p>
<div class="big2">
 <button class="choice" data-type="std"><img src="${IMG.cdcb}" alt=""><h2>Standard bucket</h2><p>Pick from our catalogue of buckets, hoppers, racks and cages.</p><span class="go">Browse the catalogue →</span></button>
 <button class="choice" data-type="custom"><img src="${IMG.c_liftframe}" alt=""><h2>Custom-made bucket</h2><p>Need a different size? Tell us what you need and we will design it.</p><span class="go">Describe what you need →</span></button>
</div>`}

/* ---------- Step 2: items ---------- */
function vItems(){
 const cnt=itemCount();
 return `
<h1>Choose your items</h1>
<p class="purpose">Select the models you want and set quantities, or describe a custom-made item. Everything you pick is collected for your quotation.</p>
<div class="tabs" role="tablist">
 <button class="tab ${S.tab==='std'?'on':''}" data-tab="std">Standard catalogue${Object.keys(S.sel).length?`<span class="badge">${Object.keys(S.sel).length}</span>`:''}</button>
 <button class="tab ${S.tab==='custom'?'on':''}" data-tab="custom">Custom-made${S.customs.length?`<span class="badge">${S.customs.length}</span>`:''}</button>
</div>
${S.tab==='std'?vStd():vCustom()}
<div class="bar"><div class="wrap">
 <div class="sum">${cnt?`<b>${cnt} item${cnt>1?'s':''}</b> · ${totalAll()} unit${totalAll()>1?'s':''} selected`:'Nothing selected yet'}</div>
 <div style="display:flex;gap:10px"><button class="btn" data-go="0">Back</button><button class="btn pri" id="toDetails">Continue</button></div>
</div></div>`}

function card(f,m){
 const q=S.sel[m.code],on=!!q;
 const rows=[['SWL',m.swl],['Size',m.dims]];
 if(m.outlet)rows.push(['Outlet',m.outlet]);
 if(m.extra&&!/^(Round|Square)$/.test(m.extra))rows.push(['',m.extra]);
 rows.push(['Own weight',m.self]);
 return `<div class="card ${on?'sel':''}" tabindex="0" role="button" aria-pressed="${on}" data-code="${m.code}">
 <div class="tick">${on?'✓':''}</div>
 <div class="ph"><img src="${IMG[f.img]}" alt="${esc(f.name)}" loading="lazy"></div>
 <div class="body">
  <div><div class="code">${m.code}${/^(Round|Square)$/.test(m.extra||'')?` <span class="tag">${m.extra}</span>`:''}</div>
  <div class="capline"><span class="cap">${esc(m.cap)}</span><span style="color:var(--mute);font-size:13px">capacity</span></div></div>
  <dl class="specs">${rows.map(r=>r[0]?`<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`:`<dd style="grid-column:1/-1;text-align:left;color:var(--mute)">${esc(r[1])}</dd>`).join('')}</dl>
  <div class="pick">${on?`<div class="stepper"><label>Quantity</label><div class="qty"><button data-q="-1" aria-label="Decrease quantity">−</button><input type="number" min="1" max="999" value="${q}" aria-label="Quantity for ${m.code}"><button data-q="1" aria-label="Increase quantity">+</button></div></div>`:`<button class="btn" tabindex="-1">Select this model</button>`}</div>
 </div></div>`}

function vStd(){
 const fams=FAM.filter(f=>S.cat==='All'||f.cat===S.cat);
 return `<div class="chips">${['All',...CATS].map(c=>`<button class="chip ${S.cat===c?'on':''}" data-cat="${c}">${c}</button>`).join('')}</div>`+
 fams.map(f=>`<section class="fam"><div class="fam-head"><div><h2>${f.name}</h2><p>${esc(f.desc)}</p></div></div>
 ${f.note?`<p class="note">${esc(f.note)}</p>`:''}
 <div class="grid">${f.models.map(m=>card(f,m)).join('')}</div></section>`).join('')+
 `<div class="panel" style="text-align:center"><b>Can't find the right size?</b><p style="margin:4px 0 12px;color:var(--mute)">We fabricate to your requirements.</p><button class="btn" data-tab="custom">Request a custom-made item</button></div>`}

function vCustom(){
 const d=S.draft||(S.draft=newDraft());
 const ns=d.unsure;
 return `
<div class="purpose" style="margin-bottom:12px">Describe what you need. If you are not sure about the technical details, tick the recommendation box and we will advise.</div>
${S.customs.length?`<h2>Custom items in your enquiry</h2><div class="list">${S.customs.map((c,i)=>`<div class="item"><img src="${IMG[c.img||'c_liftframe']}" alt=""><div class="t"><b>${esc(c.type)} × ${c.qty}</b><span>${esc(customSummary(c))}</span></div><button class="btn sm" data-editc="${i}">Edit</button><button class="btn sm" data-delc="${i}" aria-label="Remove">✕</button></div>`).join('')}</div>`:''}
<div class="panel">
 <h2>${S.editing!==null?'Edit custom item':'Add a custom item'}</h2>
 <p style="margin:0;color:var(--mute);font-size:14px">Start from something similar in our past work (optional):</p>
 <div class="quick">${DATA.custom.map(c=>`<button data-quick="${c.img}" class="${d.img===c.img?'on':''}"><img src="${IMG[c.img]}" alt=""><span>${c.name}</span></button>`).join('')}</div>
 <div class="form">
  <div class="f ${d.bad?.type?'bad':''}"><label>What type of item? <small>(required)</small></label><select id="c_type"><option value="">Select…</option>${CUSTOM_TYPES.map(t=>`<option ${d.type===t?'selected':''}>${t}</option>`).concat(d.type&&!CUSTOM_TYPES.includes(d.type)?[`<option selected>${esc(d.type)}</option>`]:[]).join('')}</select><div class="err">Please choose or select a starting point above.</div></div>
  <div class="f"><label>Quantity</label><div class="qty"><button data-cq="-1" type="button" aria-label="Decrease">−</button><input type="number" id="c_qty" min="1" max="999" value="${d.qty}"><button data-cq="1" type="button" aria-label="Increase">+</button></div></div>
  <div class="f full"><label class="recommend"><input type="checkbox" id="c_unsure" ${ns?'checked':''}><span><b>I'm not sure about the specifications — please recommend</b><span>Our team will suggest suitable dimensions and capacity based on your application.</span></span></label></div>
  <div class="f full"><label>Intended application / use <small>(what will it be used for?)</small></label><input type="text" id="c_app" value="${esc(d.app)}" placeholder="e.g. lifting concrete to a 10th-floor slab"></div>
  <div class="f full"><label>Dimensions in mm <small>(if known)</small></label><div class="row3">
   <input type="number" id="c_l" placeholder="Length" value="${esc(d.l)}" ${ns?'disabled':''}><input type="number" id="c_w" placeholder="Width" value="${esc(d.w)}" ${ns?'disabled':''}><input type="number" id="c_h" placeholder="Height" value="${esc(d.h)}" ${ns?'disabled':''}><input type="number" id="c_dia" placeholder="Diameter" value="${esc(d.dia)}" ${ns?'disabled':''}></div></div>
  <div class="f"><label>Capacity <small>(m³, if known)</small></label><input type="number" step="any" id="c_cap" value="${esc(d.cap)}" ${ns?'disabled':''} placeholder="e.g. 1.5"></div>
  <div class="f"><label>Required SWL / WLL <small>(if known)</small></label><div class="row2"><input type="number" step="any" id="c_swl" value="${esc(d.swl)}" ${ns?'disabled':''} placeholder="e.g. 3"><select id="c_swlu" ${ns?'disabled':''}><option ${d.swlu==='ton'?'selected':''}>ton</option><option ${d.swlu==='kg'?'selected':''}>kg</option></select></div></div>
  <div class="f"><label>Material <small>(if known)</small></label><select id="c_mat" ${ns?'disabled':''}>${['','Mild steel','Galvanised','Stainless steel','Other'].map(o=>`<option value="${o}" ${d.mat===o?'selected':''}>${o||'Not specified'}</option>`).join('')}</select></div>
  <div class="f"><label>Other specifications <small>(optional)</small></label><input type="text" id="c_spec" value="${esc(d.spec)}" placeholder="e.g. forklift pockets, paint colour"></div>
  <div class="f full"><label>Additional remarks</label><textarea id="c_rem" placeholder="Anything else we should know?">${esc(d.rem)}</textarea></div>
  <div class="f full"><label>Drawing, sketch, photo or reference <small>(optional)</small></label>
   <div class="drop"><input type="file" id="c_files" multiple accept="image/*,.pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx"><div style="margin-top:6px">Files are not uploaded from this page. Please attach them to the email when you send your enquiry.</div>
   <ul class="files">${d.files.map(n=>`<li>📎 ${esc(n)}</li>`).join('')}</ul></div></div>
 </div>
 <div class="actions" style="justify-content:flex-start;margin-bottom:0">
  <button class="btn pri" id="addCustom">${S.editing!==null?'Save changes':'Add to enquiry'}</button>
  ${S.editing!==null?'<button class="btn" id="cancelEdit">Cancel</button>':''}
 </div>
</div>
${!S.customs.length?`<div class="empty"><span class="ic">🛠️</span>No custom items yet. Fill in the form above and press “Add to enquiry”.</div>`:''}`}
function newDraft(){return{type:'',img:null,qty:1,unsure:false,app:'',l:'',w:'',h:'',dia:'',cap:'',swl:'',swlu:'ton',mat:'',spec:'',rem:'',files:[],bad:{}}}
function customSummary(c){
 if(c.unsure)return 'Recommendation requested'+(c.app?' · '+c.app:'');
 const p=[];
 const dim=[c.l&&'L'+c.l,c.w&&'W'+c.w,c.h&&'H'+c.h,c.dia&&'Ø'+c.dia].filter(Boolean).join(' × ');
 if(dim)p.push(dim+' mm');if(c.cap)p.push(c.cap+' m³');if(c.swl)p.push('SWL '+c.swl+' '+c.swlu);if(c.mat)p.push(c.mat);
 if(c.app)p.push(c.app);
 return p.join(' · ')||'Details to be confirmed';
}
function readDraft(){
 const d=S.draft;if(!d)return;
 const g=id=>{const e=document.getElementById(id);return e?e.value:null};
 const set=(k,id)=>{const v=g(id);if(v!==null)d[k]=v};
 set('type','c_type');set('app','c_app');set('l','c_l');set('w','c_w');set('h','c_h');set('dia','c_dia');set('cap','c_cap');set('swl','c_swl');set('swlu','c_swlu');set('mat','c_mat');set('spec','c_spec');set('rem','c_rem');
 const q=g('c_qty');if(q!==null)d.qty=Math.max(1,Math.min(999,parseInt(q)||1));
 const u=document.getElementById('c_unsure');if(u)d.unsure=u.checked;
}

/* ---------- Step 3: details ---------- */
const FIELDS=[['company','Company name','text',1],['contact','Contact person','text',1],['email','Email address','email',1],['phone','Contact number','tel',1],['project','Project name / reference','text',0],['location','Delivery / site location','text',0],['date','Required delivery date','date',0]];
function vDetails(){
 const c=S.cust;
 return `
<h1>Your details</h1>
<p class="purpose">So our sales team knows who to contact and where the items are needed.</p>
<div class="panel"><div class="form">
${FIELDS.map(([k,l,t,req])=>`<div class="f ${c.bad?.[k]?'bad':''}"><label for="d_${k}">${l} ${req?'<small>(required)</small>':'<small>(optional)</small>'}</label><input id="d_${k}" type="${t}" value="${esc(c[k])}" ${k==='date'?'min="'+new Date().toISOString().slice(0,10)+'"':''} autocomplete="${({company:'organization',contact:'name',email:'email',phone:'tel'})[k]||'off'}"><div class="err">${k==='email'?'Please enter a valid email address.':'This field is required.'}</div></div>`).join('')}
<div class="f full"><label for="d_remarks">Additional remarks <small>(optional)</small></label><textarea id="d_remarks">${esc(c.remarks)}</textarea></div>
</div></div>
<div class="nav"><button class="btn" data-go="1">Back</button><button class="btn pri" id="toReview">Review enquiry</button></div>`}

function readDetails(){FIELDS.forEach(([k])=>{const e=document.getElementById('d_'+k);if(e)S.cust[k]=e.value.trim()});const r=document.getElementById('d_remarks');if(r)S.cust.remarks=r.value.trim()}
function validateDetails(){
 readDetails();const bad={};
 FIELDS.forEach(([k,,,req])=>{if(req&&!S.cust[k])bad[k]=1});
 if(S.cust.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(S.cust.email))bad.email=1;
 S.cust.bad=bad;return !Object.keys(bad).length}

/* ---------- Step 4: review ---------- */
function stdRows(){return Object.entries(S.sel).map(([code,q])=>{const {fam,m}=BYCODE[code];return{code,fam:fam.name,cap:m.cap,swl:m.swl,dims:m.dims+(m.outlet?' · outlet '+m.outlet:''),qty:q,img:fam.img}})}
function summaryHTML(forSheet){
 const c=S.cust,std=stdRows();
 return `
${std.length?`<h3 style="margin:18px 0 6px">Standard items</h3><div style="overflow-x:auto"><table class="t"><thead><tr><th>#</th><th>Model</th><th>Product</th><th>Capacity</th><th>SWL</th><th>Size</th><th>Qty</th></tr></thead><tbody>${std.map((r,i)=>`<tr><td>${i+1}</td><td><b>${r.code}</b></td><td>${esc(r.fam)}</td><td>${esc(r.cap)}</td><td>${esc(r.swl)}</td><td>${esc(r.dims)}</td><td><b>${r.qty}</b></td></tr>`).join('')}</tbody></table></div>`:''}
${S.customs.length?`<h3 style="margin:18px 0 6px">Custom-made items</h3><div style="overflow-x:auto"><table class="t"><thead><tr><th>#</th><th>Type</th><th>Requirements</th><th>Qty</th></tr></thead><tbody>${S.customs.map((x,i)=>`<tr><td>C${i+1}</td><td><b>${esc(x.type)}</b></td><td>${esc(customSummary(x))}${x.spec?'<br>Other specs: '+esc(x.spec):''}${x.rem?'<br>Remarks: '+esc(x.rem):''}${x.files.length?'<br>Attachments (to be emailed): '+esc(x.files.join(', ')):''}</td><td><b>${x.qty}</b></td></tr>`).join('')}</tbody></table></div>`:''}
<h3 style="margin:18px 0 6px">Customer</h3>
<dl class="kv"><dt>Company</dt><dd>${esc(c.company)}</dd><dt>Contact person</dt><dd>${esc(c.contact)}</dd><dt>Email</dt><dd>${esc(c.email)}</dd><dt>Phone</dt><dd>${esc(c.phone)}</dd>
${c.project?`<dt>Project / ref</dt><dd>${esc(c.project)}</dd>`:''}${c.location?`<dt>Delivery location</dt><dd>${esc(c.location)}</dd>`:''}${c.date?`<dt>Required date</dt><dd>${esc(c.date)}</dd>`:''}${c.remarks?`<dt>Remarks</dt><dd>${esc(c.remarks)}</dd>`:''}</dl>`}
function vReview(){
 return `<h1>Review your enquiry</h1>
<p class="purpose">Check everything below. Nothing is sent until you press “Submit enquiry”.</p>
<div class="panel">
 <div class="rev-h"><h2>Your items</h2><button class="btn sm" data-go="1">Edit items</button></div>
 ${summaryHTML()}
 <div class="rev-h" style="margin-top:18px"><span></span><button class="btn sm" data-go="2">Edit details</button></div>
</div>
<div class="nav"><button class="btn" data-go="2">Back</button><button class="btn pri" id="submit">Submit enquiry / Request quotation</button></div>`}

/* ---------- Done ---------- */
function makeRef(){
 const d=new Date(),p=n=>String(n).padStart(2,'0'),day=`${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}`;
 let n=1;try{const k='bkt_enq_'+day;n=(parseInt(localStorage.getItem(k))||0)+1;localStorage.setItem(k,n)}catch(e){n=Math.floor(Math.random()*900)+100}
 return `ENQ-${day}-${String(n).padStart(3,'0')}`}
function vDone(){
 return `<div class="done-hero"><div class="ok">✓</div><h1 style="margin-top:0">Your enquiry is ready to send</h1>
<p class="lead" style="margin:0 auto 12px">Reference <span class="ref">${S.ref}</span></p>
<p class="lead" style="margin:0 auto"><b>One last step:</b> press “Email to sales” to send it to our team${S.customs.some(c=>c.files.length)?', and attach your drawings or photos to that email':''}. You can also download or print a copy. Need to chase us later? Use the Follow up chat at the bottom right.</p></div>
<div class="actions"><button class="btn pri" id="mail">✉ Email to sales</button><button class="btn" id="csv">Download CSV</button><button class="btn" id="print">Print / Save as PDF</button><button class="btn" id="newEnq">Start a new enquiry</button></div>
<div class="sheet"><h2><span>Enquiry sheet</span><span style="font-size:15px;font-weight:600">${S.ref}</span></h2>
<p style="color:var(--mute);margin:0 0 4px;font-size:14px">${COMPANY} · Submitted ${new Date().toLocaleString('en-SG',{dateStyle:'medium',timeStyle:'short'})} · Quotation requested</p>
${summaryHTML(true)}</div>`}

function copyText(t,msg){
 const no=()=>toast('Copy is not available here. Select the text and copy it.');
 try{navigator.clipboard.writeText(t).then(()=>toast(msg),no)}catch(e){no()}}
function plainText(){
 const c=S.cust,L=[];
 L.push(`ENQUIRY REFERENCE: ${S.ref}`,'REQUEST FOR QUOTATION','');
 L.push('CUSTOMER',`Company: ${c.company}`,`Contact: ${c.contact}`,`Email: ${c.email}`,`Phone: ${c.phone}`);
 if(c.project)L.push(`Project / ref: ${c.project}`);if(c.location)L.push(`Delivery location: ${c.location}`);if(c.date)L.push(`Required date: ${c.date}`);
 L.push('','STANDARD ITEMS');
 const std=stdRows();if(!std.length)L.push('(none)');
 std.forEach((r,i)=>L.push(`${i+1}. ${r.code} — ${r.fam} | ${r.cap} | SWL ${r.swl} | ${r.dims} | Qty ${r.qty}`));
 L.push('','CUSTOM ITEMS');if(!S.customs.length)L.push('(none)');
 S.customs.forEach((x,i)=>{L.push(`C${i+1}. ${x.type} | Qty ${x.qty}`,`    ${customSummary(x)}`);if(x.spec)L.push(`    Other specs: ${x.spec}`);if(x.rem)L.push(`    Remarks: ${x.rem}`);if(x.files.length)L.push(`    Attachments (please attach to this email): ${x.files.join(', ')}`)});
 if(c.remarks)L.push('','REMARKS',c.remarks);
 return L.join('\n')}
function csvText(){
 const c=S.cust,q=v=>'"'+String(v??'').replace(/"/g,'""')+'"',rows=[];
 rows.push(['Enquiry reference',S.ref],['Date',new Date().toISOString().slice(0,10)],['Company',c.company],['Contact person',c.contact],['Email',c.email],['Phone',c.phone],['Project / ref',c.project],['Delivery location',c.location],['Required date',c.date],['Remarks',c.remarks],[]);
 rows.push(['Item','Type','Model / item','Product','Capacity','SWL','Size / requirements','Qty','Notes']);
 stdRows().forEach((r,i)=>rows.push([i+1,'Standard',r.code,r.fam,r.cap,r.swl,r.dims,r.qty,'']));
 S.customs.forEach((x,i)=>rows.push(['C'+(i+1),'Custom',x.type,'','',x.unsure?'':(x.swl?x.swl+' '+x.swlu:''),customSummary(x),x.qty,[x.spec&&'Specs: '+x.spec,x.rem&&'Remarks: '+x.rem,x.files.length&&'Attachments: '+x.files.join('; ')].filter(Boolean).join(' | ')]));
 return '﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n')}

/* ---------- events ---------- */
function bind(){
 const A=$('#app');
 A.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.type;go(1)});
 A.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{readDraft();go(+b.dataset.go)});
 A.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{readDraft();S.tab=b.dataset.tab;render();window.scrollTo({top:0})});
 A.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{S.cat=b.dataset.cat;render()});
 A.querySelectorAll('.card').forEach(c=>{
  const code=c.dataset.code;
  const toggle=()=>{if(S.sel[code])delete S.sel[code];else S.sel[code]=1;const y=window.scrollY;render();window.scrollTo({top:y})};
  const keep=()=>{const y=window.scrollY;render();window.scrollTo({top:y})};
  c.onclick=e=>{if(e.target.closest('.qty'))return;toggle()};
  c.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target===c){e.preventDefault();toggle()}};
  c.querySelectorAll('[data-q]').forEach(b=>b.onclick=e=>{e.stopPropagation();S.sel[code]=Math.max(1,Math.min(999,S.sel[code]+(+b.dataset.q)));keep()});
  const inp=c.querySelector('.qty input');
  if(inp){inp.onclick=e=>e.stopPropagation();inp.onchange=()=>{S.sel[code]=Math.max(1,Math.min(999,parseInt(inp.value)||1));keep()}}
 });
 const td=$('#toDetails');if(td)td.onclick=()=>{readDraft();if(!itemCount()){toast('Please select at least one item');return}go(2)};
 // custom
 A.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{readDraft();const c=DATA.custom.find(x=>x.img===b.dataset.quick);S.draft.img=c.img;S.draft.type=guessType(c.name);S.draft.rem=S.draft.rem||'Similar to: '+c.name;render()});
 A.querySelectorAll('[data-cq]').forEach(b=>b.onclick=()=>{const i=$('#c_qty');i.value=Math.max(1,Math.min(999,(parseInt(i.value)||1)+(+b.dataset.cq)))});
 const un=$('#c_unsure');if(un)un.onchange=()=>{readDraft();render()};
 const fi=$('#c_files');if(fi)fi.onchange=()=>{readDraft();S.draft.files=[...S.draft.files,...[...fi.files].map(f=>f.name)];render()};
 const ac=$('#addCustom');if(ac)ac.onclick=()=>{
  readDraft();const d=S.draft;
  if(!d.type){d.bad={type:1};render();toast('Please choose the type of item');return}
  const item={...d};delete item.bad;
  if(S.editing!==null){S.customs[S.editing]=item;S.editing=null}else S.customs.push(item);
  S.draft=newDraft();render();toast('Custom item added');window.scrollTo({top:0})};
 const ce=$('#cancelEdit');if(ce)ce.onclick=()=>{S.editing=null;S.draft=newDraft();render()};
 A.querySelectorAll('[data-editc]').forEach(b=>b.onclick=()=>{readDraft();S.editing=+b.dataset.editc;S.draft={...S.customs[S.editing],bad:{}};render();window.scrollTo({top:document.querySelector('.panel').offsetTop-20})});
 A.querySelectorAll('[data-delc]').forEach(b=>b.onclick=()=>{readDraft();S.customs.splice(+b.dataset.delc,1);S.editing=null;render()});
 // details & review
 const tr=$('#toReview');if(tr)tr.onclick=()=>{if(validateDetails()){go(3)}else{render();toast('Please complete the required fields');const e=document.querySelector('.f.bad');e&&e.scrollIntoView({block:'center'})}};
 const sb=$('#submit');if(sb)sb.onclick=()=>{S.ref=makeRef();go(4)};
 const m=$('#mail');if(m)m.onclick=()=>{location.href=`mailto:${SALES_EMAIL}?subject=${encodeURIComponent('['+S.ref+'] Enquiry — '+S.cust.company)}&body=${encodeURIComponent(plainText())}`};
 const cv=$('#csv');if(cv)cv.onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csvText()],{type:'text/csv'}));a.download=S.ref+'.csv';a.click()};
 const pr=$('#print');if(pr)pr.onclick=()=>window.print();
 const ne=$('#newEnq');if(ne)ne.onclick=()=>{S.sel={};S.customs=[];S.cust={};S.ref=null;S.draft=null;S.editing=null;S.cat='All';go(0)};
}
function guessType(n){n=n.toLowerCase();
 if(/man|basket/.test(n))return'Man cage / basket';if(/cage/.test(n))return'Storage / transfer cage';if(/hopper/.test(n)&&!/self/.test(n))return'Hopper';
 if(/frame|spreader/.test(n))return'Lifting frame / spreader beam';if(/tank|trolley/.test(n))return'Tank / other fabrication';return'Concrete bucket'}

/* ---------- Follow-up chat ---------- */
const CHAT={open:false,msgs:[{who:'bot',text:'Hi. Following up on an enquiry? Pick an option or type your message.'}],ref:''};
const QUICK=['Where is my quotation?','I need to change my enquiry','I want to add an item','I need to speak to someone'];
const chatRef=()=>S.ref||CHAT.ref||'';
function chatBody(){
 const c=S.cust,L=['Enquiry reference: '+(chatRef()||'(not given)'),''];
 if(c.company)L.push('Company: '+c.company);if(c.contact)L.push('Contact: '+c.contact);if(c.phone)L.push('Phone: '+c.phone);if(c.email)L.push('Email: '+c.email);
 L.push('');CHAT.msgs.filter(m=>m.who==='me').forEach(m=>L.push(m.text));
 return L.join('\n')}
function chatLog(){
 const el=document.getElementById('chatLog');if(!el)return;
 el.innerHTML=CHAT.msgs.map(m=>`<div class="msg ${m.who}">${esc(m.text)}${m.acts?`<div class="acts"><button class="btn pri sm" data-chat="mail">Email sales</button><button class="btn sm" data-chat="copy">Copy message</button></div>`:''}</div>`).join('');
 const q=document.querySelector('#chat .qr');if(q)q.hidden=CHAT.msgs.some(m=>m.who==='me');
 el.scrollTop=el.scrollHeight}
function chatRender(){
 const root=document.getElementById('chat');if(!root)return;
 root.classList.toggle('up',S.step===1);
 const ref=S.ref;
 root.innerHTML=`<section class="chatbox" id="chatPanel" role="dialog" aria-label="Follow up with sales" ${CHAT.open?'':'hidden'}>
  <header><div><b>Follow up with sales</b><small>Pollisum Fabrication · Tel (65) 6755 7600</small></div><button id="chatClose" aria-label="Close chat">✕</button></header>
  <div class="refrow"><label for="chatRef">Enquiry reference</label><input id="chatRef" type="text" placeholder="e.g. ENQ-20261007-001" value="${esc(ref||CHAT.ref)}" ${ref?'readonly':''}></div>
  <div class="log" id="chatLog" aria-live="polite"></div>
  <div class="qr">${QUICK.map(q=>`<button type="button" data-q2="${esc(q)}">${esc(q)}</button>`).join('')}</div>
  <form id="chatForm"><input id="chatIn" type="text" placeholder="Type your message" autocomplete="off" aria-label="Your message"><button class="btn pri sm" type="submit">Send</button></form>
 </section>
 <button class="fab" id="chatFab" aria-expanded="${CHAT.open}" aria-controls="chatPanel"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>${CHAT.open?'Close':'Follow up'}</button>`;
 chatLog();
 if(CHAT.open){const i=document.getElementById('chatIn');i&&i.focus()}}
function chatSend(text){
 text=(text||'').trim();if(!text)return;
 CHAT.msgs.push({who:'me',text});
 const ref=chatRef();
 CHAT.msgs.push({who:'bot',acts:true,text:(ref?`Thanks. I have noted this against ${ref}.`:'Thanks. Add your enquiry reference above so sales can find your enquiry.')+`\n\nThis chat does not send by itself. Email it to ${SALES_EMAIL} (the reference goes in the subject) or call (65) 6755 7600, and our sales team will reply.`});
 chatLog()}
(function(){
 const root=document.getElementById('chat');
 root.addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;
  if(t.id==='chatFab'){CHAT.open=!CHAT.open;chatRender();return}
  if(t.id==='chatClose'){CHAT.open=false;chatRender();return}
  if(t.dataset.q2){chatSend(t.dataset.q2);return}
  if(t.dataset.chat==='mail'){if(!chatRef()){toast('Enter your enquiry reference first');const r=document.getElementById('chatRef');r&&r.focus();return}location.href=`mailto:${SALES_EMAIL}?subject=${encodeURIComponent('['+chatRef()+'] Follow-up'+(S.cust.company?' — '+S.cust.company:''))}&body=${encodeURIComponent(chatBody())}`}
  if(t.dataset.chat==='copy')copyText(chatBody(),'Message copied');
 });
 root.addEventListener('submit',e=>{e.preventDefault();const i=document.getElementById('chatIn');chatSend(i.value);i.value='';i.focus()});
 root.addEventListener('input',e=>{if(e.target.id==='chatRef')CHAT.ref=e.target.value.trim()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&CHAT.open){CHAT.open=false;chatRender();const f=document.getElementById('chatFab');f&&f.focus()}});
})();
const _render=render;render=function(){_render();const r=document.getElementById('chat');if(r)r.classList.toggle('up',S.step===1);const i=document.getElementById('chatRef');if(i&&S.ref){i.value=S.ref;i.readOnly=true}};
chatRender();
render();
