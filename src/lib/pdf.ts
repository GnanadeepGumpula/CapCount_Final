import { formatDate, formatINR } from './format';
import type { ProjectLedger } from './types';

export async function exportProjectPdf(ledger: ProjectLedger): Promise<void> {
  const win = window.open('', '_blank');
  if (!win) {
    throw new Error('Pop-up blocked. Please allow pop-ups to export the report.');
  }

  const html = buildReportHtml(ledger);
  win.document.open();
  win.document.write(html);
  win.document.close();

  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 250);
  };
}

function buildReportHtml(ledger: ProjectLedger): string {
  const { project, fundingSources, expenseObjects, expensePeople, totalInflow, totalOutflow, remainingBalance } = ledger;
  const installmentsTotal = expensePeople.reduce((s, p) => s + p.total_paid, 0);
  const objectsTotal = expenseObjects.reduce((s, o) => s + Number(o.amount), 0);
  const generated = new Date().toLocaleString('en-IN');

  const fundingRows = fundingSources
    .map(
      (f) => `<tr>
        <td>${escape(f.source_name)}</td>
        <td class="num">${formatINR(Number(f.amount))}</td>
        <td>${escape(f.payment_method)}</td>
        <td>${formatDate(f.date)}</td>
      </tr>`,
    )
    .join('');

  const objectRows = expenseObjects
    .map(
      (o) => `<tr>
        <td>${escape(o.item_name)}</td>
        <td class="num">${formatINR(Number(o.amount))}</td>
        <td>${escape(o.payment_method)}</td>
        <td>${formatDate(o.date)}</td>
        <td>${o.proof_url ? `<a href="${escape(o.proof_url)}" target="_blank">Receipt</a>` : '—'}</td>
      </tr>`,
    )
    .join('');

  const personRows = expensePeople
    .map(
      (p) => `<tr>
        <td>${escape(p.name)}</td>
        <td>${escape(p.role)}</td>
        <td class="num">${formatINR(Number(p.agreed_total_contract))}</td>
        <td class="num">${formatINR(p.total_paid)}</td>
        <td class="num">${formatINR(p.remaining)}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escape(project.title)} — CapCount Report</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2329; margin: 0; padding: 40px; background: #fff; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1fa15f; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .logo { width: 36px; height: 36px; border-radius: 10px; background: #1fa15f; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
  .brand h1 { font-size: 18px; margin: 0; }
  .brand p { font-size: 11px; color: #636e80; margin: 0; }
  .meta { text-align: right; font-size: 12px; color: #636e80; }
  h2 { font-size: 20px; margin: 32px 0 8px; }
  .sub { color: #636e80; font-size: 13px; margin: 0 0 16px; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .stat { border: 1px solid #eceef2; border-radius: 12px; padding: 16px; }
  .stat .l { font-size: 11px; color: #636e80; text-transform: uppercase; letter-spacing: 0.04em; }
  .stat .v { font-size: 22px; font-weight: 700; margin-top: 6px; }
  .inflow .v { color: #12824c; }
  .outflow .v { color: #ea580c; }
  .balance .v { color: ${remainingBalance < 0 ? '#dc2626' : '#1f2329'}; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
  th { text-align: left; background: #f6f7f9; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #636e80; border-bottom: 1px solid #eceef2; }
  td { padding: 10px 12px; border-bottom: 1px solid #eceef2; }
  .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
  .empty { text-align: center; color: #828d9d; padding: 24px; }
  .foot { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eceef2; font-size: 11px; color: #828d9d; display: flex; justify-content: space-between; }
  @media print { body { padding: 16px; } .head { break-after: avoid; } h2 { break-after: avoid; } table { break-inside: avoid; } }
</style>
</head>
<body>
  <div class="head">
    <div class="brand">
      <div class="logo">C</div>
      <div>
        <h1>CapCount Report</h1>
        <p>Production Ledger</p>
      </div>
    </div>
    <div class="meta">
      <div><strong>${escape(project.title)}</strong></div>
      <div>Generated ${generated}</div>
    </div>
  </div>

  <div class="summary">
    <div class="stat inflow"><div class="l">Total Inflow</div><div class="v">${formatINR(totalInflow)}</div></div>
    <div class="stat outflow"><div class="l">Total Outflow</div><div class="v">${formatINR(totalOutflow)}</div></div>
    <div class="stat balance"><div class="l">Remaining Balance</div><div class="v">${formatINR(remainingBalance)}</div></div>
  </div>

  <h2>Funding Sources</h2>
  <p class="sub">${fundingSources.length} entr${fundingSources.length === 1 ? 'y' : 'ies'} · Total ${formatINR(totalInflow)}</p>
  ${fundingSources.length ? `<table><thead><tr><th>Source</th><th style="text-align:right">Amount</th><th>Method</th><th>Date</th></tr></thead><tbody>${fundingRows}</tbody></table>` : '<div class="empty">No funding sources logged.</div>'}

  <h2>Expense Objects</h2>
  <p class="sub">${expenseObjects.length} entr${expenseObjects.length === 1 ? 'y' : 'ies'} · Total ${formatINR(objectsTotal)}</p>
  ${expenseObjects.length ? `<table><thead><tr><th>Item</th><th style="text-align:right">Amount</th><th>Method</th><th>Date</th><th>Receipt</th></tr></thead><tbody>${objectRows}</tbody></table>` : '<div class="empty">No object expenses logged.</div>'}

  <h2>People & Installments</h2>
  <p class="sub">${expensePeople.length} people · Paid ${formatINR(installmentsTotal)} of ${formatINR(expensePeople.reduce((s, p) => s + Number(p.agreed_total_contract), 0))} contracted</p>
  ${expensePeople.length ? `<table><thead><tr><th>Name</th><th>Role</th><th style="text-align:right">Contract</th><th style="text-align:right">Paid</th><th style="text-align:right">Owed</th></tr></thead><tbody>${personRows}</tbody></table>` : '<div class="empty">No people logged.</div>'}

  <div class="foot">
    <span>CapCount — confidential financial report for ${escape(project.title)}.</span>
    <span>Page 1 of 1</span>
  </div>
</body>
</html>`;
}

function escape(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
