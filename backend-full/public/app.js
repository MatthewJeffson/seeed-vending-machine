const state = { dashboard: null, selectedProductId: null };
const $ = (id) => document.getElementById(id);

async function api(path, opts = {}) {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || 'Request failed');
  return data;
}
function money(value) { return `$${Number(value || 0).toFixed(2)}`; }
function statusClass(status) { return `<span class="status ${status}">${status}</span>`; }
function stockBadge(product) {
  if (product.inventory <= 0) return '<span class="stock-pill out">Out of stock</span>';
  if (product.inventory <= product.low_stock_threshold) return '<span class="stock-pill low">Low stock</span>';
  return '<span class="stock-pill ok">In stock</span>';
}
function showToast(message) {
  const toast = $('toast'); toast.textContent = message; toast.classList.remove('hidden');
  clearTimeout(showToast._timer); showToast._timer = setTimeout(() => toast.classList.add('hidden'), 3000);
}
function productById(id) { return state.dashboard?.products?.find(item => item.product_id === id) || null; }
function tableHead(cols) { return '<tr>' + cols.map(col => `<th>${col}</th>`).join('') + '</tr>'; }

function renderMetrics() {
  const m = state.dashboard.metrics;
  const cards = [
    ['Products', m.product_count, 'Configured SKUs'], ['Customers', m.customer_count, 'Unique user_name records'],
    ['Orders', m.order_count, 'All orders created'], ['Pending', m.pending_count, 'Awaiting use / dispense'],
    ['Completed', m.completed_count, 'Successfully dispensed'], ['Writer Jobs', m.writer_pending_count, 'Pending / claimed RFID writes'],
    ['Units Left', m.inventory_units_total, 'All physical stock'], ['Revenue', money(m.total_revenue), 'Paid amount recorded']
  ];
  $('metrics').innerHTML = cards.map(([label, value, sub]) => `<article class="metric-card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-sub">${sub}</div></article>`).join('');
}

function renderProducts() {
  const products = state.dashboard.products;
  $('productGrid').innerHTML = products.map(product => `<article class="product-card ${product.product_id === state.selectedProductId ? 'selected' : ''}" data-product-id="${product.product_id}"><div class="product-image-wrap"><img src="${product.image_path}" alt="${product.product_name}" /></div><div class="product-card-body"><div class="card-head"><div><div class="tag">${product.tag}</div><h3>${product.product_name}</h3></div><div class="price">${money(product.price)}</div></div><div class="stock-row">${stockBadge(product)}<span>${product.inventory} left • slot ${product.slot_id} • servo ${product.servo_id}</span></div><p>${product.description}</p><ul class="feature-list"><li>${product.feature_1}</li><li>${product.feature_2}</li><li>${product.feature_3}</li></ul><div><a class="text-link" href="${product.product_url}" target="_blank" rel="noreferrer">Official product page ↗</a></div></div></article>`).join('');
  [...document.querySelectorAll('.product-card')].forEach(card => card.addEventListener('click', () => { state.selectedProductId = card.dataset.productId; renderProducts(); renderSelectedProduct(); }));
}
function renderSelectedProduct() {
  const product = productById(state.selectedProductId); const box = $('selectedProductCard');
  if (!product) { box.className = 'selected-card empty-state'; box.innerHTML = 'Select a product card to begin.'; return; }
  box.className = 'selected-card'; $('amount_paid').placeholder = `Recommended: ${money(product.price)}`;
  box.innerHTML = `<img src="${product.image_path}" alt="${product.product_name}" /><div><div class="tag">Selected</div><h3>${product.product_name}</h3><p>${product.description}</p><div class="stock-row">${stockBadge(product)}<span>${product.inventory} left • price ${money(product.price)}</span></div><ul class="feature-list"><li>${product.feature_1}</li><li>${product.feature_2}</li><li>${product.feature_3}</li></ul></div>`;
}

