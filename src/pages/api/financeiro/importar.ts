import { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm } from "formidable";
import fs from "fs";

// Usando require para evitar problemas de compatibilidade com CommonJS/ESM
const pdf = require("pdf-parse");

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("Chamada recebida em /api/financeiro/importar", { method: req.method });
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Método não permitido" });
    }

    const form = new IncomingForm({
      uploadDir: "/tmp",
      keepExtensions: true,
    });

    const { fields, files } = await new Promise<{ fields: any, files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error("Erro no form.parse:", err);
          reject(err);
        } else {
          resolve({ fields, files });
        }
      });
    });
    
    const file = files.file;

    if (!file) {
      return res.status(400).json({ message: "Arquivo não enviado" });
    }

    const fileObj = Array.isArray(file) ? file[0] : file;
    const filepath = (fileObj as any).filepath || (fileObj as any).path;

    if (!filepath) {
      return res.status(400).json({ message: "Caminho do arquivo não encontrado" });
    }

    const buffer = fs.readFileSync(filepath);
    console.log("Arquivo lido com sucesso, tamanho:", buffer.length);
    
    try {
      console.log("Iniciando parse do PDF...");
      const data = await pdf(buffer);
      console.log("Parse do PDF concluído com sucesso.");
      const texto = data.text;
      
      // TODO: Parsear texto e salvar no banco
      return res.status(200).json({ 
        message: "Arquivo processado com sucesso", 
        texto: texto
      });
    } catch (pdfError: any) {
      console.error("Erro no pdf-parse:", pdfError);
      return res.status(500).json({ message: "Erro ao processar conteúdo do PDF", error: pdfError.message });
    }
  } catch (globalError: any) {
    console.error("Erro Global na API:", globalError);
    return res.status(500).json({ 
      message: "Erro interno inesperado", 
      error: globalError.message,
      stack: globalError.stack 
    });
  }
}
