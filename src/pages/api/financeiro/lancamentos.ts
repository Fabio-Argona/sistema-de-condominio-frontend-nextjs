import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const BACKEND_URL = process.env.BACKEND_URL || "http://100.51.89.148:8080";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  try {
    const body = req.body;

    // Aceita tanto array direto quanto { lancamentos: [...] }
    let lancamentos: any[] = [];
    if (Array.isArray(body)) {
      lancamentos = body;
    } else if (body?.lancamentos && Array.isArray(body.lancamentos)) {
      lancamentos = body.lancamentos;
    }

    if (!lancamentos || lancamentos.length === 0) {
      return res.status(400).json({ message: "Nenhum lançamento para salvar." });
    }

    // Converte para o formato esperado pelo Spring Boot:
    // { data: "yyyy-MM-dd", descricao, valor (positivo), tipo: "RECEITA"|"GASTO" }
    const payload = lancamentos.map((l: any) => {
      // Converte "dd/MM/yyyy" → "yyyy-MM-dd" se necessário
      let dataISO = l.data;
      if (l.data && l.data.includes("/")) {
        const [dia, mes, ano] = l.data.split("/");
        dataISO = `${ano}-${mes}-${dia}`;
      }
      const desc = [l.descricao, l.razaoSocial].filter(Boolean).join(" — ");
      return {
        data: dataISO,
        descricao: (desc || l.descricao || "").substring(0, 255),
        valor: Math.abs(Number(l.valor)),
        tipo: l.tipo || (Number(l.valor) >= 0 ? "RECEITA" : "GASTO"),
      };
    });

    // Repassa o token JWT
    const authHeader = req.headers["authorization"] || "";

    const response = await axios.post(
      `${BACKEND_URL}/api/financeiro/lancamentos`,
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
      total: payload.length,
      data: response.data,
    });
  } catch (err: any) {
    console.error("Erro ao salvar lançamentos:", err.response?.data || err.message);
    const status = err.response?.status || 500;
    const message =
      err.response?.data?.message ||
      err.response?.data ||
      err.message ||
      "Erro ao salvar lançamentos.";
    return res.status(status).json({ message });
  }
}