function renderWriterPanel() {
  const s = state.dashboard.writer_status;
  const jobs = state.dashboard.writer_jobs || [];
  const connected = s && s.server_connected === 'true';
  const ready = s && s.rfid_ready === 'true';
  const card = s && s.card_present === 'true';
  $('writerStatusCards').innerHTML = [
    ['Server link', connected ? 'Connected' : 'Waiting', connected ? 'ok' : 'low'],
    ['RFID module', ready ? 'Ready' : 'Not ready', ready ? 'ok' : 'low'],
    ['Card present', card ? 'Detected' : 'No card', card ? 'ok' : 'low'],
    ['Last card UID', s?.last_card_uid || '-', 'ok']
  ].map(([label, value, tone]) => `<div class="mini-status"><div class="hint">${label}</div><strong class="${tone}">${value}</strong></div>`).join('');
  $('writerMessage').textContent = s?.message || 'Start the Wio RFID writer to begin polling backend-center.';
  $('writerJobsTable').innerHTML = tableHead(['Job', 'Order', 'User', 'Status', 'Device', 'Message']) + jobs.map(j => `<tr><td>${j.job_id}</td><td>${j.order_number}</td><td>${j.user_name}</td><td>${statusClass(j.status)}</td><td>${j.device_id || '-'}</td><td>${j.message || ''}</td></tr>`).join('');
}

function renderInventoryTable() {
  const q = $('inventorySearch').value.trim().toLowerCase(); const products = state.dashboard.products.filter(p => !q || p.product_name.toLowerCase().includes(q));
  $('inventoryTable').innerHTML = tableHead(['Product','Price','Inventory','Threshold','Slot','Servo','Refill','Page']) + products.map(product => `<tr><td><strong>${product.product_name}</strong><div class="hint">${product.tag}</div></td><td>${money(product.price)}</td><td>${stockBadge(product)}<div class="hint">${product.inventory} units</div></td><td>${product.low_stock_threshold}</td><td>${product.slot_id}</td><td>${product.servo_id}</td><td><div class="inline-controls"><input class="small-input" id="refill_${product.product_id}" type="number" min="1" value="1" /><button data-refill-id="${product.product_id}">Refill</button></div></td><td><a class="text-link" href="${product.product_url}" target="_blank" rel="noreferrer">Open ↗</a></td></tr>`).join('');
  [...document.querySelectorAll('[data-refill-id]')].forEach(btn => btn.addEventListener('click', async () => { const id = btn.dataset.refillId; const quantity = Number(document.getElementById(`refill_${id}`).value || 0); if (quantity <= 0) return showToast('Refill quantity must be greater than 0.'); try { await api(`/api/products/${id}/refill`, { method: 'POST', body: JSON.stringify({ quantity }) }); showToast('Inventory refilled successfully.'); await load(); } catch (e) { showToast(e.message); } }));
}
function renderOrdersTable() {
  const q = $('orderSearch').value.trim().toLowerCase(); const orders = state.dashboard.recent_orders.filter(o => !q || [o.order_number,o.user_name,o.product_name].some(v => String(v).toLowerCase().includes(q)));
  $('ordersTable').innerHTML = tableHead(['Order','User','Product','Qty','Status','Created','Frontend','Actions']) + orders.map(order => `<tr><td><strong>${order.order_number}</strong></td><td>${order.user_name}</td><td>${order.product_name}</td><td>${order.quantity}</td><td>${statusClass(order.status)}</td><td>${order.created_at || ''}</td><td>${order.frontend_id || '-'}</td><td>${['DISPENSED','CANCELLED'].includes(order.status) ? '-' : `<button data-cancel-id="${order.order_number}">Cancel</button>`}</td></tr>`).join('');
  [...document.querySelectorAll('[data-cancel-id]')].forEach(btn => btn.addEventListener('click', async () => { if (!confirm(`Cancel order ${btn.dataset.cancelId}? Reserved inventory will be released.`)) return; try { await api(`/api/orders/${btn.dataset.cancelId}/cancel`, { method: 'POST', body: '{}' }); showToast('Order cancelled and inventory released.'); await load(); } catch (e) { showToast(e.message); } }));
}
function renderCustomersTable() { const c = state.dashboard.customers.slice(0,20); $('customersTable').innerHTML = tableHead(['User Name','Total Paid','Orders','Last Order','Updated']) + c.map(x => `<tr><td><strong>${x.user_name}</strong></td><td>${money(x.total_paid)}</td><td>${x.total_orders}</td><td>${x.last_order_number || '-'}</td><td>${x.updated_at || ''}</td></tr>`).join(''); }
function renderInventoryLogsTable() { const logs = state.dashboard.recent_inventory_logs; $('inventoryLogTable').innerHTML = tableHead(['Time','Action','Product','Delta','Inventory After','Actor','Notes']) + logs.map(log => `<tr><td>${log.time || ''}</td><td>${log.action || ''}</td><td>${log.product_name || ''}</td><td>${log.quantity_delta || ''}</td><td>${log.inventory_after || ''}</td><td>${log.actor || ''}</td><td>${log.notes || ''}</td></tr>`).join(''); }
function renderDevicesTable() { const d = state.dashboard.device_status.length ? state.dashboard.device_status : state.dashboard.devices; $('devicesTable').innerHTML = tableHead(['Device ID','Type','Server','RFID','Card','Last Seen','Message']) + d.map(x => `<tr><td><strong>${x.device_id}</strong></td><td>${x.device_type}</td><td>${x.server_connected || '-'}</td><td>${x.rfid_ready || '-'}</td><td>${x.card_present || '-'}</td><td>${x.last_seen_at || '-'}</td><td>${x.message || x.notes || ''}</td></tr>`).join(''); }

