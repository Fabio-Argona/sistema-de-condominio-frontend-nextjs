import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Início do handler importar.ts");

  // Polyfill para DOMMatrix (necessário para versões recentes do pdfjs-dist no Node.js)
  if (typeof (global as any).DOMMatrix === "undefined") {
    (global as any).DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      m11 = 1; m12 = 0; m13 = 0; m14 = 0;
      m21 = 0; m22 = 1; m23 = 0; m24 = 0;
      m31 = 0; m32 = 0; m33 = 1; m34 = 0;
      m41 = 0; m42 = 0; m43 = 0; m44 = 1;
      is2D = true;
      isIdentity = true;
      constructor() {}
      toString() { return "[object DOMMatrix]"; }
    };
  }
  
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Método não permitido" });
    }

    // Carregamento dinâmico do formidable
    const formidable = require("formidable");
    const form = new formidable.IncomingForm({
      uploadDir: "/tmp",
      keepExtensions: true,
    });

    console.log("Iniciando form.parse");
    const { fields, files } = await new Promise<{ fields: any, files: any }>((resolve, reject) => {
      form.parse(req, (err: any, fields: any, files: any) => {
        if (err) {
          console.error("Erro formidable:", err);
          reject(err);
        } else {
          resolve({ fields, files });
        }
      });
    });

    const file = files.file;
    if (!file) {
      console.log("Arquivo não encontrado no request");
      return res.status(400).json({ message: "Arquivo (campo 'file') não enviado" });
    }

    const fileObj = Array.isArray(file) ? file[0] : file;
    const filepath = fileObj.filepath || fileObj.path;
    
    if (!filepath) {
      return res.status(400).json({ message: "Erro ao localizar caminho temporário do arquivo" });
    }

    const buffer = fs.readFileSync(filepath);
    console.log("Arquivo lido, tamanho:", buffer.length);

    try {
      console.log("Carregando pdfjs-dist (legacy)");
      // @ts-ignore
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      
      // No Node.js com pdfjs-dist v5, precisamos configurar o worker manualmente
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        // @ts-ignore
        const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker.default || pdfjsWorker;
      }
      
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
        useWorkerFetch: false,
        isEvalSupported: false,
        disableRange: true,
        stopAtErrors: false,
      });

      const pdfDocument = await loadingTask.promise;
      console.log(`PDF carregado: ${pdfDocument.numPages} páginas`);
      
      let fullText = "";
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + "\n";
      }

      console.log("Extração de texto concluída");
      
      const transacoes: any[] = [];
      const periodoMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4})\s*até\s*(\d{2}\/\d{2}\/\d{4})/);
      const periodo = periodoMatch ? `${periodoMatch[1]} até ${periodoMatch[2]}` : "Período não identificado";

      // Regex para encontrar blocos de transação que começam com data
      // O padrão usa um Lookahead positivo para encontrar a próxima data ou o fim do arquivo
      const blockRegex = /(\d{2}\/\d{2}\/\d{4})([\s\S]+?)(?=\d{2}\/\d{2}\/\d{4}|$)/g;
      
      let blockMatch;
      while ((blockMatch = blockRegex.exec(fullText)) !== null) {
        const data = blockMatch[1];
        const content = blockMatch[2].replace(/\s+/g, " ").trim();
        
        if (content.length < 5) continue;

        // Encontrar valores no formato 1.234,56 ou -1.234,56
        const moneyRegex = /(-?[\d.]*,\d{2})(?=\s|$)/g;
        const moneyMatches = Array.from(content.matchAll(moneyRegex));

        if (moneyMatches.length >= 1) {
          // Último é Saldo, penúltimo (ou único) é Valor
          let valorStr = "";
          let saldoStr = "";

          if (moneyMatches.length >= 2) {
            valorStr = moneyMatches[moneyMatches.length - 2][0];
            saldoStr = moneyMatches[moneyMatches.length - 1][0];
          } else {
            valorStr = moneyMatches[0][0];
          }

          // Texto entre a data e o valor
          const valorIndex = content.indexOf(valorStr);
          let middle = content.substring(0, valorIndex).trim();

          // Extrair CNPJ/CPF
          const cnpjRegex = /(\d{2,3}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{3}\.?\d{3}\.?\d{3}-?\d{2})/;
          const cnpjMatch = middle.match(cnpjRegex);
          let cnpj = "";
          let textoLimpo = middle;

          if (cnpjMatch) {
            cnpj = cnpjMatch[0];
            textoLimpo = middle.replace(cnpj, "").trim();
          }

          // Separar Lançamento de Razão Social
          // Tentamos pegar as primeiras 3-4 palavras como lançamento/descrição curta
          const palavras = textoLimpo.split(" ");
          let descricao = palavras.slice(0, 3).join(" ").toUpperCase();
          let razaoSocial = palavras.slice(3).join(" ").toUpperCase();

          // Regras de substituição solicitadas pelo usuário
          if (descricao.includes("PIX ENVIADO FABIO")) {
            descricao = descricao.replace("PIX ENVIADO FABIO", "PIX ENVIADO Adm");
          }
          
          if (descricao.includes("LUIS ARGONA")) {
            descricao = descricao.replace("LUIS ARGONA", "ADMINISTRACAO RESIDENCIAL OCEANO");
          }
          if (razaoSocial.includes("LUIS ARGONA")) {
            razaoSocial = razaoSocial.replace("LUIS ARGONA", "ADMINISTRACAO RESIDENCIAL OCEANO");
          }

          const valor = parseFloat(valorStr.replace(/\./g, "").replace(",", "."));
          const saldo = saldoStr ? parseFloat(saldoStr.replace(/\./g, "").replace(",", ".")) : null;

          if (!isNaN(valor)) {
            transacoes.push({
              data,
              descricao,
              razaoSocial,
              cnpj,
              valor,
              saldo
            });
          }
        }
      }

      // ─── Helpers de identificação ───────────────────────────────────────────
      const isSaldoMovConta = (d: string) =>
        d.includes("SALDO MOVIMENTA") || d.includes("SALDO MOV") || d.includes("MOV CONTA");

      const isResAplicAut = (d: string) =>
        d.includes("RES APLIC") || d.includes("REND APLIC") || d.includes("APLIC AUT") || d.includes("APLIC. AUT");

      const isRendPago = (d: string) =>
        d.includes("RENDIMENTOS") || d.includes("REND PAGO");

      const isSaldoDisponivel = (d: string) =>
        d.includes("SALDO TOTAL") || d.includes("DISPONÍVEL") || d.includes("DISPONIVEL") || d.includes("SALDO DISP");

      const isSaldoAplicAut = (d: string) =>
        d.includes("SALDO APLIC");

      // ─── 1. Remover SALDO MOVIMENTAÇÃO CONTA ────────────────────────────────
      const semSaldoMovConta = transacoes.filter((tr) => !isSaldoMovConta(tr.descricao));

      // ─── 2. Agrupar RES APLIC AUT em uma única linha (soma dos valores) ─────
      let somaResAplicAut = 0;
      let primeiroResAplicAut: any = null;
      let somaRendPago = 0;
      let primeiroRendPago: any = null;
      const filtradas: any[] = [];

      for (const tr of semSaldoMovConta) {
        if (isResAplicAut(tr.descricao)) {
          somaResAplicAut += tr.valor;
          if (!primeiroResAplicAut) primeiroResAplicAut = { ...tr };
        } else if (isRendPago(tr.descricao)) {
          somaRendPago += tr.valor;
          if (!primeiroRendPago) primeiroRendPago = { ...tr };
        } else {
          filtradas.push(tr);
        }
      }

      // Insere a linha consolidada de RES APLIC AUT (se houver)
      if (primeiroResAplicAut) {
        primeiroResAplicAut.valor = somaResAplicAut;
        primeiroResAplicAut.saldo = null;
        filtradas.push(primeiroResAplicAut);
      }

      // Insere a linha consolidada de RENDIMENTOS REND PAGO (se houver)
      if (primeiroRendPago) {
        primeiroRendPago.descricao = "RENDIMENTOS REND PAGO";
        primeiroRendPago.valor = somaRendPago;
        primeiroRendPago.saldo = null;
        filtradas.push(primeiroRendPago);
      }

      // ─── 3. Remover SALDO APLIC. AUT. ───────────────────────────────────────
      const semSaldoAplicAut = filtradas.filter((tr) => !isSaldoAplicAut(tr.descricao));

      // ─── 4. Manter apenas o SALDO DISPONIVEL mais recente ───────────────────
      const saldoDisponivelEntries = semSaldoAplicAut.filter((tr) => isSaldoDisponivel(tr.descricao));
      const ultimoSaldoDisponivel = saldoDisponivelEntries[saldoDisponivelEntries.length - 1] ?? null;

      const semSaldosAntigos = semSaldoAplicAut.filter((tr) => !isSaldoDisponivel(tr.descricao));

      // Re-adiciona apenas o último SALDO DISPONÍVEL ao final da lista
      const listaFinal = ultimoSaldoDisponivel
        ? [...semSaldosAntigos, ultimoSaldoDisponivel]
        : semSaldosAntigos;

      // ─── Saldo total = valor/saldo do último SALDO DISPONÍVEL ────────────────
      const saldoTotal =
        ultimoSaldoDisponivel?.saldo ??
        ultimoSaldoDisponivel?.valor ??
        (listaFinal.length > 0 ? (listaFinal[listaFinal.length - 1].saldo ?? 0) : 0);

      return res.status(200).json({
        message: "Arquivo processado com sucesso",
        periodo,
        resumo: {
          saldoTotal,
          limite: 0,
          utilizado: 0,
          disponivel: saldoTotal
        },
        transacoes: listaFinal
      });
    } catch (pdfErr: any) {
      console.error("Erro no pdfjs-dist:", pdfErr);
      return res.status(500).json({ message: "Erro ao extrair texto do PDF (pdfjs)", error: pdfErr.message });
    }

  } catch (err: any) {
    console.error("Erro crítico na API:", err);
    return res.status(500).json({ 
      message: "Falha crítica no processamento", 
      error: err.message,
      stack: err.stack 
    });
  }
}
