import { BrowserWindow } from 'electron'

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function money(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function buildConsignmentHtml(location) {
  const items = location.items || []
  const totalEntregue = items.reduce((s, i) => s + (Number(i.entregue) || 0), 0)
  const totalSaidas = items.reduce((s, i) => s + (Number(i.saidas) || 0), 0)
  const totalEstoque = items.reduce((s, i) => s + (Number(i.em_estoque) || 0), 0)
  const aReceber = items.reduce(
    (s, i) => s + (Number(i.saidas) || 0) * (Number(i.preco_lojista) || 0),
    0
  )
  const vendaEstimada = items.reduce(
    (s, i) => s + (Number(i.em_estoque) || 0) * (Number(i.preco_sugerido) || 0),
    0
  )

  const rows = items
    .map(
      (i) => `
      <tr>
        <td>${esc(i.codigo)}</td>
        <td>${esc(i.produto_nome)}</td>
        <td class="n">${esc(i.entregue)}</td>
        <td class="n">${esc(i.reposicao)}</td>
        <td class="n">${esc(i.saidas)}</td>
        <td class="n">${esc(i.em_estoque)}</td>
        <td class="n">${money(i.preco_lojista)}</td>
        <td class="n">${money(i.preco_sugerido)}</td>
      </tr>`
    )
    .join('')

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #222; background: #fff; font-size: 12px; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  .info { margin-bottom: 16px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 5px 6px; text-align: left; }
  th { background: #f0f0f0; }
  .n { text-align: right; white-space: nowrap; }
  .totais { margin-top: 16px; width: 50%; margin-left: auto; }
  .totais td:first-child { font-weight: bold; }
</style>
</head>
<body>
  <h1>Maeli Studio 3D — Relatório de Consignação</h1>
  <div class="info">
    <div><strong>Localização:</strong> ${esc(location.nome)}</div>
    <div><strong>Endereço:</strong> ${esc(location.endereco) || '-'}</div>
    <div><strong>Contato:</strong> ${esc(location.contato) || '-'}</div>
    <div><strong>Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Produto</th>
        <th class="n">Entregue</th>
        <th class="n">Reposição</th>
        <th class="n">Saídas</th>
        <th class="n">Em Estoque</th>
        <th class="n">Preço Lojista</th>
        <th class="n">Preço Sugerido</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totais">
    <tr><td>Total entregue</td><td class="n">${totalEntregue}</td></tr>
    <tr><td>Total de saídas</td><td class="n">${totalSaidas}</td></tr>
    <tr><td>Total em estoque</td><td class="n">${totalEstoque}</td></tr>
    <tr><td>A Receber</td><td class="n">${money(aReceber)}</td></tr>
    <tr><td>Venda Estimada</td><td class="n">${money(vendaEstimada)}</td></tr>
  </table>
</body>
</html>`
}

export async function renderPdf(html) {
  const win = new BrowserWindow({ show: false })
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    return await win.webContents.printToPDF({ pageSize: 'A4', printBackground: true })
  } finally {
    win.destroy()
  }
}
