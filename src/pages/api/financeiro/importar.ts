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
      console.log("Carregando pdf-parse");
      const pdf = require("pdf-parse");
      const data = await pdf(buffer);
      console.log("PDF parseado com sucesso");
      
      return res.status(200).json({
        message: "Arquivo processado com sucesso",
        texto: data.text
      });
    } catch (pdfErr: any) {
      console.error("Erro no pdf-parse:", pdfErr);
      return res.status(500).json({ message: "Erro ao extrair texto do PDF", error: pdfErr.message });
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
