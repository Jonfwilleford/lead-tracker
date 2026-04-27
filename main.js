// ── Supabase config ──────────────────────────────────────────────
// 1. Go to supabase.com → your project → Settings → API
// 2. Copy "Project URL" and "anon public" key and paste below
const SUPABASE_URL = 'https://gpejigcqpuikzrpntklj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HLt2_8b6Hwru8FdMxlOyiQ_hOLMGPT7';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STATUSES = ['New', 'Contacted', 'Proposal Sent', 'Closed'];

// ── DOM refs ─────────────────────────────────────────────────────
const modal        = document.getElementById('leadModal');
const leadForm     = document.getElementById('leadForm');
const modalTitle   = document.getElementById('modalTitle');
const addBtn       = document.getElementById('addBtn');
const closeBtn     = document.getElementById('closeModal');
const cancelBtn    = document.getElementById('cancelBtn');

const contactModal      = document.getElementById('contactModal');
const contactName       = document.getElementById('contactName');
const contactCompany    = document.getElementById('contactCompany');
const contactStatus     = document.getElementById('contactStatus');
const contactCallBtn    = document.getElementById('contactCallBtn');
const contactEmailBtn   = document.getElementById('contactEmailBtn');
const contactEditBtn    = document.getElementById('contactEditBtn');
const contactDeleteBtn  = document.getElementById('contactDeleteBtn');

let activeLead = null;

// ── Data ─────────────────────────────────────────────────────────
async function fetchLeads() {
  const { data, error } = await db
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching leads:', error.message);
    return [];
  }
  return data;
}

async function saveLead(payload) {
  const id = document.getElementById('leadId').value;

  if (id) {
    const { error } = await db.from('leads').update(payload).eq('id', id);
    if (error) { alert('Error saving: ' + error.message); return false; }
  } else {
    const { error } = await db.from('leads').insert(payload);
    if (error) { alert('Error saving: ' + error.message); return false; }
  }
  return true;
}

async function deleteLead(id) {
  const { error } = await db.from('leads').delete().eq('id', id);
  if (error) { alert('Error deleting: ' + error.message); return false; }
  return true;
}

// ── Render ───────────────────────────────────────────────────────
function colId(status) {
  return 'col-' + status.replace(/\s+/g, '-');
}

function countId(status) {
  return 'count-' + status.replace(/\s+/g, '-');
}

function renderCard(lead) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = lead.id;

  const value = lead.value
    ? '$' + Number(lead.value).toLocaleString()
    : '';

  const meta = [lead.source, lead.lead_date].filter(Boolean).join(' · ');

  card.innerHTML = `
    <div class="card-name">${escHtml(lead.name)}</div>
    ${lead.company ? `<div class="card-company">${escHtml(lead.company)}</div>` : ''}
    ${value ? `<div class="card-value">${value}</div>` : ''}
    ${meta ? `<div class="card-meta">${escHtml(meta)}</div>` : ''}
  `;
  return card;
}

async function renderKanban() {
  const leads = await fetchLeads();

  STATUSES.forEach(status => {
    const col   = document.getElementById(colId(status));
    const count = document.getElementById(countId(status));
    const group = leads.filter(l => l.status === status);

    count.textContent = group.length;
    col.innerHTML = '';

    if (group.length === 0) {
      col.innerHTML = '<p class="empty-col">No leads</p>';
    } else {
      group.forEach(lead => col.appendChild(renderCard(lead)));
    }
  });
}

// ── Modal helpers ─────────────────────────────────────────────────
function openModal(lead = null) {
  leadForm.reset();
  document.getElementById('leadId').value = '';

  if (lead) {
    modalTitle.textContent = 'Edit Lead';
    document.getElementById('leadId').value    = lead.id;
    document.getElementById('leadName').value  = lead.name ?? '';
    document.getElementById('leadCompany').value = lead.company ?? '';
    document.getElementById('leadEmail').value = lead.email ?? '';
    document.getElementById('leadPhone').value = lead.phone ?? '';
    document.getElementById('leadStatus').value = lead.status ?? 'New';
    document.getElementById('leadValue').value = lead.value ?? '';
    document.getElementById('leadSource').value = lead.source ?? '';
    document.getElementById('leadDate').value  = lead.lead_date ?? '';
    document.getElementById('leadNotes').value = lead.notes ?? '';
  } else {
    modalTitle.textContent = 'Add Lead';
  }

  modal.showModal();
}

function closeModal() {
  modal.close();
}

// ── Contact modal ─────────────────────────────────────────────────
function openContactModal(lead) {
  activeLead = lead;

  contactName.textContent    = lead.name;
  contactCompany.textContent = lead.company || '';
  contactStatus.textContent  = lead.status || '';

  if (lead.phone) {
    contactCallBtn.href = 'tel:' + lead.phone.replace(/\D/g, '');
    contactCallBtn.classList.remove('disabled');
  } else {
    contactCallBtn.href = '#';
    contactCallBtn.classList.add('disabled');
  }

  if (lead.email) {
    contactEmailBtn.href = 'mailto:' + lead.email;
    contactEmailBtn.classList.remove('disabled');
  } else {
    contactEmailBtn.href = '#';
    contactEmailBtn.classList.add('disabled');
  }

  contactModal.showModal();
}

function closeContactModal() {
  contactModal.close();
  activeLead = null;
}

document.getElementById('closeContact').addEventListener('click', closeContactModal);
contactModal.addEventListener('click', e => { if (e.target === contactModal) closeContactModal(); });

contactEditBtn.addEventListener('click', () => {
  const lead = activeLead;
  closeContactModal();
  openModal(lead);
});

contactDeleteBtn.addEventListener('click', async () => {
  if (!confirm('Delete this lead?')) return;
  const ok = await deleteLead(activeLead.id);
  if (ok) { closeContactModal(); renderKanban(); }
});

// ── Events ───────────────────────────────────────────────────────
addBtn.addEventListener('click', () => openModal());
closeBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

modal.addEventListener('click', e => {
  if (e.target === modal) closeModal();
});

leadForm.addEventListener('submit', async e => {
  e.preventDefault();

  const payload = {
    name:      document.getElementById('leadName').value.trim(),
    company:   document.getElementById('leadCompany').value.trim() || null,
    email:     document.getElementById('leadEmail').value.trim() || null,
    phone:     document.getElementById('leadPhone').value.trim() || null,
    status:    document.getElementById('leadStatus').value,
    value:     document.getElementById('leadValue').value || null,
    source:    document.getElementById('leadSource').value.trim() || null,
    lead_date: document.getElementById('leadDate').value || null,
    notes:     document.getElementById('leadNotes').value.trim() || null,
  };

  const ok = await saveLead(payload);
  if (ok) {
    closeModal();
    renderKanban();
  }
});

document.getElementById('board').addEventListener('click', async e => {
  const card = e.target.closest('.card');
  if (!card) return;

  const id = card.dataset.id;
  const { data, error } = await db.from('leads').select('*').eq('id', id).single();
  if (error) { alert('Could not load lead.'); return; }
  openContactModal(data);
});

// ── Utility ──────────────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ─────────────────────────────────────────────────────────
renderKanban();
