const state = {
  event: { name: 'Acara Baru', date: '', location: '', note: '', baseRate: 100000, installRate: 10000, removeRate: 10000 },
  employees: [],
  items: [],
  tasks: {}
};

const $ = (id) => document.getElementById(id);
const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.round(n || 0));
const key = (employeeId, itemId, action) => `${employeeId}:${itemId}:${action}`;
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function addEmployee(name = '') {
  const id = uid('emp');
  state.employees.push({ id, name: name || `Karyawan ${state.employees.length + 1}`, present: true });
  render();
}

function addItem(name = '', qty = 1, mode = 'per-person', bundleRate = 0) {
  state.items.push({ id: uid('item'), name: name || `Barang ${state.items.length + 1}`, qty: Number(qty) || 1, mode, bundleRate, singleActionFactor: 0.5, installRate: 0, removeRate: 0 });
  render();
}

function addTenda() { addItem('Tenda', 1, 'crew-bundle', 75000); }
function addPanggung() { addItem('Panggung 4x6 Meter', 1, 'crew-bundle', 100000); }

function removeEmployee(id) {
  state.employees = state.employees.filter(e => e.id !== id);
  Object.keys(state.tasks).forEach(k => { if (k.startsWith(`${id}:`)) delete state.tasks[k]; });
  render();
}

function removeItem(id) {
  state.items = state.items.filter(i => i.id !== id);
  Object.keys(state.tasks).forEach(k => { if (k.includes(`:${id}:`)) delete state.tasks[k]; });
  render();
}

function readInputs() {
  state.event.name = $('eventName').value.trim() || 'Acara Baru';
  state.event.date = $('eventDate').value;
  state.event.location = $('eventLocation').value.trim();
  state.event.note = $('eventNote').value.trim();
  state.event.baseRate = Number($('baseRate').value) || 0;
  state.event.installRate = Number($('installRate').value) || 0;
  state.event.removeRate = Number($('removeRate').value) || 0;

  state.employees.forEach(e => {
    const input = document.querySelector(`[data-employee-name="${e.id}"]`);
    if (input) e.name = input.value.trim() || 'Tanpa Nama';
    const present = document.querySelector(`[data-attendance="${e.id}"]`);
    if (present) e.present = present.checked;
  });

  state.items.forEach(i => {
    const name = document.querySelector(`[data-item-name="${i.id}"]`);
    const qty = document.querySelector(`[data-item-qty="${i.id}"]`);
    const mode = document.querySelector(`[data-item-mode="${i.id}"]`);
    const bundle = document.querySelector(`[data-item-bundle="${i.id}"]`);
    const factor = document.querySelector(`[data-item-factor="${i.id}"]`);
    const install = document.querySelector(`[data-item-install="${i.id}"]`);
    const remove = document.querySelector(`[data-item-remove="${i.id}"]`);
    if (name) i.name = name.value.trim() || 'Tanpa Nama';
    if (qty) i.qty = Math.max(0, Number(qty.value) || 0);
    if (mode) i.mode = mode.value;
    if (bundle) i.bundleRate = Math.max(0, Number(bundle.value) || 0);
    if (factor) i.singleActionFactor = Math.min(1, Math.max(0, Number(factor.value) || 0));
    if (install) i.installRate = Math.max(0, Number(install.value) || 0);
    if (remove) i.removeRate = Math.max(0, Number(remove.value) || 0);
  });
}

function setTask(employeeId, itemId, action, value) {
  state.tasks[key(employeeId, itemId, action)] = value;
  calculate();
}

function participantsFor(item) {
  return state.employees.filter(e => e.present && (
    state.tasks[key(e.id, item.id, 'install')] || state.tasks[key(e.id, item.id, 'remove')]
  ));
}

function itemCrewPool(item) {
  const participants = participantsFor(item);
  if (!participants.length) return 0;
  const hasInstall = participants.some(e => state.tasks[key(e.id, item.id, 'install')]);
  const hasRemove = participants.some(e => state.tasks[key(e.id, item.id, 'remove')]);
  const factor = hasInstall && hasRemove ? 1 : item.singleActionFactor;
  return item.qty * item.bundleRate * factor;
}

function itemPayByEmployee(item, employee) {
  if (!employee.present) return 0;
  const install = !!state.tasks[key(employee.id, item.id, 'install')];
  const remove = !!state.tasks[key(employee.id, item.id, 'remove')];
  if (item.mode === 'crew-bundle') {
    const participants = participantsFor(item);
    return participants.length ? itemCrewPool(item) / participants.length : 0;
  }
  return (install ? item.qty * item.installRate : 0) + (remove ? item.qty * item.removeRate : 0);
}

