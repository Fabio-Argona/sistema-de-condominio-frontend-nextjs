import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const BACKEND_URL = process.env.BACKEND_URL || "http://100.51.89.148:8080";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  const { ano, mes } = req.query;
  if (!ano || !mes) {
    return res.status(400).json({ message: "Parâmetros 'ano' e 'mes' são obrigatórios." });
  }

  const authHeader = req.headers["authorization"] || "";
  const headers = {
    "Content-Type": "application/json",
    ...(authHeader ? { Authorization: authHeader } : {}),
  };

  try {
    const response = await axios.delete(
      `${BACKEND_URL}/api/financeiro/lancamentos/mes?ano=${ano}&mes=${mes}`,
      { headers, timeout: 15000 }
    );
    return res.status(200).json({ message: response.data });
  } catch (err: any) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || "Erro ao excluir lançamentos do mês.";
    return res.status(status).json({ message });
  }
}
