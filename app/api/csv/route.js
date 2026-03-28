import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const tipo = formData.get("tipo") || "Lista";
    const estrategia = formData.get("estrategia") || "A - Benchmark";
    const nome = formData.get("nome") || "";

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV vazio ou sem dados" }, { status: 400 });
    }

    // Parse header — normaliza nomes das colunas
    const header = lines[0].split(",").map((h) =>
      h.trim().toLowerCase().replace(/[^a-z]/g, "")
    );

    // Mapa de variações aceitas para cada campo
    const fieldMap = {
      nome:      ["nome", "name", "empresa", "company", "organizacao", "organization"],
      dominio:   ["dominio", "domain", "website", "site", "url"],
      setor:     ["setor", "sector", "industria", "industry", "segmento"],
      pais:      ["pais", "country", "paise", "país"],
      descricao: ["descricao", "description", "desc", "sobre", "about"],
      notas:     ["notas", "notes", "observacoes", "obs", "tier"],
    };

    // Resolve índice de cada campo no header
    const idx = {};
    for (const [field, variants] of Object.entries(fieldMap)) {
      idx[field] = header.findIndex((h) => variants.includes(h));
    }

    if (idx.nome === -1) {
      return NextResponse.json(
        { error: "Coluna 'nome' não encontrada. Verifique o cabeçalho do CSV." },
        { status: 400 }
      );
    }

    // Parse linhas
    const fonteNome = nome || file.name || "CSV Import";
    const seen = {};
    const companies = [];

    for (let i = 1; i < lines.length; i++) {
      // Suporta vírgulas dentro de aspas
      const cols = parseCSVLine(lines[i]);

      const company = {
        nome:      col(cols, idx.nome),
        dominio:   col(cols, idx.dominio),
        setor:     col(cols, idx.setor),
        pais:      col(cols, idx.pais),
        descricao: col(cols, idx.descricao),
        notas:     col(cols, idx.notas),
        fuente:    fonteNome,
        estrategia: estrategia,
        tipo:      tipo,
      };

      if (!company.nome || company.nome.length < 2) continue;

      const key = company.nome.toLowerCase().trim();
      if (seen[key]) continue;
      seen[key] = true;

      companies.push(company);
    }

    if (companies.length === 0) {
      return NextResponse.json({ error: "Nenhuma empresa válida encontrada no CSV." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, total: companies.length, preview: companies });

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function col(cols, i) {
  if (i === -1 || i >= cols.length) return "";
  return (cols[i] || "").trim();
}

function parseCSVLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}