function renderEmployees() {
  const list = $('employeeList');
  if (!state.employees.length) {
    list.innerHTML = '<p class="muted">Belum ada karyawan. Tambahkan karyawan untuk mulai membuat absensi.</p>';
    return;
  }
  list.innerHTML = state.employees.map(e => `
    <div class="employee-row">
      <input data-employee-name="${e.id}" type="text" value="${escapeHtml(e.name)}" aria-label="Nama karyawan">
      <button class="icon-btn remove-employee" data-id="${e.id}" type="button" title="Hapus">×</button>
    </div>
  `).join('');
  list.querySelectorAll('.remove-employee').forEach(btn => btn.addEventListener('click', () => removeEmployee(btn.dataset.id)));
  list.querySelectorAll('[data-employee-name]').forEach(input => input.addEventListener('input', () => { readInputs(); calculate(); }));
}

function renderItems() {
  const list = $('itemList');
  if (!state.items.length) {
    list.innerHTML = '<p class="muted">Belum ada barang. Tambahkan barang yang dipasang atau dibongkar.</p>';
    return;
  }
  list.innerHTML = state.items.map(i => `
    <div class="item-row">
      <div class="item-main"><input data-item-name="${i.id}" class="item-name" type="text" value="${escapeHtml(i.name)}" aria-label="Nama barang"></div>
      <label>Qty<input data-item-qty="${i.id}" type="number" min="0" value="${i.qty}"></label>
      <label>Model<select data-item-mode="${i.id}"><option value="crew-bundle" ${i.mode === 'crew-bundle' ? 'selected' : ''}>Borongan crew</option><option value="per-person" ${i.mode === 'per-person' ? 'selected' : ''}>Per orang</option></select></label>
      <label class="bundle-fields">B+P / unit<input data-item-bundle="${i.id}" type="number" min="0" value="${i.bundleRate}" ${i.mode !== 'crew-bundle' ? 'disabled' : ''}></label>
      <label class="bundle-fields">1 sisi<input data-item-factor="${i.id}" type="number" min="0" max="1" step="0.05" value="${i.singleActionFactor}" ${i.mode !== 'crew-bundle' ? 'disabled' : ''}></label>
      <label class="person-fields">Pasang / unit<input data-item-install="${i.id}" type="number" min="0" value="${i.installRate}" ${i.mode !== 'per-person' ? 'disabled' : ''}></label>
      <label class="person-fields">Bongkar / unit<input data-item-remove="${i.id}" type="number" min="0" value="${i.removeRate}" ${i.mode !== 'per-person' ? 'disabled' : ''}></label>
      <button class="icon-btn remove-item" data-id="${i.id}" type="button" title="Hapus">×</button>
    </div>
  `).join('');
  list.querySelectorAll('.remove-item').forEach(btn => btn.addEventListener('click', () => removeItem(btn.dataset.id)));
  list.querySelectorAll('input,select').forEach(input => input.addEventListener('input', () => { readInputs(); renderItems(); renderMatrix(); calculate(); }));
  list.querySelectorAll('select').forEach(select => select.addEventListener('change', () => { readInputs(); renderItems(); renderMatrix(); calculate(); }));
}

function renderMatrix() {
  const wrap = $('matrixWrap');
  if (!state.employees.length || !state.items.length) {
    wrap.innerHTML = '<p class="muted" style="padding:16px">Tambahkan minimal 1 karyawan dan 1 barang untuk melihat matriks pembagian kerja.</p>';
    return;
  }
  const itemHeaders = state.items.map(i => `<th colspan="2"><span class="group-head">${escapeHtml(i.name)}</span><br><small>${i.qty} unit · ${i.mode === 'crew-bundle' ? rupiah(i.bundleRate) + ' / unit crew' : 'tarif per orang'}</small></th>`).join('');
  const actionHeaders = state.items.map(() => '<th>Pasang</th><th>Bongkar</th>').join('');
  const rows = state.employees.map(e => {
    const cells = state.items.map(i => `
      <td><input class="check" type="checkbox" ${state.tasks[key(e.id, i.id, 'install')] ? 'checked' : ''} ${!e.present ? 'disabled' : ''} data-task="${key(e.id, i.id, 'install')}" aria-label="${escapeHtml(e.name)} pasang ${escapeHtml(i.name)}"></td>
      <td><input class="check" type="checkbox" ${state.tasks[key(e.id, i.id, 'remove')] ? 'checked' : ''} ${!e.present ? 'disabled' : ''} data-task="${key(e.id, i.id, 'remove')}" aria-label="${escapeHtml(e.name)} bongkar ${escapeHtml(i.name)}"></td>
    `).join('');
    return `<tr><td><div class="employee-attendance"><input class="check" type="checkbox" data-attendance="${e.id}" ${e.present ? 'checked' : ''}> <strong>${escapeHtml(e.name)}</strong></div></td>${cells}</tr>`;
  }).join('');
  wrap.innerHTML = `<table><thead><tr><th rowspan="2">Karyawan / Hadir</th>${itemHeaders}</tr><tr>${actionHeaders}</tr></thead><tbody>${rows}</tbody></table>`;
  wrap.querySelectorAll('[data-task]').forEach(input => input.addEventListener('change', () => { const [employeeId, itemId, action] = input.dataset.task.split(':'); setTask(employeeId, itemId, action, input.checked); }));
  wrap.querySelectorAll('[data-attendance]').forEach(input => input.addEventListener('change', () => { const employee = state.employees.find(e => e.id === input.dataset.attendance); if (employee) employee.present = input.checked; renderMatrix(); calculate(); }));
}

