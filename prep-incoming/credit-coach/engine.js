// Credit engine: implements 10-KNOWLEDGE/credit-engine-build-plan.md (WHACK 26 prototype).
// Pure functions, no DOM. Points are on a 0-999 reference scale, rescaled to the user's bureau.
(function (root) {
  const SCALE = { experian: 999, equifax: 1000, transunion: 710 };
  const BUREAU_NAME = { experian: 'Experian', equifax: 'Equifax', transunion: 'TransUnion' };
  const gbp = n => '£' + Math.round(n).toLocaleString('en-GB');
  const gbp2 = n => '£' + (Math.round(n * 100) / 100).toFixed(2);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function nextMonday(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const add = ((8 - x.getDay()) % 7) || 7;
    x.setDate(x.getDate() + add);
    return x;
  }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addMonths(d, n) { const x = new Date(d); x.setMonth(x.getMonth() + Math.floor(n)); x.setDate(x.getDate() + Math.round((n % 1) * 30)); return x; }
  function fmtDate(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function fmtMonth(d) { return MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }

  // Fill defaults so partial profiles (e.g. from chat) still run.
  function normalise(p) {
    const q = Object.assign({
      name: 'You', age: 25, grossIncome: 25000, netIncome: null, housing: 'rent', goal: 'build',
      bureau: 'experian', score: 650, cards: [], loans: [], lates: [], defaults: [], ccjs: [],
      searches: [], electoralRoll: true, addresses3y: 1, staleAssociates: [], oldestAccountYears: null,
      errorsOnReport: [], decline: null, paydownOverride: null, student: false, newToUK: false, ukMonths: null, canRegisterToVote: true, hasPhoneContract: null,
      bank: {}
    }, p || {});
    q.bureau = SCALE[q.bureau] ? q.bureau : 'experian';
    q.bank = Object.assign({ rent: 0, rentByTransfer: true, councilTax: 0, bills: [], subscriptions: [],
      groceries: 0, transport: 0, bnpl: 0, gambling: 0, payday: 0, cashAdvances: 0, savings: 0,
      lateFees3m: 0, overdraftDays3m: 0, billsInOwnName: true }, q.bank || {});
    if (!q.netIncome) q.netIncome = Math.round(netFromGross(q.grossIncome) / 12);
    q.cards = (q.cards || []).map(c => Object.assign({ name: 'Credit card', limit: 1000, balance: 0, apr: 29.9, minOnly: false, hasDD: false, openedYears: 1 }, c));
    if (q.oldestAccountYears == null) {
      const ages = q.cards.map(c => c.openedYears).concat((q.loans || []).map(l => l.openedYears || 0));
      q.oldestAccountYears = ages.length ? Math.max(...ages) : 0;
    }
    return q;
  }
  function netFromGross(g) { // rough UK 2026 take-home: 20% over £12,570, 8% NI over £12,570, 40% over £50,270
    const pa = 12570; let tax = 0, ni = 0;
    if (g > pa) { tax += 0.2 * (Math.min(g, 50270) - pa); ni += 0.08 * (Math.min(g, 50270) - pa); }
    if (g > 50270) { tax += 0.4 * (g - 50270); ni += 0.02 * (g - 50270); }
    return g - tax - ni;
  }

  function totals(p) {
    const limit = p.cards.reduce((s, c) => s + c.limit, 0);
    const bal = p.cards.reduce((s, c) => s + c.balance, 0);
    return { limit, bal, util: limit ? bal / limit : 0 };
  }
  function cardMin(c) { return Math.max(c.balance > 0 ? 25 : 0, Math.round(c.balance * 0.03)); }
  function sum(arr) { return (arr || []).reduce((s, x) => s + (x.amount || 0), 0); }

  function cash(p) {
    const b = p.bank;
    const bills = b.councilTax + sum(b.bills) + sum(b.subscriptions);
    const debtMins = p.cards.reduce((s, c) => s + cardMin(c), 0) + (p.loans || []).reduce((s, l) => s + (l.monthly || 0), 0);
    const essentials = (b.groceries + b.transport + (b.other || 0)) || 650;
    const surplus = p.netIncome - b.rent - bills - debtMins - b.bnpl - b.payday - essentials - b.gambling;
    const freed = b.bnpl + b.payday + b.gambling; // money freed once these stop (from month 2)
    return { bills, debtMins, essentials, surplus, freed };
  }

  // ---------- Stage 2: diagnose ----------
  function diagnose(p) {
    const t = totals(p), c = cash(p);
    const lates12 = p.lates.filter(l => l.monthsAgo < 12).length;
    const latesOld = p.lates.filter(l => l.monthsAgo >= 12 && l.monthsAgo < 72).length;
    const adverse = p.defaults.concat(p.ccjs).filter(d => d.monthsAgo < 72);
    const s3 = p.searches.filter(m => m < 3).length, s12 = p.searches.filter(m => m >= 3 && m < 12).length;
    const worst = p.cards.reduce((w, k) => (k.limit && k.balance / k.limit > (w ? w.balance / w.limit : -1)) ? k : w, null);
    const worstU = worst ? worst.balance / worst.limit : 0;
    const u = Math.max(t.util, worstU * 0.9);
    const utilH = !p.cards.length ? 75 : u <= 0.3 ? 100 : u <= 0.5 ? 70 : u <= 0.75 ? 40 : 15;
    const activeAccounts = p.cards.length + (p.loans || []).length;
    let depthH = p.oldestAccountYears < 1 ? 30 : p.oldestAccountYears < 3 ? 60 : 100;
    if (activeAccounts < 2) depthH -= 20;
    const latest = p.lates.slice().sort((a, b) => a.monthsAgo - b.monthsAgo)[0];
    const f = [
      { id: 'payment', label: 'Payment history', weight: 0.30,
        health: clamp(100 - 25 * lates12 - 10 * latesOld - (adverse.length ? 60 : 0), 0, 100),
        reason: adverse.length ? `You have a ${p.defaults.length ? 'default' : 'CCJ'} from ${adverse[0].monthsAgo} months ago. It stays on file for 6 years but matters less each year.`
          : latest ? `You were late on your ${latest.account || 'account'} ${latest.monthsAgo} month${latest.monthsAgo === 1 ? '' : 's'} ago. Lenders weigh recent late payments most.`
          : 'No late payments on file. Keep it that way: one miss can cost up to 130 points.' },
      { id: 'utilisation', label: 'Credit utilisation', weight: 0.25, health: utilH,
        reason: !p.cards.length ? 'You have no credit cards, so lenders can\'t see how you handle revolving credit.'
          : `You're using ${Math.round(t.util * 100)}% of your ${gbp(t.limit)} total limit (${gbp(t.bal)}).` + (worst && worstU > t.util + 0.05 ? ` Your ${worst.name} is at ${Math.round(worstU * 100)}%.` : '') + ' Under 30% reads as in control.' },
      { id: 'affordability', label: 'Affordability', weight: 0.15,
        health: c.surplus >= 300 ? 100 : c.surplus >= 100 ? 60 : c.surplus >= 0 ? 30 : 0,
        reason: `After rent, bills, debt payments and everyday spending you have about ${gbp(c.surplus)} a month left. Lenders run the same sum before saying yes.` },
      { id: 'searches', label: 'Recent applications', weight: 0.10, health: clamp(100 - 30 * s3 - 10 * s12, 0, 100),
        reason: s3 + s12 ? `${s3 + s12} hard search${s3 + s12 > 1 ? 'es' : ''} in the last year, ${s3} in the last 3 months. Lots of applications close together look credit-hungry.` : 'No recent hard searches. Good.' },
      { id: 'depth', label: 'History depth', weight: 0.10, health: clamp(depthH, 0, 100),
        reason: activeAccounts === 0 ? 'You have no active credit accounts, so lenders have little to go on (a "thin file").'
          : `Your oldest account is ${p.oldestAccountYears < 1 ? 'under a year' : p.oldestAccountYears + ' year' + (p.oldestAccountYears === 1 ? '' : 's')} old, across ${activeAccounts} active account${activeAccounts === 1 ? '' : 's'}.` },
      { id: 'identity', label: 'Identity & stability', weight: 0.10,
        health: !p.electoralRoll ? (p.canRegisterToVote === false ? 50 : 0) : clamp(100 - 20 * (p.addresses3y - 1) - 30 * p.staleAssociates.length, 0, 100),
        reason: !p.electoralRoll && p.canRegisterToVote === false ? 'You\'re not on the electoral roll, and you may not be eligible to join it. Using one address everywhere helps lenders verify you instead.' : !p.electoralRoll ? 'You\'re not on the electoral roll at your current address. Lenders use it to confirm who you are.'
          : p.staleAssociates.length ? `You're still financially linked to ${p.staleAssociates.join(', ')}. Their credit can affect yours.`
          : p.addresses3y > 1 ? `${p.addresses3y} addresses in 3 years. Frequent moves make you harder to verify.` : 'On the electoral roll with a stable address. Good.' }
    ];
    f.forEach(x => { x.rag = x.health >= 80 ? 'green' : x.health >= 50 ? 'amber' : 'red'; x.drag = x.weight * (100 - x.health); });
    const BEC = {
      payment: { dataPoint: `${lates12} late payment(s) in 12 months, ${latesOld} older, ${adverse.length} default/CCJ`, rule: '100 − 25 per late in 12m − 10 per older late − 60 if any default/CCJ', source: SRC.which },
      utilisation: { dataPoint: p.cards.length ? `${gbp(t.bal)} of ${gbp(t.limit)} = ${Math.round(t.util * 100)}%` + (worst ? `; worst card ${worst.name} ${Math.round(worstU * 100)}%` : '') : 'no credit cards', rule: '≤30% → 100, 30-50% → 70, 50-75% → 40, >75% → 15', source: SRC.experian },
      affordability: { dataPoint: `net ${gbp(p.netIncome)} − rent ${gbp(p.bank.rent)} − bills ${gbp(c.bills)} − debt minimums ${gbp(c.debtMins)} − everyday ${gbp(c.essentials)} − BNPL/gambling/payday ${gbp(p.bank.bnpl + p.bank.gambling + p.bank.payday)} = ${gbp(c.surplus)}`, rule: '≥£300 → 100, £100-300 → 60, £0-100 → 30, <£0 → 0', source: SRC.fos },
      searches: { dataPoint: `${s3} hard search(es) in 3 months, ${s12} in 3-12 months`, rule: '100 − 30 per search in 3m − 10 per search in 3-12m', source: SRC.which },
      depth: { dataPoint: `oldest account ${p.oldestAccountYears} years, ${activeAccounts} active credit account(s)`, rule: '<1y → 30, 1-3y → 60, 3y+ → 100; −20 if <2 accounts', source: SRC.newuk },
      identity: { dataPoint: `electoral roll: ${p.electoralRoll ? 'yes' : 'no'}; ${p.addresses3y} address(es) in 3y; ${p.staleAssociates.length} financial link(s)`, rule: 'not on roll → 0 (50 if not eligible); else 100 − 20 per extra address − 30 per link', source: SRC.moneyhelper }
    };
    f.forEach(x => { x.because = Object.assign({ weight: x.weight, weightSource: 'Our assumption, loosely based on FICO weights (' + SRC.fico.url + ')' }, BEC[x.id]); });
    const ranked = f.slice().sort((a, b) => b.drag - a.drag);
    const flags = [];
    const b = p.bank;
    if (b.lateFees3m) flags.push(`${b.lateFees3m} late fee${b.lateFees3m > 1 ? 's' : ''} in the last 3 months`);
    if (b.overdraftDays3m) flags.push(`${b.overdraftDays3m} days in your overdraft in the last 3 months`);
    if (b.bnpl) flags.push(`${gbp(b.bnpl)}/month on buy now, pay later`);
    if (b.payday) flags.push(`${gbp(b.payday)}/month to a payday lender`);
    if (b.gambling) flags.push(`${gbp(b.gambling)}/month on gambling`);
    if (b.cashAdvances) flags.push(`cash withdrawals on a credit card`);
    p.cards.filter(k => k.minOnly).forEach(k => flags.push(`minimum-only payments on your ${k.name}`));
    let declineWhy = null;
    if (p.decline) {
      const crit = CARDS[p.decline.productId] ? criteriaNow(p, CARDS[p.decline.productId]) : [];
      declineWhy = crit.filter(x => !x.ok).map(x => x.label);
      if (s3 >= 2 && !declineWhy.some(x => x.includes('search'))) declineWhy.push('several applications close together');
    }
    return { factors: f, ranked, flags, declineWhy };
  }

  // ---------- Sources for the "because" trail ----------
  const SRC = {
    experian: { label: 'Experian: how to improve your credit score', url: 'https://www.experian.co.uk/consumer/guides/improve-credit-score.html' },
    which: { label: 'Which?: how to improve your credit score (Experian figures)', url: 'https://www.which.co.uk/reviews/credit-scores/article/how-to-improve-your-credit-score-am4S05w3aUIE' },
    boost: { label: 'Experian Boost FAQ', url: 'https://experian.co.uk/consumer/experian-boost-faqs.html' },
    newuk: { label: 'Experian: building credit when new to the UK', url: 'https://www.experian.co.uk/consumer/guides/new-to-the-uk.html' },
    moneyhelper: { label: 'MoneyHelper: ways to help your credit rating', url: 'https://www.moneyhelper.org.uk/en/blog/credit-rating-and-credit-score/registering-to-vote-and-four-other-ways-to-help-your-credit-rating' },
    capone: { label: 'Capital One UK: applying for a credit card', url: 'https://capitalone.co.uk/creditcards/applying-for-a-credit-card' },
    fos: { label: 'Financial Ombudsman DRN-5943753 (Capital One affordability)', url: 'https://www.financial-ombudsman.org.uk/decision/DRN-5943753.pdf' },
    s157: { label: 'Consumer Credit Act 1974 s157', url: 'https://legislation.gov.uk/ukpga/1974/39/part/X/crossheading/credit-reference-agencies' },
    fico: { label: 'myFICO: what\'s in your score (weights)', url: 'https://www.myfico.com/CreditEducation/WhatsInYourScore.aspx' },
    ours: { label: 'Our assumption (tunable in rules)', url: null }
  };

  // ---------- Capital One cards (as of 7 Nov 2026) ----------
  const CARDS = {
    classic: { id: 'classic', name: 'Capital One Classic', apr: 34.9, limit: '£200-£4,000', note: 'Credit builder. Up to 2 limit increases a year. £0 annual fee.' },
    bt: { id: 'bt', name: 'Capital One Balance Transfer', apr: 34.9, limit: 'up to £8,000', note: '0% on balance transfers for up to 18 months (3% fee), 0% on purchases for 3 months.' },
    purchase: { id: 'purchase', name: 'Capital One 0% Purchase', apr: 34.9, limit: 'varies', note: 'Up to 12 months 0% on spending.' }
  };
  function criteriaNow(p, card, at) {
    at = at || {};
    const lateMonths = p.lates.length ? Math.min(...p.lates.map(l => l.monthsAgo)) + (at.month || 0) : 99;
    const adverseNow = p.defaults.concat(p.ccjs).some(d => d.monthsAgo + (at.month || 0) < 72);
    const searchClear = at.searchClear != null ? at.searchClear : !p.searches.some(m => m < 3);
    const util = at.util != null ? at.util : totals(p).util;
    if (card.id === 'classic') return [
      { label: 'aged 18+', ok: p.age >= 18 },
      { label: 'on the electoral roll', ok: at.roll != null ? at.roll : p.electoralRoll },
      { label: 'no bankruptcy in the last 12 months', ok: !p.bankruptcyMonthsAgo || p.bankruptcyMonthsAgo >= 12 },
      { label: 'no hard search in the last 3 months', ok: searchClear }
    ];
    return [
      { label: 'aged 21+', ok: p.age >= 21 },
      { label: 'income over £20k', ok: p.grossIncome > 20000 },
      { label: 'held a credit card before', ok: p.cards.length > 0 || !!at.hasCard },
      { label: 'no late payment in the last 12 months', ok: lateMonths >= 12 },
      { label: 'no default or CCJ on file', ok: !adverseNow },
      { label: 'no hard search in the last 3 months', ok: searchClear },
      { label: 'utilisation under 30%', ok: util < 0.3 }
    ];
  }

  // ---------- Paydown simulation ----------
  function simulatePaydown(p, months, start) {
    const c = cash(p);
    const base = Math.max(0, Math.round(0.6 * c.surplus / 5) * 5);
    const extraM1 = p.paydownOverride != null ? p.paydownOverride : base;
    const extraLater = p.paydownOverride != null ? p.paydownOverride : base + Math.round(c.freed);
    const cards = p.cards.map(k => Object.assign({}, k));
    const limit = cards.reduce((s, k) => s + k.limit, 0);
    const rows = [{ month: 0, bal: cards.reduce((s, k) => s + k.balance, 0) }];
    const pays = [];
    for (let m = 1; m <= months; m++) {
      let extra = m === 1 ? extraM1 : extraLater;
      // order: any card over 75% first (most visible), else highest APR
      const order = cards.filter(k => k.balance > 0).sort((a, b) => {
        const ua = a.balance / a.limit, ub = b.balance / b.limit;
        if ((ua > 0.75) !== (ub > 0.75)) return ua > 0.75 ? -1 : 1;
        return b.apr - a.apr;
      });
      const monthPays = [];
      cards.forEach(k => { if (k.balance > 0) { k.balance += k.balance * k.apr / 100 / 12; const mn = Math.min(k.balance, cardMin(k)); k.balance -= mn; } });
      // What-if: one-off payment this month (clearCard), on top of the plan's extra
      if (m === 1) (p.oneOffPayments || []).forEach(o => cards.forEach(k => { if ((!o.card || k.name === o.card) && k.balance > 0) { const pay = o.card ? k.balance : Math.min(k.balance, o.amount || k.balance); k.balance -= pay; monthPays.push({ card: k.name, amount: Math.round(pay) }); } }));
      for (const k of order) {
        if (extra <= 0) break;
        const pay = Math.min(extra, k.balance);
        if (pay > 0) { k.balance -= pay; extra -= pay; monthPays.push({ card: k.name, amount: Math.round(pay) }); }
      }
      pays.push(monthPays);
      rows.push({ month: m, bal: cards.reduce((s, k) => s + k.balance, 0) });
    }
    rows.forEach(r => r.util = limit ? r.bal / limit : 0);
    const cross = th => { const r = rows.find(r => r.util < th); return r ? r.month : null; };
    return { rows, pays, extraM1, extraLater, limit, crossings: { 75: cross(0.75), 50: cross(0.5), 30: cross(0.3) } };
  }

  // ---------- Stages 3-6: rules, schedule, project, ladder ----------
  function ramp(t, at, dur) { dur = dur || 1.5; return t <= at ? 0 : t >= at + dur ? 1 : (t - at) / dur; }
  function damp(x) { return x <= 100 ? x : 100 + 0.6 * (x - 100); }

  function run(input, opts) {
    opts = opts || {};
    const p = normalise(input);
    const start = opts.start ? new Date(opts.start) : nextMonday(new Date());
    const d = diagnose(p);
    const t = totals(p), c = cash(p);
    const sim = simulatePaydown(p, 6, start);
    const scaleMax = SCALE[p.bureau], k = scaleMax / 999;
    const effects = []; // {id, label, plan:'both'|'6m', fn(t)->[lo,hi]}
    const steps3 = [], steps6 = [];
    const at = (w) => addDays(start, w * 7);
    let ctx = {};
    const because = (rule, name, dataPoint, source, pointsSource) => { ctx = { rule, name, dataPoint, source, pointsSource: pointsSource || null }; };
    const step = (list, date, title, instruction, why, check) => list.push({ date, title, instruction, why, check, because: Object.assign({}, ctx) });
    const eff = x => effects.push(Object.assign({ because: Object.assign({}, ctx) }, x));
    const both = (...a) => { step(steps3, ...a); step(steps6, ...a); };
    const minSearch = p.searches.length ? Math.min(...p.searches) : 99;
    const searchClearMonth = minSearch < 3 ? 3 - minSearch : 0; // months from start
    const searchClearDate = addMonths(start, searchClearMonth);
    const firstNameCard = p.cards[0];

    // R14 lender: in trouble
    because('R14', 'Talk to lenders early', `Monthly surplus ${gbp(c.surplus)}`, SRC.experian, 'Default up to −350: Which?/Experian');
    if (c.surplus < 0) {
      both(at(0), 'Call your lenders before the next due date', `You're about ${gbp(-c.surplus)} a month short. Call ${p.cards.map(x => x.name).join(' and ') || 'your lenders'} and ask for a payment arrangement. Free help: StepChange or National Debtline. A default costs up to 350 points.`, 'payment', 'Arrangement agreed in writing');
    }
    // R6 errors
    because('R6', 'Dispute errors', 'Item flagged as wrong on the report', SRC.which, 'Our assumption: 0 to +50');
    p.errorsOnReport.forEach(e => {
      both(at(0), 'Dispute an error on your report', `Raise a dispute with ${BUREAU_NAME[p.bureau]} about "${e}". It's free and takes up to 28 days.`, 'identity', 'Item corrected or removed');
      eff({ id: 'errors', label: 'Error removed', plan: 'both', fn: tt => [0, 50].map(v => v * ramp(tt, 1)) });
    });
    // Build-from-zero track (thin file): <2 credit accounts, <12 months history, or new to the UK
    const creditAccounts = p.cards.length + (p.loans || []).length;
    const build = creditAccounts < 2 || p.oldestAccountYears < 1 || p.newToUK;
    const ukMonths = p.ukMonths != null ? p.ukMonths : null;
    because('B1', 'Build-from-zero track', `${creditAccounts} credit account(s), oldest ${p.oldestAccountYears} years${p.newToUK ? ', new to the UK' + (ukMonths != null ? ' (' + ukMonths + ' months)' : '') : ''}`, SRC.newuk, null);
    if (build && p.newToUK) {
      both(at(0), 'Know where you\'re starting', `Credit history from your home country doesn't transfer, so you're building a UK file from scratch${ukMonths != null ? ' (you\'ve been here about ' + ukMonths + ' months)' : ''}. Step zero is a UK bank account and one fixed address used on everything. Keep your bank, phone and bills on the same address.`, 'identity', 'Same address on every account');
    }
    if (build) {
      both(at(0), 'Avoid the thin-file traps', 'One application at a time, and only after a soft-search check. No stacking buy now, pay later plans. No payday loans. On a thin file each of these counts for more.', 'searches', 'No new hard searches, BNPL or payday loans');
      const phoneDeclined = p.decline && /phone|mobile/i.test(p.decline.product || '');
      if (p.hasPhoneContract === false && phoneDeclined) both(at(12), 'Try a monthly phone contract again', `${p.decline.lender} said no recently. Once Boost and your other quick wins show, ask for a cheap SIM-only monthly plan (easier to get than a handset deal). It's a small credit agreement that builds history.`, 'depth', 'Phone contract shows on your report');
      else if (p.hasPhoneContract === false) both(at(1), 'Move your phone onto a monthly contract', 'Ask your mobile provider to switch you from pay-as-you-go or SIM-only prepay to a monthly contract. It\'s a small credit agreement that builds history. If they say no, ask again in a few months.', 'depth', 'Phone contract shows on your report');
    }
    // R1 roll
    because('R1', 'Electoral roll', `Electoral roll at current address: ${p.electoralRoll ? 'yes' : 'no'}${p.canRegisterToVote === false ? ' (may not be eligible)' : ''}`, SRC.moneyhelper, 'Up to +50: Experian via Which? (we use +20 to +50, shows after ~7 weeks)');
    if (!p.electoralRoll && p.canRegisterToVote === false) {
      both(at(0), 'Check if you can register to vote', 'You may not be eligible for the electoral roll (it depends on nationality: British, Irish and qualifying Commonwealth citizens can; some EU citizens can). Check on gov.uk/register-to-vote. If you can\'t, keep the same address on every account so lenders can still verify you.', 'identity', 'Eligibility checked');
    } else if (!p.electoralRoll) {
      both(at(0), 'Register to vote at your current address', 'Go to gov.uk/register-to-vote (5 minutes, you need your National Insurance number). Councils pass this to the credit agencies monthly, so it shows in 6 to 8 weeks.', 'identity', 'Electoral roll entry appears on your next report');
      eff({ id: 'roll', label: 'Electoral roll', plan: 'both', fn: tt => [20, 50].map(v => v * ramp(tt, 1.75)) });
    }
    // R7 associates
    because('R7', 'Financial associates', `Linked to: ${p.staleAssociates.join(', ') || 'nobody'}`, SRC.which, 'Our assumption: +5 to +20');
    p.staleAssociates.forEach(n => {
      both(at(0), `Break your financial link to ${n}`, `Ask ${BUREAU_NAME[p.bureau]} for a "notice of disassociation" from ${n}. Do it with Experian, Equifax and TransUnion so all three update.`, 'identity', 'Link no longer on your report');
      eff({ id: 'assoc', label: 'Financial link removed', plan: 'both', fn: tt => [5, 20].map(v => v * ramp(tt, 1)) });
    });
    // R2 direct debits
    because('R2', 'Direct Debits', `Cards without a Direct Debit: ${p.cards.filter(x => !x.hasDD).map(x => x.name).join(', ') || 'none'}`, SRC.experian, 'Protects against a missed payment, up to −130: Experian via Which?');
    p.cards.filter(x => !x.hasDD).forEach(x => {
      both(at(0), `Set a Direct Debit on your ${x.name}`, `Set a Direct Debit for at least the minimum (about ${gbp(cardMin(x))}), dated 2 days after payday, so a late payment can't happen by accident.`, 'payment', 'Direct Debit shows in your banking app');
    });
    // R5 freeze
    because('R5', 'Pause applications', `${p.searches.filter(m => m < 3).length} hard search(es) in the last 3 months${p.decline ? '; declined by ' + p.decline.lender : ''}; clear from ${fmtDate(searchClearDate)}`, SRC.which, 'Our assumption: +10 to +25 as searches pass 3 months');
    if (minSearch < 3 || p.decline) {
      both(at(0), 'Stop applying for credit for now', `Don't apply for anything until ${fmtDate(searchClearDate > at(0) ? searchClearDate : addMonths(start, 1))}. If you want to check a card, use a soft-search eligibility checker like Capital One QuickCheck (no score impact).`, 'searches', 'No new hard searches on your report');
    }
    if (minSearch < 3) {
      eff({ id: 'searches', label: 'Searches ageing', plan: 'both', fn: tt => [10, 25].map(v => v * ramp(tt, searchClearMonth, 1)) });
    }
    // R8 boost
    const boostable = [].concat(p.bank.councilTax ? [{ name: 'Council Tax', amount: p.bank.councilTax }] : [], p.bank.subscriptions || [], p.bank.savings ? [{ name: 'savings deposits', amount: p.bank.savings }] : []);
    because('R8', 'Experian Boost', `Experian report; bank data shows ${boostable.map(x => x.name).join(', ')}`, SRC.boost, 'Up to +101: Experian (we cap at +40)');
    if (p.bureau === 'experian' && boostable.length) {
      both(at(0), 'Connect Experian Boost', `Link your current account in the Experian app. It will find ${boostable.map(x => x.name).join(', ')} and count them as on-time payments. It can't lower your score.`, 'payment', 'Boost shows as active in the Experian app');
      eff({ id: 'boost', label: 'Experian Boost', plan: 'both', fn: tt => [0, 40].map(v => v * ramp(tt, 0, 0.25)) });
    }
    // R12 cut
    because('R12', 'Cut risky spending', `Bank data: BNPL ${gbp(p.bank.bnpl)}/mo, gambling ${gbp(p.bank.gambling)}/mo, payday ${gbp(p.bank.payday)}/mo`, SRC.which, 'Indirect: frees cash for the card paydown');
    if (p.bank.bnpl) both(at(0), 'Stop new buy now, pay later', `Finish your current BNPL plans but don't start new ones. That frees ${gbp(p.bank.bnpl)}/month for your card from month 2.`, 'affordability', 'No new BNPL payments in your bank feed');
    if (p.bank.payday) both(at(0), 'Clear and stop payday loans', `Payday loans worry mortgage lenders. Clear the ${gbp(p.bank.payday)}/month and don't take another. Your card paydown gets that money after.`, 'affordability', 'No payday lender in your bank feed');
    if (p.bank.gambling) both(at(0), 'Cut gambling spend', `${gbp(p.bank.gambling)}/month goes to gambling. Lenders reading bank data see it. Setting a block in your banking app moves that money to your plan.`, 'affordability', 'No gambling in your bank feed for a full month');
    // R9 rent
    because('R9', 'Rent reporting', `Rent ${gbp(p.bank.rent)}/month by ${p.bank.rentByTransfer ? 'transfer' : 'Direct Debit'}`, SRC.newuk, 'Our assumption: +5 to +20, ~8 weeks to show');
    if (p.housing === 'rent' && p.bank.rent && p.bank.rentByTransfer) {
      const rentMonths = p.bank.rentMonths != null ? p.bank.rentMonths : (ukMonths != null ? ukMonths : 12);
      const rentStart = Math.max(0, 6 - rentMonths); // Experian: add rent after ~6 months of payments
      const s = { date: rentStart ? addMonths(start, rentStart) : at(1), title: 'Get your rent reported',
        instruction: (rentStart ? `By now you'll have 6 months of rent payments, which rent-reporting services look for. ` : '') + `Sign up to a rent-reporting service such as CreditLadder (reports to all three agencies) for your ${gbp(p.bank.rent)} rent. It takes about 8 weeks to show.`,
        why: 'payment', check: 'Rent account visible on your report', because: Object.assign({}, ctx) };
      if (rentStart <= 3) steps3.push(Object.assign({}, s));
      steps6.push(s);
      eff({ id: 'rent', label: 'Rent reporting', plan: 'both', fn: tt => [5, 20].map(v => v * ramp(tt, rentStart + 2.25)) });
    }
    // R11 bills
    because('R11', 'Bills in your name', 'No utility or council tax in your name in bank data', SRC.newuk, null);
    if (!p.bank.billsInOwnName) both(at(1), 'Put a household bill in your name', 'Move the energy or broadband account into your name so payments start building your file.', 'depth', 'Bill account in your name');

    // R3 paydown
    because('R3', 'Card paydown', `Card use ${Math.round(t.util * 100)}% of ${gbp(t.limit)}; surplus ${gbp(c.surplus)} → 60% = ${gbp(sim.extraM1)}/mo, then ${gbp(sim.extraLater)}/mo once BNPL/gambling/payday stop; cards over 75% first, then highest APR`, SRC.experian, 'Our assumption: +30 to +80 split 25/35/40% at passing 75/50/30%');
    if (t.bal > 0 && t.util > 0.3) {
      const target = Math.floor(0.29 * t.limit);
      sim.pays.slice(0, 6).forEach((mp, i) => {
        if (!mp.length) return;
        const r = sim.rows[i + 1];
        const date = addDays(addMonths(start, i + 1), -1);
        const s = { date, title: `Pay ${mp.map(x => gbp(x.amount) + ' extra off your ' + x.card).join(' and ')}`,
          instruction: `On top of the minimum. That takes your total card balance to about ${gbp(r.bal)} (${Math.round(r.util * 100)}% of your limit${r.util < 0.3 ? ', under 30%' : ''}).`,
          why: 'utilisation', check: `Statement balance ${gbp(r.bal)} or less`, because: Object.assign({}, ctx) };
        if (i < 3) steps3.push(s);
        steps6.push(s);
      });
      const bands = [[0.75, 0.25], [0.5, 0.35], [0.3, 0.4]];
      const startU = t.util;
      bands.forEach(([th, share]) => {
        const m = sim.crossings[th * 100];
        if (startU >= th && m != null) eff({ id: 'util' + th, label: `Utilisation under ${th * 100}%`, plan: 'both', fn: tt => [30 * share, 80 * share].map(v => v * ramp(tt, m + 1.25 - 1, 1.25)) });
      });
    }
    // Low utilisation but a balance on an expensive card: clear it
    because('R3b', 'Clear small balances', `Card use ${Math.round(t.util * 100)}% (already under 30%) with a balance at interest`, SRC.experian, null);
    if (t.bal > 0 && t.util <= 0.3) p.cards.filter(x => x.balance > 0).forEach(x => both(addDays(addMonths(start, 1), -1), `Clear your ${x.name} balance`, `Pay off the ${gbp(x.balance)} this month (it's costing ${x.apr}% APR), then use the card lightly and pay in full every month.`, 'utilisation', `${x.name} statement at £0`));
    // Mortgage goal: application quiet period
    because('R15', 'Mortgage quiet period', `Goal: ${p.goal}`, SRC.which, null);
    if (p.goal === 'mortgage') both(at(0), 'Start a 6-month credit quiet period', 'No new cards, loans, phone contracts on finance or BNPL until your mortgage application. Mortgage lenders look hard at the last 6 months.', 'searches', 'No new searches or accounts on your report');
    // Old default fading (assumption: small gain as it ages past 2 years)
    because('N1', 'Old default ageing', 'Default/CCJ older than 2 years', SRC.which, 'Our assumption: +5 to +15 over 6 months');
    const def = p.defaults.concat(p.ccjs).filter(x => x.monthsAgo >= 24 && x.monthsAgo < 72);
    if (def.length) eff({ id: 'default', label: 'Old default ageing', plan: 'both', fn: tt => [5, 15].map(v => v * clamp(tt / 6, 0, 1)) });
    // Natural recovery of a recent late payment
    because('N2', 'Late payment fading', `Latest late payment ${p.lates.length ? Math.min(...p.lates.map(l => l.monthsAgo)) : '-'} months ago`, SRC.which, 'Which?: recovers ~6 months, mostly within a year; our range +15 to +40');
    const latest = p.lates.length ? Math.min(...p.lates.map(l => l.monthsAgo)) : null;
    if (latest != null && latest < 12) {
      const from = Math.max(0, 6 - latest), to = 12 - latest;
      eff({ id: 'late', label: 'Late payment fading', plan: 'both', fn: tt => [15, 40].map(v => v * clamp((tt - from) / (to - from), 0, 1)) });
    }

    // ---------- Stage 6: Capital One ladder ----------
    const btNow = criteriaNow(p, CARDS.bt);
    const expensive = p.cards.filter(x => x.balance > 300 && x.apr >= 20);
    let ladder;
    const thin = p.oldestAccountYears < 1 || (p.cards.length + (p.loans || []).length) < 2;
    const pickTx = (limitAssumed, small) => {
      const pool = [].concat(
        (p.bank.subscriptions || []).map(x => Object.assign({ kind: 'subscription', fixed: true }, x)),
        (p.bank.bills || []).filter(x => x.fixed !== false && !/rent|council/i.test(x.name)).map(x => Object.assign({ kind: 'bill', fixed: true }, x)),
        p.bank.groceries ? [{ name: 'one weekly food shop', amount: Math.round(p.bank.groceries / 4.33), kind: 'groceries', fixed: false }] : []
      ).filter(x => x.amount > 0 && (!small || x.fixed)).sort((a, b) => (b.fixed - a.fixed) || (a.amount - b.amount));
      const target = (small ? 0.25 : 0.3) * limitAssumed; const chosen = []; let s = 0;
      for (const x of pool) { if (small && chosen.length >= 2) break; if (s + x.amount <= target) { chosen.push(x); s += x.amount; } }
      return { chosen, total: s, target, limitAssumed };
    };
    because('C1', 'Capital One Balance Transfer', `Meets all published BT criteria; ${gbp(expensive.reduce((s, x) => s + x.balance, 0))} on cards at 20%+ APR`, SRC.capone, null);
    if (expensive.length && btNow.every(x => x.ok)) {
      const bal = expensive.reduce((s, x) => s + x.balance, 0);
      const apr = Math.max(...expensive.map(x => x.apr));
      const saved = bal * apr / 100 * 1.5 - 0.03 * bal;
      ladder = { entry: CARDS.bt, applyFrom: start, reason: `You meet all the published Balance Transfer criteria and have ${gbp(bal)} at ${apr}% APR.`,
        saving: `Moving ${gbp(bal)} to 0% for 18 months saves roughly ${gbp(saved)} in interest after the 3% fee (${gbp(0.03 * bal)}).`,
        tx: null, graduation: btNow.map(x => ({ label: x.label, ok: true, when: 'now' })) };
      step(steps6, at(1), 'Check Capital One Balance Transfer on QuickCheck', `Run QuickCheck (soft search). If it says yes, move ${gbp(bal)} across and keep paying ${gbp(sim.extraLater)}/month so it's cleared before the 0% ends.`, 'utilisation', 'Old card balance at £0');
    } else {
      // Build track: wait ~6-8 weeks for quick wins, and for ~6 months of UK bank history if new to the UK (Experian)
      const bankWait = build && p.newToUK && ukMonths != null ? Math.max(0, 6 - ukMonths) : 0;
      const applyMonth = Math.max(searchClearMonth, !p.electoralRoll && p.canRegisterToVote !== false ? 2 : 0, build ? 2 : 1, bankWait);
      const applyDate = addMonths(start, applyMonth);
      const limA = thin ? 200 : 500;
      const tx = pickTx(limA, build);
      const want = (thin || p.goal === 'card' || t.limit < 1500) && p.goal !== 'mortgage';
      because('C2', 'Capital One Classic (credit builder)', `${thin ? 'Thin file' : 'Total limit ' + gbp(t.limit)}; goal ${p.goal}; apply from ${fmtDate(applyDate)} (after search freeze${build ? ' and quick wins' : ''}); payments picked from bank data ≤${build ? 25 : 30}% of an assumed ${gbp(limA)} limit`, SRC.capone, 'Our assumption: −10 dip, then up to +30 by month 6');
      if (want) {
        const cardList = build && applyMonth < 3 ? [steps3, steps6] : [steps6];
        cardList.forEach(L => {
          step(L, applyDate, 'Check Capital One Classic on QuickCheck', `Run QuickCheck first (soft search, no score impact). If it says yes, apply once. Expect a starting limit around ${gbp(limA)}.` + (build ? ' Capital One is less likely to accept people with no UK credit history, so if QuickCheck says no, wait 3 months and check again rather than applying anyway.' : ''), 'depth', 'Card approved');
          if (tx.chosen.length) step(L, addDays(applyDate, 14), 'Move these payments onto the Classic card', `${tx.chosen.map(x => x.name + ' ' + gbp2(x.amount)).join(', ')}. That's ${gbp2(tx.total)}/month, ${Math.round(tx.total / limA * 100)}% of a ${gbp(limA)} limit${build ? ' (keep it under 25%)' : ''}. Set a Direct Debit for the FULL balance so you pay £0 interest.`, 'depth', 'Card statement paid in full each month');
        });
        eff({ id: 'builder', label: 'Credit builder card', plan: build && applyMonth < 3 ? 'both' : '6m', fn: tt => {
          if (tt < applyMonth + 1) return [0, 0];
          if (tt < applyMonth + 3) return [-10, 0];
          const f = clamp((tt - applyMonth - 3) / 3, 0, 1); return [-10 + 20 * f, 30 * f];
        } });
      }
      // graduation month per criterion (to BT), over 12 months
      const grad = [];
      for (let m = 0; m <= 12; m++) {
        const u = m <= 6 ? sim.rows[m].util : sim.rows[6].util;
        const searchClear = want ? (m < applyMonth ? m >= searchClearMonth : m >= applyMonth + 3) : m >= searchClearMonth;
        grad.push(criteriaNow(p, CARDS.bt, { month: m, util: p.cards.length ? u : 0, searchClear, hasCard: want && m > applyMonth }));
      }
      const labels = grad[0].map(x => x.label);
      const gradRows = labels.map((lab, i) => {
        const m = grad.findIndex(g => g[i].ok);
        return { label: lab, ok: grad[0][i].ok, when: m === 0 ? 'now' : m > 0 ? fmtMonth(addMonths(start, m)) : 'not within 12 months', month: m };
      });
      const allMonth = grad.findIndex(g => g.every(x => x.ok));
      ladder = want ? { entry: CARDS.classic, applyFrom: applyDate, reason: p.oldestAccountYears < 1 ? 'Your file is thin, so a credit-builder card is the fastest way to add positive history.' : thin ? 'You only have one active account. Another card adds limit, which lowers your utilisation, and builds history.' : 'Another card adds limit, which lowers your overall utilisation once you keep spending on it small, and builds history.',
        tx, graduation: gradRows, graduateWhen: allMonth >= 0 ? fmtMonth(addMonths(start, allMonth)) : null } :
        { entry: null, reason: p.goal === 'mortgage' ? 'You\'re aiming for a mortgage, so skip new cards: every application leaves a search, and a new account can make a mortgage lender wary. Use the card you have, lightly, and pay it in full.' : 'You don\'t need a new card right now. Focus on the steps below.', tx: null, graduation: gradRows, graduateWhen: allMonth >= 0 ? fmtMonth(addMonths(start, allMonth)) : null };
      if (ladder.graduateWhen) step(steps6, addMonths(start, Math.min(allMonth, 6)), allMonth <= 6 ? 'Check the Balance Transfer card on QuickCheck' : `Next card: check Balance Transfer in ${ladder.graduateWhen}`,
        allMonth <= 6 ? 'Every published criterion for Capital One Balance Transfer is now green. Run QuickCheck (soft search). It shows if you\'re likely accepted and your limit.' : `Your file should match every published Balance Transfer criterion by ${ladder.graduateWhen}. The app will remind you to run QuickCheck then.`, 'searches', 'QuickCheck result');
    }

    // Order steps by date
    const byDate = (a, b) => a.date - b.date;
    steps3.sort(byDate); steps6.sort(byDate);

    // ---------- Stage 5: project ----------
    const proj = plan => {
      const out = [];
      const months = plan === '3m' ? 3 : 6;
      for (let m = 0; m <= 6; m++) {
        let lo = 0, hi = 0;
        const breakdown = [];
        effects.forEach(e => { if (e.plan === '6m' && plan === '3m') return; const [a, b] = e.fn(m); lo += a; hi += b; if (a || b) breakdown.push({ effect: e.label, rule: e.because.rule, low: Math.round(a * k), high: Math.round(b * k) }); });
        const L = clamp(p.score + damp(lo) * k, 0, scaleMax), H = clamp(p.score + damp(hi) * k, 0, scaleMax);
        out.push({ month: m, date: fmtMonth(addMonths(start, m)), low: Math.round(Math.min(L, H)), high: Math.round(Math.max(L, H)),
          because: { start: p.score, rawLow: Math.round(lo * k), rawHigh: Math.round(hi * k), dampedLow: Math.round(damp(lo) * k), dampedHigh: Math.round(damp(hi) * k), method: 'sum of effects active this month; first 100 points in full, 60% above; rescaled ×' + k.toFixed(2) + ' to ' + BUREAU_NAME[p.bureau], breakdown } });
      }
      return out.slice(0, months + 1);
    };
    const p3 = proj('3m'), p6 = proj('6m');
    const contributions = effects.map(e => { const [a, b] = e.fn(6); return { label: e.label, low: Math.round(a * k), high: Math.round(b * k), plan: e.plan, because: e.because }; }).filter(x => x.low || x.high);

    const top = d.ranked.filter(x => x.rag !== 'green').slice(0, 2).map(x => x.label.toLowerCase());
    // Thin-file headline only when there is truly little history. Someone with a card and a problem on it (Priya) gets the 'holding you back' line.
    const thinHeadline = creditAccounts === 0 || p.oldestAccountYears < 1 || p.newToUK;
    const headline = thinHeadline ? `You don't have bad credit, you have very little of it. This plan builds it from zero.` : top.length ? `Your ${top.join(' and ')} ${top.length > 1 ? 'are' : 'is'} holding you back most.` : 'Your file is in good shape. The plan below keeps it there.';
    return {
      profile: p, start, scaleMax, bureau: BUREAU_NAME[p.bureau], headline, diagnosis: d, cash: c, sim, build,
      plans: { '3m': { steps: steps3, projection: p3 }, '6m': { steps: steps6, projection: p6 } },
      contributions, ladder, riskLine: Math.round(130 * k)
    };
  }


  // ---------- Report import: credit-coach-report/v1 JSON -> Profile + list of findings ----------
  function monthsBetween(a, b) { return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) - (b.getDate() < a.getDate() ? 1 : 0)); }
  function parseReport(j) {
    if (!j || !j.accounts || !j.personal) throw new Error('This file doesn\'t look like a credit report in the expected format.');
    const rd = new Date(j.reportDate || Date.now());
    const ago = s => monthsBetween(new Date(s), rd);
    const yrs = s => Math.floor(ago(s) / 12 * 10) / 10;
    const bureau = String(j.provider || 'experian').toLowerCase();
    const age = j.personal.dateOfBirth ? Math.floor(ago(j.personal.dateOfBirth) / 12) : 25;
    const cards = [], loans = [], lates = [], found = { report: [], bank: [], letter: [] };
    j.accounts.forEach(a => {
      (a.paymentHistory || []).forEach(h => { if (h.status && h.status !== 'OK') lates.push({ account: a.lender, monthsAgo: ago(h.month + '-28'), month: h.month }); });
      if (a.type === 'credit_card' && a.status !== 'closed') cards.push({ name: a.lender, limit: a.limit, balance: a.balance, apr: a.apr || 29.9, hasDD: !!a.directDebit, minOnly: a.paymentPattern === 'minimum', openedYears: yrs(a.opened) });
      else if (a.monthlyPayment) loans.push({ name: a.lender, monthly: a.monthlyPayment, openedYears: yrs(a.opened) });
    });
    const hard = (j.searches || []).filter(s => s.type === 'hard');
    const soft = (j.searches || []).filter(s => s.type !== 'hard');
    const curAddr = (j.addresses || []).find(a => a.current);
    const roll = (j.electoralRoll || []).find(e => curAddr && e.address === curAddr.address);
    const addresses3y = (j.addresses || []).filter(a => !a.to || ago(a.to) < 36).length || 1;
    const assoc = (j.financialAssociates || []).filter(a => a.stillLinked);
    const defaults = (j.defaults || []).map(d => ({ account: d.lender || d.account, monthsAgo: ago(d.date) }));
    const ccjs = (j.publicRecords || []).filter(r => /ccj|judg/i.test(r.type || '')).map(r => ({ monthsAgo: ago(r.date) }));
    const letter = (j.declineLetters || [])[0];
    const productId = letter ? (/balance/i.test(letter.product) ? 'bt' : /purchase|0%/i.test(letter.product) ? 'purchase' : 'classic') : null;
    const B = j.bankData || {}, rec = B.recurring || [];
    const cat = c => rec.filter(r => r.category === c);
    const amt = c => cat(c).reduce((s, r) => s + r.amount, 0);
    const income = amt('income');
    const bank = {
      rent: amt('rent'), rentByTransfer: cat('rent').some(r => r.method !== 'direct_debit'), councilTax: amt('council_tax'),
      bills: cat('utility').concat(cat('phone'), cat('broadband')).map(r => ({ name: r.payee, amount: r.amount, fixed: r.fixed !== false })),
      subscriptions: cat('subscription').map(r => ({ name: r.payee, amount: r.amount })),
      groceries: (B.averages || {}).groceries || 0, transport: (B.averages || {}).transport || 0, other: (B.averages || {}).eatingOut || 0,
      bnpl: amt('bnpl'), gambling: amt('gambling'), payday: amt('payday'), savings: amt('savings'),
      lateFees3m: (B.flags || {}).lateFees90d || 0, overdraftDays3m: (B.flags || {}).overdraftDays90d || 0, cashAdvances: (B.flags || {}).cashAdvances90d || 0,
      billsInOwnName: cat('utility').length > 0 || cat('council_tax').length > 0
    };
    const profile = {
      name: (j.personal.name || 'You').split(' ')[0], age, grossIncome: j.personal.declaredIncome || Math.round(income * 12 * 1.3),
      netIncome: income || null, housing: j.personal.residentialStatus || 'rent', goal: 'card', bureau: SCALE[bureau] ? bureau : 'experian',
      score: j.score.value, cards, loans, lates, defaults, ccjs, searches: hard.map(s => ago(s.date)), electoralRoll: !!(roll && roll.registered),
      addresses3y, staleAssociates: assoc.map(a => a.name), errorsOnReport: [],
      decline: letter ? { lender: letter.lender, productId, monthsAgo: ago(letter.date), product: letter.product,
        agency: (letter.text && (letter.text.match(/Experian|Equifax|TransUnion/i) || [])[0]) || null, statedReason: letter.statedReason || null } : null, bank,
      student: !!j.personal.student, newToUK: !!j.personal.newToUK, ukMonths: j.personal.ukSince ? ago(j.personal.ukSince) : null,
      canRegisterToVote: j.personal.canRegisterToVote !== false,
      hasPhoneContract: j.accounts.some(a => a.type === 'communications')
    };
    // Findings, in the order the app reveals them
    const F = (src, label, value, tone) => found[src].push({ label, value, tone: tone || 'neutral' });
    const tl = cards.reduce((s, c) => s + c.limit, 0), tb = cards.reduce((s, c) => s + c.balance, 0);
    F('report', 'Score', `${j.score.value} / ${(j.score.scaleMax || SCALE[bureau]).toLocaleString('en-GB')} (${j.provider}${j.score.band ? ', ' + j.score.band : ''})`);
    cards.forEach(c => F('report', c.name + ' card', `${gbp(c.balance)} of ${gbp(c.limit)} (${Math.round(c.balance / c.limit * 100)}%) · ${c.apr}% APR${c.minOnly ? ' · minimum payments' : ''}${c.hasDD ? '' : ' · no Direct Debit'}`, c.balance / c.limit > 0.5 ? 'bad' : c.balance / c.limit > 0.3 ? 'warn' : 'good'));
    if (cards.length > 1) F('report', 'All cards', `${gbp(tb)} of ${gbp(tl)} (${Math.round(tb / tl * 100)}%)`, tb / tl > 0.5 ? 'bad' : tb / tl > 0.3 ? 'warn' : 'good');
    loans.forEach(l => F('report', l.name, `${gbp(l.monthly)}/month, paid on time`, 'good'));
    lates.forEach(l => F('report', 'Late payment', `${l.account}, ${fmtMonth(new Date(l.month + '-01'))} (${l.monthsAgo} months ago)`, 'bad'));
    if (!lates.length) F('report', 'Payment history', 'No late payments', 'good');
    hard.forEach(s => F('report', 'Hard search', `${s.organisation}, ${fmtDate(new Date(s.date))}`, ago(s.date) < 3 ? 'warn' : 'neutral'));
    soft.forEach(s => F('report', 'Soft search', `${s.organisation} (lenders can't see this)`, 'neutral'));
    F('report', 'Electoral roll', roll && roll.registered ? 'Registered at current address' : `Not registered at ${curAddr ? curAddr.address.split(',')[0] : 'current address'}` + (j.personal.canRegisterToVote === false ? ' (may not be eligible)' : ''), roll && roll.registered ? 'good' : j.personal.canRegisterToVote === false ? 'warn' : 'bad');
    if (addresses3y > 1) F('report', 'Addresses', `${addresses3y} in the last 3 years`, 'warn');
    assoc.forEach(a => F('report', 'Financial associate', `${a.name}: ${a.reason}`, 'warn'));
    F('report', 'Defaults / CCJs', defaults.length + ccjs.length ? `${defaults.length + ccjs.length} on file` : 'None', defaults.length + ccjs.length ? 'bad' : 'good');
    if (B.recurring) {
      F('bank', 'Income', `${gbp(income)}/month take-home`, 'neutral');
      F('bank', 'Rent', `${gbp(bank.rent)}/month by ${bank.rentByTransfer ? 'bank transfer' : 'Direct Debit'}`, 'neutral');
      F('bank', 'Bills', [bank.councilTax ? 'Council Tax ' + gbp(bank.councilTax) : null].concat(bank.bills.map(b => b.name + ' ' + gbp(b.amount))).filter(Boolean).join(' · '), 'neutral');
      F('bank', 'Subscriptions', bank.subscriptions.map(s => s.name + ' ' + gbp2(s.amount)).join(' · '), 'neutral');
      F('bank', 'Everyday spending', `Groceries ${gbp(bank.groceries)} · transport ${gbp(bank.transport)} · eating out ${gbp(bank.other)} a month`, 'neutral');
      if (bank.bnpl) F('bank', 'Buy now, pay later', `${gbp(bank.bnpl)}/month (Klarna-type)`, 'warn');
      if (bank.gambling) F('bank', 'Gambling', `${gbp(bank.gambling)}/month`, 'bad');
      if (bank.lateFees3m) F('bank', 'Late fees', `${bank.lateFees3m} in 90 days`, 'bad');
      if (bank.overdraftDays3m) F('bank', 'Overdraft', `${bank.overdraftDays3m} days overdrawn in 90 days`, 'warn');
    }
    if (letter) { F('letter', 'Declined by', `${letter.lender}, ${letter.product}, ${fmtDate(new Date(letter.date))}`, 'bad'); F('letter', 'Reason given', /experian|equifax|transunion/i.test(letter.text) ? `None specific. Used ${(letter.text.match(/Experian|Equifax|TransUnion/i) || [''])[0]} data plus its own criteria.` : 'None specific', 'neutral'); }
    return { profile, found, reportDate: rd, provider: j.provider, fullName: j.personal.name, bankSource: B.source };
  }


  // ---------- Decline letter decoder ----------
  function decodeDecline(r) {
    const p = r.profile, dcl = p.decline; if (!dcl) return null;
    const t = totals(p), c = r.cash;
    const at = dcl.monthsAgo || 0; // months between the decline and the report
    const out = [];
    const add = (id, weight, title, evidence) => out.push({ id, weight, title, evidence });
    const latest = p.lates.length ? Math.min(...p.lates.map(l => l.monthsAgo)) : null;
    if (t.limit && t.util > 0.5) add('utilisation', 3, 'High credit utilisation', `You're using ${Math.round(t.util * 100)}% of your ${gbp(t.limit)} card limits. Lenders read that as stretched.`);
    else if (t.limit && t.util > 0.3) add('utilisation', 2, 'Utilisation over 30%', `You're using ${Math.round(t.util * 100)}% of your limits.`);
    if (latest != null && latest - at < 12) add('payment', 3, 'A recent late payment', `Your ${p.lates.find(l => l.monthsAgo === latest).account} payment was late ${latest - at} months before you applied.`);
    const near = p.searches.filter(m => m >= at && m <= at + 3).length;
    if (near >= 2) add('searches', 2, 'Several applications close together', `${near} hard searches in the 3 months around your application, including this one.`);
    if (!p.electoralRoll && p.canRegisterToVote !== false) add('identity', 2, 'Not on the electoral roll', 'Lenders couldn\'t confirm you at your current address.');
    if (p.staleAssociates.length) add('identity2', 1, 'Linked to someone else\'s credit', `Your file is still linked to ${p.staleAssociates.join(', ')}.`);
    if (c.surplus < 100) add('affordability', 2, 'Affordability looked tight', `After rent, bills and debts you have about ${gbp(c.surplus)} a month left.`);
    else if (c.surplus < 300 && dcl.productId === 'bt') add('affordability', 1, 'Not much room in your budget', `About ${gbp(c.surplus)} a month left after everything else.`);
    if (p.cards.length + (p.loans || []).length < 2 || p.oldestAccountYears < 1) add('depth', 3, 'Very little UK credit history', 'Lenders have almost nothing to judge you on yet.');
    const card = CARDS[dcl.productId];
    if (card) criteriaNow(p, card).filter(x => !x.ok).forEach(x => {
      if (/late|search|utilisation|roll/.test(x.label)) return; // already covered above
      add('criteria', 2, 'Outside the card\'s published criteria', `${card.name} prefers applicants ${x.label}.`);
    });
    out.sort((a, b) => b.weight - a.weight);
    out.forEach(x => x.likelihood = x.weight >= 3 ? 'Most likely' : x.weight === 2 ? 'Likely' : 'Possible');
    const FIX = {
      utilisation: () => ({ title: `Get your cards under 30% (${gbp(Math.floor(0.29 * t.limit))} or less)`, how: `Pay ${gbp(r.sim.extraM1)} extra this month, then ${gbp(r.sim.extraLater)} a month. Your plan shows the date you cross 30%.` }),
      payment: () => ({ title: 'Never miss another payment', how: 'Set Direct Debits for at least the minimum on every card today. The late mark fades over 6 to 12 months.' }),
      searches: () => ({ title: 'Stop applying for a few months', how: 'Each application leaves a hard search. Use QuickCheck (soft search) until you\'re confident.' }),
      identity: () => ({ title: 'Register to vote at your current address', how: 'Takes 5 minutes on gov.uk and shows in 6 to 8 weeks.' }),
      identity2: () => ({ title: 'Break the financial link', how: 'Ask each credit agency for a notice of disassociation.' }),
      affordability: () => ({ title: 'Free up monthly cash', how: 'Stop BNPL and any gambling or payday payments; the plan moves that money to your cards.' }),
      depth: () => ({ title: 'Build some history first', how: 'Follow the build-from-zero plan: electoral roll, Experian Boost, bills in your name, then a credit builder card.' }),
      criteria: () => ({ title: 'Try a card that fits you now', how: 'Start with a credit builder card such as Capital One Classic.' })
    };
    const fix = out.length ? FIX[out[0].id]() : { title: 'Check your report for errors', how: 'Nothing obvious stands out, so look for mistakes and dispute them.' };
    const reapply = r.ladder && r.ladder.graduateWhen && dcl.productId === 'bt' ? r.ladder.graduateWhen : fmtMonth(addMonths(r.start, Math.max(1, 3 - (p.searches.length ? Math.min(...p.searches) : 3))));
    const agency = dcl.agency || BUREAU_NAME[p.bureau];
    return {
      lender: dcl.lender, product: dcl.product || (card && card.name), agency, stated: dcl.statedReason || 'No specific reason given',
      reasons: out.slice(0, 4), fix,
      reapply: { when: reapply, how: `Run ${dcl.lender === 'Capital One' ? 'Capital One QuickCheck' : 'the lender\'s eligibility checker'} first. It's a soft search, so it won't show to other lenders. Only apply if it says yes.` },
      rights: [
        `If a lender turns you down because of credit agency data, it must tell you so and name the agency it used (Consumer Credit Act, s157). Your letter names ${agency}.`,
        `You can see your report from ${agency} for free (your statutory report).`,
        'If something is wrong, dispute it with the agency. It\'s free and they have up to 28 days.',
        'If something is right but has a reason behind it, add a notice of correction (up to 200 words) so lenders see your side.'
      ]
    };
  }


  // ---------- What-if simulator ----------
  // changes: [{lever:'paydown', value:300} | {lever:'stop', what:'bnpl'|'gambling'|'payday'} | {lever:'electoralRoll'} |
  //           {lever:'removeAssociates'} | {lever:'clearCard', card:'Aqua'} | {lever:'rentReporting', value:false} | {lever:'set', path:'bank.rent', value:700}]
  function applyChanges(profile, changes) {
    const p = JSON.parse(JSON.stringify(profile));
    p.bank = p.bank || {};
    const applied = [];
    (changes || []).forEach(ch => {
      switch (ch.lever) {
        case 'paydown': p.paydownOverride = Math.max(0, +ch.value || 0); applied.push(`Pay ${gbp(p.paydownOverride)} extra a month off cards`); break;
        case 'stop': if (['bnpl', 'gambling', 'payday'].includes(ch.what)) { applied.push(`Stop ${ch.what} (${gbp(p.bank[ch.what] || 0)}/month)`); p.bank[ch.what] = 0; } break;
        case 'electoralRoll': p.electoralRoll = ch.value !== false; applied.push(p.electoralRoll ? 'Registered on the electoral roll' : 'Not on the electoral roll'); break;
        case 'removeAssociates': applied.push('Financial links removed'); p.staleAssociates = []; break;
        case 'clearCard': (p.cards || []).forEach(c => { if ((!ch.card || c.name === ch.card) && c.balance > 0) { applied.push(`Clear ${c.name} (${gbp(c.balance)}) this month`); p.oneOffPayments = (p.oneOffPayments || []).concat([{ card: c.name }]); } }); break;
        case 'rentReporting': p.bank.rentByTransfer = ch.value !== false; applied.push(ch.value === false ? 'No rent reporting' : 'Rent reporting on'); break;
        case 'set': { const keys = String(ch.path || '').split('.'); let o = p; keys.slice(0, -1).forEach(k2 => { o[k2] = o[k2] || {}; o = o[k2]; }); if (keys[0]) { o[keys.at(-1)] = ch.value; applied.push(`${ch.path} = ${JSON.stringify(ch.value)}`); } break; }
      }
    });
    return { profile: p, applied };
  }
  function headlineNumbers(r) {
    const a = r.plans['3m'].projection.at(-1), b = r.plans['6m'].projection.at(-1);
    return { score: r.profile.score, m3: { low: a.low, high: a.high }, m6: { low: b.low, high: b.high },
      under30: r.sim.crossings[30] != null ? fmtMonth(addMonths(r.start, r.sim.crossings[30])) : null,
      paydown: [r.sim.extraM1, r.sim.extraLater], nextCard: r.ladder && r.ladder.graduateWhen || null, steps6: r.plans['6m'].steps.length };
  }
  // Levers are extra action ON TOP OF the plan. Anything the plan already does (register to vote, break a
  // financial link, stop BNPL/gambling/payday, pay the plan's amount) is a no-op that says so, so a lever
  // never lowers the estimate by "undoing" a plan step. Gains come from doing more, or sooner.
  function planLevers(before, changes) {
    const p = before.profile, keep = [], already = [];
    (changes || []).forEach(ch => {
      switch (ch.lever) {
        case 'electoralRoll':
          if (ch.value === false) { already.push('Staying off the electoral roll isn\'t an extra step, so nothing changes'); break; }
          if (p.electoralRoll) already.push('You\'re already on the electoral roll');
          else already.push('Registering to vote is already in your plan');
          break;
        case 'removeAssociates':
          already.push(p.staleAssociates.length ? 'Breaking financial links is already in your plan' : 'You have no financial links to break');
          break;
        case 'stop':
          if (['bnpl', 'gambling', 'payday'].includes(ch.what)) already.push(p.bank[ch.what] ? `Stopping ${ch.what === 'bnpl' ? 'buy now, pay later' : ch.what} is already in your plan (its ${gbp(p.bank[ch.what])}/month already goes to your card)` : `You have no ${ch.what === 'bnpl' ? 'buy now, pay later' : ch.what} payments to stop`);
          break;
        case 'rentReporting':
          if (ch.value === false) { already.push('Skipping rent reporting isn\'t an extra step, so nothing changes'); break; }
          if (p.housing === 'rent' && p.bank.rent && p.bank.rentByTransfer) already.push('Rent reporting is already in your plan');
          else keep.push(ch);
          break;
        case 'paydown': {
          const v = Math.max(0, +ch.value || 0), planMax = Math.max(before.sim.extraM1, before.sim.extraLater);
          if (v <= planMax) already.push(`Your plan already pays ${gbp(before.sim.extraM1)} then ${gbp(before.sim.extraLater)} a month extra, so ${gbp(v)} adds nothing`);
          else keep.push(ch);
          break;
        }
        case 'clearCard': {
          const owing = (p.cards || []).filter(c => (!ch.card || c.name === ch.card) && c.balance > 0);
          if (!owing.length) already.push('There\'s no card balance to clear');
          else keep.push(ch);
          break;
        }
        default: keep.push(ch);
      }
    });
    return { keep, already };
  }
  function whatIf(profile, changes, opts) {
    const before = run(profile, opts);
    const { keep, already } = planLevers(before, changes);
    const { profile: changed, applied: done } = applyChanges(before.profile, keep);
    const applied = done.concat(already);
    const after = run(changed, opts);
    const B = headlineNumbers(before), A = headlineNumbers(after);
    const keyOf = c => c.label;
    const bc = Object.fromEntries(before.contributions.map(c => [keyOf(c), c])), ac = Object.fromEntries(after.contributions.map(c => [keyOf(c), c]));
    const effectChanges = Array.from(new Set(Object.keys(bc).concat(Object.keys(ac)))).map(l => ({ effect: l,
      before: bc[l] ? [bc[l].low, bc[l].high] : null, after: ac[l] ? [ac[l].low, ac[l].high] : null,
      because: (ac[l] || bc[l]).because })).filter(x => JSON.stringify(x.before) !== JSON.stringify(x.after));
    const bt = new Set(before.plans['6m'].steps.map(s => s.title)), at2 = new Set(after.plans['6m'].steps.map(s => s.title));
    return {
      applied, before: B, after: A,
      delta: { m3: { low: A.m3.low - B.m3.low, high: A.m3.high - B.m3.high }, m6: { low: A.m6.low - B.m6.low, high: A.m6.high - B.m6.high } },
      because: { effectChanges, stepsAdded: [...at2].filter(x => !bt.has(x)), stepsRemoved: [...bt].filter(x => !at2.has(x)),
        under30: B.under30 !== A.under30 ? { before: B.under30, after: A.under30 } : null, nextCard: B.nextCard !== A.nextCard ? { before: B.nextCard, after: A.nextCard } : null },
      result: after, profile: changed
    };
  }
  // Clean JSON for an API response (no functions; dates as ISO strings)
  function toJSON(x) { return JSON.parse(JSON.stringify(x)); }
  function analyse(input, opts) {
    const parsed = input && input.accounts ? parseReport(input) : null;
    const profile = parsed ? parsed.profile : input;
    const r = run(profile, opts);
    return toJSON({ profile, findings: parsed && parsed.found, result: r, decline: decodeDecline(r) });
  }

  // Short text summary of a result for Claude
  function summary(r) {
    const p = r.profile;
    return JSON.stringify({
      person: { name: p.name, age: p.age, grossIncome: p.grossIncome, netMonthly: p.netIncome, housing: p.housing, goal: p.goal, bureau: r.bureau, score: p.score, scaleMax: r.scaleMax },
      headline: r.headline,
      factors: r.diagnosis.ranked.map(f => ({ factor: f.label, rag: f.rag, why: f.reason })),
      spendingFlags: r.diagnosis.flags, declineLikelyBecause: r.diagnosis.declineWhy,
      monthlySurplus: Math.round(r.cash.surplus), paydownPerMonth: [r.sim.extraM1, r.sim.extraLater],
      plan3m: r.plans['3m'].steps.map(s => fmtDate(s.date) + ': ' + s.title + ' - ' + s.instruction),
      plan6mExtra: r.plans['6m'].steps.filter(s => !r.plans['3m'].steps.some(x => x.title === s.title && +x.date === +s.date)).map(s => fmtDate(s.date) + ': ' + s.title + ' - ' + s.instruction),
      projection3m: r.plans['3m'].projection.slice(-1)[0], projection6m: r.plans['6m'].projection.slice(-1)[0],
      contributionsAt6m: r.contributions,
      capitalOne: r.ladder && { entryCard: r.ladder.entry && r.ladder.entry.name, reason: r.ladder.reason, putOnCard: r.ladder.tx && r.ladder.tx.chosen.map(x => x.name + ' ' + gbp2(x.amount)), nextCardChecklist: r.ladder.graduation, nextCardWhen: r.ladder.graduateWhen, saving: r.ladder.saving },
      missedPaymentRisk: -r.riskLine, buildFromZero: r.build, declineDecoded: decodeDecline(r)
    });
  }

  const PERSONAS = {
    priya: { name: 'Priya', blurb: '23, renting, one maxed-out card, late payment in July, declined by Capital One',
      age: 23, grossIncome: 24000, netIncome: 1680, housing: 'rent', goal: 'card', bureau: 'experian', score: 700,
      cards: [{ name: 'Barclaycard', limit: 1200, balance: 950, apr: 29.9, minOnly: true, hasDD: false, openedYears: 2 }],
      lates: [{ account: 'Barclaycard', monthsAgo: 4 }], searches: [1, 1, 2], electoralRoll: false, addresses3y: 2,
      decline: { lender: 'Capital One', productId: 'bt', monthsAgo: 1 },
      bank: { rent: 650, councilTax: 120, bills: [{ name: 'EE phone', amount: 18 }, { name: 'Octopus energy', amount: 60, fixed: false }],
        subscriptions: [{ name: 'Spotify', amount: 11.99 }, { name: 'Netflix', amount: 10.99 }], groceries: 320, transport: 130, bnpl: 40 } },
    sam: { name: 'Sam', blurb: '19, student, no credit history at all (thin file)',
      age: 19, grossIncome: 9500, netIncome: 790, housing: 'rent', goal: 'build', bureau: 'experian', score: 560,
      cards: [], searches: [], electoralRoll: true, addresses3y: 2, oldestAccountYears: 0,
      bank: { rent: 480, councilTax: 0, bills: [{ name: 'giffgaff phone', amount: 10 }], subscriptions: [{ name: 'Spotify Student', amount: 5.99 }, { name: 'Amazon Prime Student', amount: 4.49 }],
        groceries: 160, transport: 40, billsInOwnName: false } },
    dan: { name: 'Dan', blurb: '34, recovering from a default 2.5 years ago, still linked to an ex',
      age: 34, grossIncome: 32000, housing: 'rent', goal: 'mortgage', bureau: 'equifax', score: 420,
      cards: [{ name: 'Vanquis', limit: 500, balance: 120, apr: 39.9, hasDD: true, openedYears: 2 }],
      loans: [{ name: 'Car finance', monthly: 210, openedYears: 3 }],
      defaults: [{ account: 'Old overdraft', monthsAgo: 30 }], searches: [8], electoralRoll: true, addresses3y: 1,
      staleAssociates: ['an ex-partner (old joint account)'],
      bank: { rent: 850, councilTax: 150, bills: [{ name: 'Vodafone', amount: 25 }, { name: 'Sky broadband', amount: 35 }],
        subscriptions: [{ name: 'Disney+', amount: 8.99 }, { name: 'PureGym', amount: 24.99 }], groceries: 300, transport: 120, gambling: 60, savings: 50 } }
  };

  root.CreditEngine = { run, summary, parseReport, decodeDecline, whatIf, applyChanges, analyse, toJSON, SRC, PERSONAS, CARDS, normalise, fmtDate, fmtMonth, gbp, gbp2, SCALE };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CreditEngine;
})(typeof window !== 'undefined' ? window : globalThis);
