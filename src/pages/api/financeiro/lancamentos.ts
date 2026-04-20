import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  try {
    const { periodo, resumo, lancamentos } = req.body;

    if (!lancamentos || !Array.isArray(lancamentos) || lancamentos.length === 0) {
      return res.status(400).json({ message: "Nenhum lançamento para salvar." });
    }

    // Monta o payload no formato esperado pelo backend Spring Boot
    const payload = {
      periodo,
      resumo,
      lancamentos: lancamentos.map((l: any) => ({
        data: l.data,
        descricao: l.descricao,
        razaoSocial: l.razaoSocial || "",
        cnpj: l.cnpj || "",
        valor: l.valor,
        saldo: l.saldo ?? null,
      })),
    };

    // Repassa o token JWT do header Authorization, se houver
    const authHeader = req.headers["authorization"] || "";

    const response = await axios.post(
      `${BACKEND_URL}/financeiro/lancamentos`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        timeout: 15000,
      }
    );

    return res.status(200).json({
      message: "Lançamentos salvos com sucesso!",
      data: response.data,
    });
  } catch (err: any) {
    console.error("Erro ao salvar lançamentos no backend:", err.response?.data || err.message);

    const status = err.response?.status || 500;
    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Erro ao salvar lançamentos.";

    return res.status(status).json({ message });
  }
}
