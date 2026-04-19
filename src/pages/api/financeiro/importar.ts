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
      
      // Lógica de parsing aprimorada para capturar Razão Social, CNPJ e Saldo
      const transacoes: any[] = [];
      const lines = fullText.split('\n');
      
      const periodoMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4})\s*até\s*(\d{2}\/\d{2}\/\d{4})/);
      const periodo = periodoMatch ? `${periodoMatch[1]} até ${periodoMatch[2]}` : "Período não identificado";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.length < 15) continue;

        // Cada transação geralmente começa com uma data
        const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})/);
        if (!dateMatch) continue;

        const data = dateMatch[1];
        let remaining = line.substring(data.length).trim();

        // Regex para encontrar valores monetários no formato 1.234,56 ou -1.234,56
        const moneyRegex = /(-?[\d.]*,\d{2})(?=\s|$)/g;
        const moneyMatches = Array.from(remaining.matchAll(moneyRegex));

        if (moneyMatches.length >= 1) {
          // O último valor costuma ser o saldo (se houver mais de um), o penúltimo é o valor da transação
          // Se houver apenas um, é o valor da transação
          let valorStr = "";
          let saldoStr = "";

          if (moneyMatches.length >= 2) {
            valorStr = moneyMatches[moneyMatches.length - 2][0];
            saldoStr = moneyMatches[moneyMatches.length - 1][0];
          } else {
            valorStr = moneyMatches[0][0];
          }

          // Extrair o texto central (Descrição + Razão Social + CNPJ)
          const valorIndex = remaining.indexOf(valorStr);
          let middleText = remaining.substring(0, valorIndex).trim();

          // Tentar extrair CNPJ/CPF
          const cnpjRegex = /(\d{2,3}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{3}\.?\d{3}\.?\d{3}-?\d{2})/;
          const cnpjMatch = middleText.match(cnpjRegex);
          let cnpj = "";
          let infoRestante = middleText;

          if (cnpjMatch) {
            cnpj = cnpjMatch[0];
            infoRestante = middleText.replace(cnpj, "").trim();
          }

          // Tentar separar Descrição de Razão Social
          // Geralmente a descrição é curta (até 2 ou 3 palavras)
          const partes = infoRestante.split(/\s{2,}/); // Tenta separar por espaços duplos
          let descricao = infoRestante;
          let razaoSocial = "";

          if (partes.length >= 2) {
            descricao = partes[0].trim();
            razaoSocial = partes.slice(1).join(" ").trim();
          } else {
            // Se não houver espaços duplos, tenta um corte arbitrário ou mantém tudo na descrição
            if (infoRestante.length > 25) {
               descricao = infoRestante.substring(0, 25).trim();
               razaoSocial = infoRestante.substring(25).trim();
            }
          }

          const valor = parseFloat(valorStr.replace(/\./g, "").replace(",", "."));
          const saldo = saldoStr ? parseFloat(saldoStr.replace(/\./g, "").replace(",", ".")) : null;

          if (!isNaN(valor)) {
            transacoes.push({
              data,
              descricao: descricao.toUpperCase(),
              razaoSocial: razaoSocial.toUpperCase(),
              cnpj,
              valor,
              saldo
            });
          }
        }
      }

      const saldoTotal = transacoes.length > 0 ? (transacoes[transacoes.length - 1].saldo ?? 0) : 0;

      return res.status(200).json({
        message: "Arquivo processado com sucesso",
        periodo,
        resumo: {
          saldoTotal,
          limite: 0,
          utilizado: 0,
          disponivel: saldoTotal
        },
        transacoes
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
