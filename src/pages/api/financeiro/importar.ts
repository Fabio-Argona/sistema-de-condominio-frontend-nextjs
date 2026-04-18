import { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm } from "formidable";
import fs from "fs";
import * as pdf from "pdf-parse";

// Forçamos o tipo para evitar erros de lint e garantir que funcionará tanto como import padrão quanto nomeado
const parsePdf = (pdf as any).default || pdf;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  const form = new IncomingForm();

  try {
    const { fields, files } = await new Promise<{ fields: any, files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
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
    
    try {
      const data = await parsePdf(buffer);
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
  } catch (formError: any) {
    console.error("Erro no formidable:", formError);
    return res.status(500).json({ message: "Erro ao processar formulário", error: formError.message });
  }
}