async function createOrder() {
  if (!state.selectedProductId) return showToast('Select a product card first.');
  const body = { user_name: $('user_name').value.trim(), product_id: state.selectedProductId, quantity: $('quantity').value, amount_paid: $('amount_paid').value, rfid_card_uid: $('rfid_card_uid').value.trim() };
  if (!body.user_name) return showToast('user_name is required.');
  try {
    const data = await api('/api/orders/create-and-prepare-card', { method: 'POST', body: JSON.stringify(body) });
    $('payloadOutput').textContent = JSON.stringify({ order_number: data.order.order_number, product_name: data.order.product_name, writer_job: data.writer_job.job_id, payload: JSON.parse(data.rfid_payload_to_write) }, null, 2);
    $('writerSteps').innerHTML = ['Order created and stock reserved.','Wio Terminal will poll /api/rfid-writer/next-job.','Place a card on the RFID writer.','Wio Terminal writes the payload and reports the result.'].map(step => `<li>${step}</li>`).join('');
    $('user_name').value = ''; $('quantity').value = '1'; $('amount_paid').value = ''; $('rfid_card_uid').value = '';
    showToast('Order created. Waiting for Wio RFID writer.'); await load();
  } catch (e) { showToast(e.message); }
}
async function copyPayload() { const text = $('payloadOutput').textContent; if (!text || text === 'No payload generated yet.') return showToast('No payload to copy yet.'); await navigator.clipboard.writeText(text); showToast('Payload copied.'); }
async function load() {
  const data = await api('/api/dashboard'); state.dashboard = data;
  if (!state.selectedProductId && data.products.length) state.selectedProductId = data.products[0].product_id;
  if (!productById(state.selectedProductId) && data.products.length) state.selectedProductId = data.products[0].product_id;
  renderMetrics(); renderProducts(); renderSelectedProduct(); renderWriterPanel(); renderInventoryTable(); renderOrdersTable(); renderCustomersTable(); renderInventoryLogsTable(); renderDevicesTable();
}
$('refreshButton').addEventListener('click', load); $('createOrderButton').addEventListener('click', createOrder); $('copyPayloadButton').addEventListener('click', copyPayload); $('inventorySearch').addEventListener('input', renderInventoryTable); $('orderSearch').addEventListener('input', renderOrdersTable);
load().catch(e => showToast(e.message)); setInterval(() => load().catch(() => {}), 6000);
