const state = {
  event: { name: 'Acara Baru', date: '', location: '', note: '', baseRate: 0, installRate: 0, removeRate: 0 },
  employees: [], items: [], tasks: {}
};

const $ = id => document.getElementById(id);
const rupiah = n => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Math.round(n || 0));
const key = (e,i,a) => `${e}:${i}:${a}`;
const uid = p => `${p}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;

function addEmployee(name='') { const id=uid('emp'); state.employees.push({id,name:name||`Karyawan ${state.employees.length+1}`,present:true}); render(); }
function addItem(name='',qty=1,mode='per-person',bundleRate=0) { state.items.push({id:uid('item'),name:name||`Barang ${state.items.length+1}`,qty:Number(qty)||1,mode,bundleRate,singleActionFactor:.5,installRate:0,removeRate:0}); render(); }
function addTenda(){addItem('Tenda',1,'crew-bundle',75000)}
function addPanggung(){addItem('Panggung 4x6 Meter',1,'crew-bundle',100000)}
function removeEmployee(id){state.employees=state.employees.filter(e=>e.id!==id);Object.keys(state.tasks).forEach(k=>{if(k.startsWith(`${id}:`))delete state.tasks[k]});render()}
function removeItem(id){state.items=state.items.filter(i=>i.id!==id);Object.keys(state.tasks).forEach(k=>{if(k.includes(`:${id}:`))delete state.tasks[k]});render()}

function readInputs(){
  state.event.name=$('eventName').value.trim()||'Acara Baru'; state.event.date=$('eventDate').value; state.event.location=$('eventLocation').value.trim(); state.event.note=$('eventNote').value.trim();
  state.event.baseRate=Number($('baseRate').value)||0; state.event.installRate=Number($('installRate').value)||0; state.event.removeRate=Number($('removeRate').value)||0;
  state.employees.forEach(e=>{const n=document.querySelector(`[data-employee-name="${e.id}"]`),p=document.querySelector(`[data-attendance="${e.id}"]`);if(n)e.name=n.value.trim()||'Tanpa Nama';if(p)e.present=p.checked});
  state.items.forEach(i=>{const n=document.querySelector(`[data-item-name="${i.id}"]`),q=document.querySelector(`[data-item-qty="${i.id}"]`),m=document.querySelector(`[data-item-mode="${i.id}"]`),b=document.querySelector(`[data-item-bundle="${i.id}"]`),f=document.querySelector(`[data-item-factor="${i.id}"]`),ir=document.querySelector(`[data-item-install="${i.id}"]`),rr=document.querySelector(`[data-item-remove="${i.id}"]`);if(n)i.name=n.value.trim()||'Tanpa Nama';if(q)i.qty=Math.max(0,Number(q.value)||0);if(m)i.mode=m.value;if(b)i.bundleRate=Math.max(0,Number(b.value)||0);if(f)i.singleActionFactor=Math.min(1,Math.max(0,Number(f.value)||0));if(ir)i.installRate=Math.max(0,Number(ir.value)||0);if(rr)i.removeRate=Math.max(0,Number(rr.value)||0)})
}
function setTask(e,i,a,v){state.tasks[key(e,i,a)]=v;calculate()}
function participantsFor(i, action=null){return state.employees.filter(e=>e.present && (action ? state.tasks[key(e.id,i.id,action)] : (state.tasks[key(e.id,i.id,'install')]||state.tasks[key(e.id,i.id,'remove')])));}

// Untuk borongan crew, harga B+P adalah TOTAL satu unit.
// Harga dibagi menjadi 50% untuk pasang dan 50% untuk bongkar.
// Masing-masing bagian hanya dibagi kepada crew yang benar-benar mengerjakan bagian tersebut.
function itemCrewPools(i){
  const installPool = i.qty * i.bundleRate * i.singleActionFactor;
  const removePool = i.qty * i.bundleRate * i.singleActionFactor;
  return { installPool, removePool, totalAvailable: installPool + removePool };
}
function itemPayByEmployee(i,e){
  if(!e.present)return 0;
  const ins=!!state.tasks[key(e.id,i.id,'install')], rem=!!state.tasks[key(e.id,i.id,'remove')];
  if(i.mode==='crew-bundle'){
    const installParticipants=participantsFor(i,'install');
    const removeParticipants=participantsFor(i,'remove');
    const pools=itemCrewPools(i);
    const installShare=ins && installParticipants.length ? pools.installPool/installParticipants.length : 0;
    const removeShare=rem && removeParticipants.length ? pools.removePool/removeParticipants.length : 0;
    return installShare + removeShare;
  }
  return (ins?i.qty*i.installRate:0)+(rem?i.qty*i.removeRate:0);
}

function renderEmployees(){const list=$('employeeList');if(!state.employees.length){list.innerHTML='<p class="muted">Belum ada karyawan.</p>';return}list.innerHTML=state.employees.map(e=>`<div class="employee-row"><input data-employee-name="${e.id}" type="text" value="${escapeHtml(e.name)}"><button class="icon-btn remove-employee" data-id="${e.id}" type="button">×</button></div>`).join('');list.querySelectorAll('.remove-employee').forEach(b=>b.onclick=()=>removeEmployee(b.dataset.id));list.querySelectorAll('[data-employee-name]').forEach(x=>x.oninput=()=>{readInputs();calculate()})}
function renderItems(){const list=$('itemList');if(!state.items.length){list.innerHTML='<p class="muted">Belum ada barang.</p>';return}list.innerHTML=state.items.map(i=>`<div class="item-row"><div class="item-main"><input data-item-name="${i.id}" type="text" value="${escapeHtml(i.name)}"></div><label>Qty<input data-item-qty="${i.id}" type="number" min="0" value="${i.qty}"></label><label>Model<select data-item-mode="${i.id}"><option value="crew-bundle" ${i.mode==='crew-bundle'?'selected':''}>Borongan crew</option><option value="per-person" ${i.mode==='per-person'?'selected':''}>Per orang</option></select></label><label>B+P / unit<input data-item-bundle="${i.id}" type="number" min="0" value="${i.bundleRate}" ${i.mode!=='crew-bundle'?'disabled':''}></label><label>1 sisi<input data-item-factor="${i.id}" type="number" min="0" max="1" step=".05" value="${i.singleActionFactor}" ${i.mode!=='crew-bundle'?'disabled':''}></label><label>Pasang / unit<input data-item-install="${i.id}" type="number" min="0" value="${i.installRate}" ${i.mode!=='per-person'?'disabled':''}></label><label>Bongkar / unit<input data-item-remove="${i.id}" type="number" min="0" value="${i.removeRate}" ${i.mode!=='per-person'?'disabled':''}></label><button class="icon-btn remove-item" data-id="${i.id}" type="button">×</button></div>`).join('');list.querySelectorAll('.remove-item').forEach(b=>b.onclick=()=>removeItem(b.dataset.id));list.querySelectorAll('input,select').forEach(x=>x.oninput=()=>{readInputs();renderItems();renderMatrix();calculate()});list.querySelectorAll('select').forEach(x=>x.onchange=()=>{readInputs();renderItems();renderMatrix();calculate()})}
function renderMatrix(){const wrap=$('matrixWrap');if(!state.employees.length||!state.items.length){wrap.innerHTML='<p class="muted" style="padding:16px">Tambahkan minimal 1 karyawan dan 1 barang.</p>';return}const heads=state.items.map(i=>`<th colspan="2"><span class="group-head">${escapeHtml(i.name)}</span><br><small>${i.qty} unit · ${i.mode==='crew-bundle'?rupiah(i.bundleRate)+' / unit crew':'per orang'}</small></th>`).join('');const actions=state.items.map(()=>'<th>Pasang</th><th>Bongkar</th>').join('');const rows=state.employees.map(e=>`<tr><td><div class="employee-attendance"><input class="check" type="checkbox" data-attendance="${e.id}" ${e.present?'checked':''}><strong>${escapeHtml(e.name)}</strong></div></td>${state.items.map(i=>`<td><input class="check" type="checkbox" data-task="${key(e.id,i.id,'install')}" ${state.tasks[key(e.id,i.id,'install')]?'checked':''} ${!e.present?'disabled':''}></td><td><input class="check" type="checkbox" data-task="${key(e.id,i.id,'remove')}" ${state.tasks[key(e.id,i.id,'remove')]?'checked':''} ${!e.present?'disabled':''}></td>`).join('')}</tr>`).join('');wrap.innerHTML=`<table><thead><tr><th rowspan="2">Karyawan / Hadir</th>${heads}</tr><tr>${actions}</tr></thead><tbody>${rows}</tbody></table>`;wrap.querySelectorAll('[data-task]').forEach(x=>x.onchange=()=>{const [e,i,a]=x.dataset.task.split(':');setTask(e,i,a,x.checked);renderMatrix();});wrap.querySelectorAll('[data-attendance]').forEach(x=>x.onchange=()=>{const e=state.employees.find(e=>e.id===x.dataset.attendance);if(e)e.present=x.checked;renderMatrix();calculate()})}
function calculate(){const rows=state.employees.map(e=>{const attendance=e.present?state.event.baseRate:0,workPay=state.items.reduce((s,i)=>s+itemPayByEmployee(i,e),0);return{e,attendance,workPay,total:attendance+workPay}}),total=rows.reduce((s,r)=>s+r.total,0);$('grandTotal').textContent=rupiah(total);$('workSummary').textContent=`${state.employees.length} karyawan · ${state.items.length} barang`;$('payrollSummary').innerHTML=rows.length?`<div class="pay-row pay-head"><span>Karyawan</span><span>Hadir</span><span>Kerja</span><span>Total</span></div>${rows.map(r=>`<div class="pay-row"><span class="pay-name">${escapeHtml(r.e.name)}</span><span class="pay-number">${r.e.present?rupiah(r.attendance):'Tidak hadir'}</span><span class="pay-number">${rupiah(r.workPay)}</span><span class="pay-total">${rupiah(r.total)}</span></div>`).join('')}`:'<p class="muted">Belum ada data karyawan.</p>';$('itemSummary').innerHTML=state.items.length?state.items.map(i=>{const ip=participantsFor(i,'install'),rp=participantsFor(i,'remove'),pools=itemCrewPools(i);return`<div class="item-summary-row"><span><strong>${escapeHtml(i.name)}</strong> × ${i.qty}</span><span>Pasang: ${ip.length} crew / ${rupiah(pools.installPool)} · Bongkar: ${rp.length} crew / ${rupiah(pools.removePool)}</span></div>`}).join(''):'<p class="muted">Belum ada barang.</p>'}
function render(){$('eventName').value=state.event.name;$('eventDate').value=state.event.date;$('eventLocation').value=state.event.location;$('eventNote').value=state.event.note;$('baseRate').value=state.event.baseRate;$('installRate').value=state.event.installRate;$('removeRate').value=state.event.removeRate;$('eventTitle').textContent=state.event.name||'Acara Baru';renderEmployees();renderItems();renderMatrix();calculate()}
function escapeHtml(v){return String(v).replace(/[&<>\'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function save(){readInputs();localStorage.setItem('gaji-karyawan-v2',JSON.stringify(state));const old=$('saveBtn').textContent;$('saveBtn').textContent='Tersimpan ✓';setTimeout(()=>$('saveBtn').textContent=old,1300)}
function load(){try{const s=JSON.parse(localStorage.getItem('gaji-karyawan-v2'));if(!s)return;Object.assign(state.event,s.event||{});state.employees=s.employees||[];state.items=(s.items||[]).map(i=>({mode:'per-person',bundleRate:0,singleActionFactor:.5,installRate:0,removeRate:0,...i}));state.tasks=s.tasks||{}}catch(_){} }
function reset(){if(!confirm('Hapus seluruh data acara yang tersimpan di browser?'))return;localStorage.removeItem('gaji-karyawan-v2');state.event={name:'Acara Baru',date:'',location:'',note:'',baseRate:0,installRate:0,removeRate:0};state.employees=[];state.items=[];state.tasks={};render()}
function exportJson(){readInputs();const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${(state.event.name||'acara').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.json`;a.click();URL.revokeObjectURL(url)}
['eventName','eventDate','eventLocation','eventNote','baseRate','installRate','removeRate'].forEach(id=>$(id).oninput=()=>{readInputs();$('eventTitle').textContent=state.event.name||'Acara Baru';calculate()});
$('addEmployeeBtn').onclick=()=>addEmployee();$('addItemBtn').onclick=()=>addItem();$('addTendaBtn').onclick=addTenda;$('addPanggungBtn').onclick=addPanggung;$('saveBtn').onclick=save;$('resetBtn').onclick=reset;$('exportBtn').onclick=exportJson;load();render();
