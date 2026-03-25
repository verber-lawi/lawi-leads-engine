import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const PAGE_ID = process.env.NOTION_PAGE_ID;

let dbIds = null;

// Find existing databases — never creates new ones
export async function ensureDatabases() {
  if (dbIds) return dbIds;

  const children = await notion.blocks.children.list({ block_id: PAGE_ID, page_size: 100 });
  const found = {};

  for (const block of children.results) {
    if (block.type === "child_database") {
      const title = block.child_database?.title || "";
      // Only grab the FIRST match of each type (avoids duplicates)
      if (title.includes("Leads") && !found.leads) found.leads = block.id;
      if (title.includes("Empresas") && !found.empresas) found.empresas = block.id;
      if (title.includes("Fontes") && !found.fontes) found.fontes = block.id;
      if ((title.includes("Interações") || title.includes("Interacoes")) && !found.interacoes) found.interacoes = block.id;
      if (title.includes("Templates") && !found.templates) found.templates = block.id;
    }
  }

  dbIds = found;
  return dbIds;
}

// ============ CRUD Operations ============

export async function addLead(data) {
  const dbs = await ensureDatabases();
  if (!dbs.leads) throw new Error("Database 'Leads' no encontrada en Notion. Créala manualmente.");
  const props = {
    "Nome": { title: [{ text: { content: data.nome || "" } }] },
    "Cargo": { rich_text: [{ text: { content: data.cargo || "" } }] },
    "Empresa": { rich_text: [{ text: { content: data.empresa || "" } }] },
    "Pipeline": { select: { name: "Nuevo" } },
    "Fuente": { rich_text: [{ text: { content: data.fuente || "" } }] },
  };
  if (data.email) props["Email"] = { email: data.email };
  if (data.pais) props["País"] = { select: { name: data.pais } };
  if (data.setor) props["Setor"] = { select: { name: data.setor } };
  if (data.estagio) props["Estágio"] = { select: { name: data.estagio } };
  if (data.persona) props["Persona"] = { select: { name: data.persona } };
  if (data.estrategia) props["Estrategia"] = { select: { name: data.estrategia } };
  if (data.linkedin) props["LinkedIn"] = { url: data.linkedin };
  if (data.notas) props["Notas"] = { rich_text: [{ text: { content: data.notas } }] };
  if (data.interes) props["Interés"] = { number: data.interes };

  return notion.pages.create({ parent: { database_id: dbs.leads }, properties: props });
}

export async function addBulkLeads(leads) {
  const results = [];
  for (const lead of leads) {
    try {
      const res = await addLead(lead);
      results.push({ ok: true, id: res.id, nome: lead.nome });
    } catch (e) {
      results.push({ ok: false, nome: lead.nome, error: e.message });
    }
  }
  return results;
}

export async function getLeads(filter) {
  const dbs = await ensureDatabases();
  if (!dbs.leads) return [];
  const params = { database_id: dbs.leads, page_size: 100 };

  if (filter) {
    const conditions = [];
    if (filter.pipeline) conditions.push({ property: "Pipeline", select: { equals: filter.pipeline } });
    if (filter.persona) conditions.push({ property: "Persona", select: { equals: filter.persona } });
    if (filter.estrategia) conditions.push({ property: "Estrategia", select: { equals: filter.estrategia } });
    if (filter.pais) conditions.push({ property: "País", select: { equals: filter.pais } });
    if (conditions.length === 1) params.filter = conditions[0];
    if (conditions.length > 1) params.filter = { and: conditions };
  }

  params.sorts = [{ property: "Nome", direction: "ascending" }];
  const res = await notion.databases.query(params);
  return res.results.map(parseLeadPage);
}

export async function updateLeadPipeline(pageId, pipeline) {
  return notion.pages.update({
    page_id: pageId,
    properties: { "Pipeline": { select: { name: pipeline } } },
  });
}

export async function addFonte(data) {
  const dbs = await ensureDatabases();
  if (!dbs.fontes) return null;
  const props = {
    "Nome": { title: [{ text: { content: data.nome } }] },
    "Tipo": { select: { name: data.tipo } },
    "Leads Importados": { number: data.leadsCount || 0 },
    "Último Scraping": { date: { start: new Date().toISOString().split("T")[0] } },
    "Status": { select: { name: "Processado" } },
  };
  if (data.url) props["URL"] = { url: data.url };
  if (data.estrategia) props["Estrategia"] = { select: { name: data.estrategia } };
  return notion.pages.create({ parent: { database_id: dbs.fontes }, properties: props });
}

export async function getFontes() {
  const dbs = await ensureDatabases();
  if (!dbs.fontes) return [];
  const res = await notion.databases.query({
    database_id: dbs.fontes,
    sorts: [{ timestamp: "created_time", direction: "descending" }],
  });
  return res.results.map(p => ({
    id: p.id,
    nome: p.properties["Nome"]?.title?.[0]?.plain_text || "",
    tipo: p.properties["Tipo"]?.select?.name || "",
    url: p.properties["URL"]?.url || "",
    estrategia: p.properties["Estrategia"]?.select?.name || "",
    leadsCount: p.properties["Leads Importados"]?.number || 0,
    ultimoScraping: p.properties["Último Scraping"]?.date?.start || "",
    status: p.properties["Status"]?.select?.name || "",
  }));
}

export async function getStats() {
  const dbs = await ensureDatabases();
  if (!dbs.leads) return { total: 0, byPipeline: {}, byPersona: {}, byEstrategia: {}, byPais: {} };

  const all = [];
  let cursor = undefined;
  do {
    const res = await notion.databases.query({ database_id: dbs.leads, page_size: 100, start_cursor: cursor });
    all.push(...res.results.map(parseLeadPage));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  const byPipeline = {}, byPersona = {}, byEstrategia = {}, byPais = {};
  for (const l of all) {
    byPipeline[l.pipeline] = (byPipeline[l.pipeline] || 0) + 1;
    if (l.persona) byPersona[l.persona] = (byPersona[l.persona] || 0) + 1;
    if (l.estrategia) byEstrategia[l.estrategia] = (byEstrategia[l.estrategia] || 0) + 1;
    if (l.pais) byPais[l.pais] = (byPais[l.pais] || 0) + 1;
  }

  // Get fontes too
  let fontesCount = 0;
  if (dbs.fontes) {
    const f = await notion.databases.query({ database_id: dbs.fontes, page_size: 100 });
    fontesCount = f.results.length;
  }

  return { total: all.length, byPipeline, byPersona, byEstrategia, byPais, fontes: fontesCount };
}

function parseLeadPage(p) {
  return {
    id: p.id,
    nome: p.properties["Nome"]?.title?.[0]?.plain_text || "",
    email: p.properties["Email"]?.email || "",
    cargo: p.properties["Cargo"]?.rich_text?.[0]?.plain_text || "",
    empresa: p.properties["Empresa"]?.rich_text?.[0]?.plain_text || "",
    pais: p.properties["País"]?.select?.name || "",
    setor: p.properties["Setor"]?.select?.name || "",
    estagio: p.properties["Estágio"]?.select?.name || "",
    persona: p.properties["Persona"]?.select?.name || "",
    pipeline: p.properties["Pipeline"]?.select?.name || "Nuevo",
    fuente: p.properties["Fuente"]?.rich_text?.[0]?.plain_text || "",
    estrategia: p.properties["Estrategia"]?.select?.name || "",
    interes: p.properties["Interés"]?.number || 0,
    linkedin: p.properties["LinkedIn"]?.url || "",
    notas: p.properties["Notas"]?.rich_text?.[0]?.plain_text || "",
  };
}
