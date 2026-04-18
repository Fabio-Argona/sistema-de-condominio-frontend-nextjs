import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  const form = new formidable.IncomingForm();
  form.uploadDir = path.join(process.cwd(), "/tmp");
  form.keepExtensions = true;

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ message: "Erro ao processar arquivo" });
    }
    const file = files.file;
    if (!file) {
      return res.status(400).json({ message: "Arquivo não enviado" });
    }
    try {
      const buffer = fs.readFileSync(Array.isArray(file) ? file[0].filepath : file.filepath);
      const data = await pdfParse(buffer);
      const texto = data.text;
      // TODO: Parsear texto e salvar no banco
      return res.status(200).json({ message: `Arquivo recebido: ${file.originalFilename}`, texto });
    } catch (e) {
      return res.status(500).json({ message: "Erro ao ler PDF" });
    }
  });
}
