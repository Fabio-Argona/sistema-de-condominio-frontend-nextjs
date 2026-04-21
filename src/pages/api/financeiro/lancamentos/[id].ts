import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const BACKEND_URL = process.env.BACKEND_URL || "http://100.51.89.148:8080";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const authHeader = req.headers["authorization"] || "";
  const headers = {
    "Content-Type": "application/json",
    ...(authHeader ? { Authorization: authHeader } : {}),
  };

  // ── PUT: atualiza um lançamento ──────────────────────────────────────────
  if (req.method === "PUT") {
    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/financeiro/lancamentos/${id}`,
        req.body,
        { headers, timeout: 15000 }
      );
      return res.status(200).json(response.data);
    } catch (err: any) {
      const status = err.response?.status || 500;
      const message = err.response?.data?.message || err.message || "Erro ao atualizar lançamento.";
      return res.status(status).json({ message });
    }
  }

  // ── DELETE: exclui um lançamento ─────────────────────────────────────────
  if (req.method === "DELETE") {
    try {
      await axios.delete(
        `${BACKEND_URL}/api/financeiro/lancamentos/${id}`,
        { headers, timeout: 15000 }
      );
      return res.status(200).json({ message: "Lançamento excluído com sucesso." });
    } catch (err: any) {
      const status = err.response?.status || 500;
      const message = err.response?.data?.message || err.message || "Erro ao excluir lançamento.";
      return res.status(status).json({ message });
    }
  }

  return res.status(405).json({ message: "Método não permitido" });
}
