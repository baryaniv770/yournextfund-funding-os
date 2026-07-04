/* YourNextFund Funding OS — real backend (Express + JSON persistence)
   MVP: real API + persistent database. Upgrade path to Postgres/Supabase noted in README. */
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '2mb' }));

const DB_FILE = path.join(__dirname, 'data.json');

/* ---------- tiny persistent store ---------- */
function seed() {
  return {
    merchants: [
      { id: 1, biz: 'Apex Construction', owner: 'Marcus T.', ind: 'Construction', rev: 85000, months: 38, phone: '(305) 555-0112', email: 'marcus@apexcon.com' },
      { id: 2, biz: 'Bloom Cafe', owner: 'Priya S.', ind: 'Restaurant', rev: 32000, months: 19, phone: '(305) 555-0134', email: 'priya@bloomcafe.com' },
      { id: 3, biz: 'Northstar Logistics', owner: 'David L.', ind: 'Transportation', rev: 210000, months: 52, phone: '(305) 555-0177', email: 'david@northstar.com' },
      { id: 4, biz: 'Lopez Auto Repair', owner: 'Carlos L.', ind: 'Auto Repair', rev: 24000, months: 9, phone: '(305) 555-0190', email: 'carlos@lopezauto.com' },
      { id: 5, biz: 'Sunrise Grocery', owner: 'Amine K.', ind: 'Grocery', rev: 60000, months: 27, phone: '(305) 555-0155', email: 'amine@sunrisegrocery.com' }
    ],
    lenders: [
      { id: 1, name: 'Backd', type: 'MCA Funder', minRev: 20000, minMonths: 12, maxAmt: 500000, email: 'submissions@backd.com' },
      { id: 2, name: 'Bitty Advance', type: 'MCA Funder', minRev: 8000, minMonths: 6, maxAmt: 35000, email: 'iso@bitty.com' },
      { id: 3, name: 'Rapid Finance', type: 'MCA Funder', minRev: 15000, minMonths: 6, maxAmt: 600000, email: 'deals@rapidfinance.com' },
      { id: 4, name: 'Fora Financial', type: 'MCA Funder', minRev: 12000, minMonths: 6, maxAmt: 750000, email: 'iso@forafinancial.com' },
      { id: 5, name: 'Kapitus', type: 'MCA Funder', minRev: 20000, minMonths: 24, maxAmt: 5000000, email: 'submissions@kapitus.com' },
      { id: 6, name: 'Credibly', type: 'MCA Funder', minRev: 15000, minMonths: 6, maxAmt: 400000, email: 'iso@credibly.com' },
      { id: 7, name: 'Everest Business Funding', type: 'MCA Funder', minRev: 10000, minMonths: 4, maxAmt: 200000, email: 'submissions@everestbusinessfunding.com' },
      { id: 8, name: 'Mulligan Funding', type: 'MCA Funder', minRev: 25000, minMonths: 12, maxAmt: 1000000, email: 'iso@mulliganfunding.com' },
      { id: 9, name: 'Torro', type: 'High-Risk Funder', minRev: 8000, minMonths: 3, maxAmt: 100000, email: 'deals@torro.com' },
      { id: 10, name: 'Greenbox Capital', type: 'MCA Funder', minRev: 7000, minMonths: 5, maxAmt: 250000, email: 'iso@greenboxcapital.com' }
    ],
    deals: [
      { id: 1, merchantId: 1, amount: 180000, stage: 'funding', docs: ['bank-statements-3mo.pdf', 'signed-application.pdf'] },
      { id: 2, merchantId: 2, amount: 45000, stage: 'underwriting', docs: ['bank-statements-3mo.pdf'] },
      { id: 3, merchantId: 3, amount: 250000, stage: 'decision', docs: ['bank-statements-3mo.pdf', 'tax-return.pdf'] },
      { id: 4, merchantId: 4, amount: 30000, stage: 'intake', docs: [] },
      { id: 5, merchantId: 5, amount: 60000, stage: 'servicing', docs: ['bank-statements-3mo.pdf', 'signed-application.pdf', 'contract.pdf'] }
    ],
    leads: [
      { id: 101, name: 'Jenna R.', biz: 'Coastline HVAC', amount: '$25K–$100K', source: 'yournextfund.com' },
      { id: 102, name: 'Tomer Z.', biz: 'TZ Marketing', amount: '$5K–$25K', source: 'yournextfund.com' },
      { id: 103, name: 'Sofia M.', biz: 'Bella Beauty Bar', amount: '$25K–$100K', source: 'yournextfund.com (ES)' }
    ],
    submissions: [],
    seq: 1000
  };
}
function load() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) { const s = seed(); save(s); return s; }
}
function save(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
let db = load();
const nextId = () => ++db.seq;
const merch = id => db.merchants.find(m => m.id === id);

/* ---------- API ---------- */
app.get('/api/health', (req, res) => res.json({ ok: true, deals: db.deals.length }));

app.get('/api/state', (req, res) => res.json(db));

// Website leads land here (connect yournextfund.com form / Netlify / GHL to this endpoint)
app.post('/api/leads', (req, res) => {
  const { name, biz, amount, source } = req.body;
  const lead = { id: nextId(), name: name || 'New Lead', biz: biz || '—', amount: amount || '—', source: source || 'website' };
  db.leads.unshift(lead); save(db); res.json(lead);
});

// Convert a lead into a merchant + deal
app.post('/api/leads/:id/convert', (req, res) => {
  const id = +req.params.id;
  const lead = db.leads.find(l => l.id === id);
  if (!lead) return res.status(404).json({ error: 'lead not found' });
  const m = { id: nextId(), biz: lead.biz, owner: lead.name, ind: '—', rev: 30000, months: 12, phone: '—', email: '—' };
  db.merchants.push(m);
  const d = { id: nextId(), merchantId: m.id, amount: 50000, stage: 'intake', docs: [] };
  db.deals.push(d);
  db.leads = db.leads.filter(l => l.id !== id);
  save(db); res.json({ merchant: m, deal: d });
});

// Move a deal / add docs
app.patch('/api/deals/:id', (req, res) => {
  const d = db.deals.find(x => x.id === +req.params.id);
  if (!d) return res.status(404).json({ error: 'deal not found' });
  if (req.body.stage) d.stage = req.body.stage;
  if (Array.isArray(req.body.addDocs)) d.docs.push(...req.body.addDocs);
  if (req.body.amount) d.amount = req.body.amount;
  save(db); res.json(d);
});

// Submit a deal to lenders (records submission, advances stage)
app.post('/api/deals/:id/submit', (req, res) => {
  const d = db.deals.find(x => x.id === +req.params.id);
  if (!d) return res.status(404).json({ error: 'deal not found' });
  const lenderIds = req.body.lenderIds || [];
  const m = merch(d.merchantId);
  const sub = { id: nextId(), merchantId: d.merchantId, biz: m.biz, amount: d.amount, lenderIds, count: lenderIds.length, when: new Date().toISOString(), status: 'Submitted' };
  db.submissions.unshift(sub);
  if (d.stage === 'intake') d.stage = 'underwriting';
  save(db); res.json(sub);
});

// AI underwriting (rules-based now; swap to LLM API + real bank-statement OCR in prod — see README)
app.post('/api/deals/:id/underwrite', (req, res) => {
  const d = db.deals.find(x => x.id === +req.params.id);
  if (!d) return res.status(404).json({ error: 'deal not found' });
  const m = merch(d.merchantId);
  const deposits = Math.round(m.rev * 1.15), avgBal = Math.round(m.rev * 0.28), nsf = m.rev < 30000 ? 3 : 1;
  const score = Math.min(98, Math.round(50 + (m.rev / 5000) + (m.months / 2) - (nsf * 4)));
  const band = score >= 80 ? 'Strong' : score >= 65 ? 'Moderate' : 'Thin';
  const offerLo = Math.round(m.rev * 1.2 / 1000) * 1000, offerHi = Math.round(m.rev * 2.5 / 1000) * 1000;
  res.json({ merchant: m.biz, revenue: m.rev, deposits, avgBal, nsf, months: m.months, score, band, offerLo, offerHi });
});

// Serve the app UI (only index.html — never source or data files)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('YourNextFund Funding OS running on http://localhost:' + PORT));