function calculate() {
  const rows = state.employees.map(e => {
    const attendance = e.present ? state.event.baseRate : 0;
    const itemPays = state.items.map(i => itemPayByEmployee(i, e));
    const workPay = itemPays.reduce((a, b) => a + b, 0);
    return { e, attendance, workPay, total: attendance + workPay };
  });
  const total = rows.reduce((sum, r) => sum + r.total, 0);
  $('grandTotal').textContent = rupiah(total);
  $('workSummary').textContent = `${state.employees.length} karyawan · ${state.items.length} barang`;
  $('payrollSummary').innerHTML = rows.length ? `
    <div class="pay-row pay-head"><span>Karyawan</span><span>Hadir</span><span>Kerja</span><span>Total</span></div>
    ${rows.map(r => `<div class="pay-row"><span class="pay-name">${escapeHtml(r.e.name)}</span><span class="pay-number">${r.e.present ? rupiah(r.attendance) : 'Tidak hadir'}</span><span class="pay-number">${rupiah(r.workPay)}</span><span class="pay-total">${rupiah(r.total)}</span></div>`).join('')}
  ` : '<p class="muted">Belum ada data karyawan.</p>';

  $('itemSummary').innerHTML = state.items.length ? state.items.map(i => {
    const participants = participantsFor(i);
    const pool = itemCrewPool(i);
    return `<div class="item-summary-row"><span><strong>${escapeHtml(i.name)}</strong> × ${i.qty}</span><span>${participants.length} crew · pool ${rupiah(pool)}</span></div>`;
  }).join('') : '<p class="muted">Belum ada barang.</p>';
}

function render() {
  $('eventName').value = state.event.name;
  $('eventDate').value = state.event.date;
  $('eventLocation').value = state.event.location;
  $('eventNote').value = state.event.note;
  $('baseRate').value = state.event.baseRate;
  $('installRate').value = state.event.installRate;
  $('removeRate').value = state.event.removeRate;
  $('eventTitle').textContent = state.event.name || 'Acara Baru';
  renderEmployees(); renderItems(); renderMatrix(); calculate();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function save() {
  readInputs();
  localStorage.setItem('gaji-karyawan-v2', JSON.stringify(state));
  $('eventTitle').textContent = state.event.name;
  const old = $('saveBtn').textContent;
  $('saveBtn').textContent = 'Tersimpan ✓';
  setTimeout(() => $('saveBtn').textContent = old, 1300);
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem('gaji-karyawan-v2'));
    if (!saved) return;
    Object.assign(state.event, saved.event || {});
    state.employees = saved.employees || [];
    state.items = saved.items || [];
    state.tasks = saved.tasks || {};
    state.items = state.items.map(i => ({ mode: 'per-person', bundleRate: 0, singleActionFactor: 0.5, installRate: 0, removeRate: 0, ...i }));
  } catch (_) {}
}

function reset() {
  if (!confirm('Hapus seluruh data acara yang tersimpan di browser?')) return;
  localStorage.removeItem('gaji-karyawan-v2');
  state.event = { name: 'Acara Baru', date: '', location: '', note: '', baseRate: 100000, installRate: 10000, removeRate: 10000 };
  state.employees = []; state.items = []; state.tasks = {}; render();
}

function exportJson() {
  readInputs();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
  a.download = `${(state.event.name || 'acara').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`; a.click(); URL.revokeObjectURL(url);
}

['eventName','eventDate','eventLocation','eventNote','baseRate','installRate','removeRate'].forEach(id => $(id).addEventListener('input', () => { readInputs(); $('eventTitle').textContent = state.event.name || 'Acara Baru'; calculate(); }));
$('addEmployeeBtn').addEventListener('click', () => addEmployee());
$('addItemBtn').addEventListener('click', () => addItem());
$('addTendaBtn').addEventListener('click', addTenda);
$('addPanggungBtn').addEventListener('click', addPanggung);
$('saveBtn').addEventListener('click', save); $('resetBtn').addEventListener('click', reset); $('exportBtn').addEventListener('click', exportJson);
load(); render();
