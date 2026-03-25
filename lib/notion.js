import { Client } from "@notionhq/client";

var notion = new Client({ auth: process.env.NOTION_TOKEN });
var PAGE_ID = process.env.NOTION_PAGE_ID;

var dbIds = null;

export async function ensureDatabases() {
  if (dbIds) return dbIds;
  var children = await notion.blocks.children.list({ block_id: PAGE_ID, page_size: 100 });
  var found = {};
  for (var i = 0; i < children.results.length; i++) {
    var block = children.results[i];
    if (block.type === "child_database") {
      var title = (block.child_database && block.child_database.title) || "";
      if (title.indexOf("Leads") >= 0 && !found.leads) found.leads = block.id;
      if (title.indexOf("Empresas") >= 0 && !found.empresas) found.empresas = block.id;
      if (title.indexOf("Fontes") >= 0 && !found.fontes) found.fontes = block.id;
      if ((title.indexOf("Intera") >= 0) && !found.interacoes) found.interacoes = block.id;
      if (title.indexOf("Templates") >= 0 && !found.templates) found.templates = block.id;
    }
  }
  dbIds = found;
  return dbIds;
}

// ============ LEADS ============

export async function addLead(data) {
  var dbs = await ensureDatabases();
  if (!dbs.leads) throw new Error("Database Leads no encontrada");
  var props = {
    "Nome": { title: [{ text: { content: data.nome || "" } }] },
    "Cargo": { rich_text: [{ text: { content: data.cargo || "" } }] },
    "Empresa": { rich_text: [{ text: { content: data.empresa || "" } }] },
    "Pipeline": { select: { name: "Nuevo" } },
    "Fuente": { rich_text: [{ text: { content: data.fuente || "" } }] },
  };
  if (data.email) props["Email"] = { email: data.email };
  if (data.pais) props["Pa\u00eds"] = { select: { name: data.pais } };
  if (data.setor) props["Setor"] = { select: { name: data.setor } };
  if (data.estagio) props["Est\u00e1gio"] = { select: { name: data.estagio } };
  if (data.persona) props["Persona"] = { select: { name: data.persona } };
  if (data.estrategia) props["Estrategia"] = { select: { name: data.estrategia } };
  if (data.linkedin) props["LinkedIn"] = { url: data.linkedin };
  if (data.notas) props["Notas"] = { rich_text: [{ text: { content: data.notas } }] };
  if (data.interes) props["Inter\u00e9s"] = { number: data.interes };
  return notion.pages.create({ parent: { database_id: dbs.leads }, properties: props });
}

export async function addBulkLeads(leads) {
  var results = [];
  for (var i = 0; i < leads.length; i++) {
    try {
      var res = await addLead(leads[i]);
      results.push({ ok: true, id: res.id, nome: leads[i].nome });
    } catch (e) {
      results.push({ ok: false, nome: leads[i].nome, error: e.message });
    }
  }
  return results;
}

export async function getLeads(filter) {
  var dbs = await ensureDatabases();
  if (!dbs.leads) return [];
  var params = { database_id: dbs.leads, page_size: 100 };

  if (filter) {
    var conditions = [];
    if (filter.pipeline) conditions.push({ property: "Pipeline", select: { equals: filter.pipeline } });
    if (filter.persona) conditions.push({ property: "Persona", select: { equals: filter.persona } });
    if (filter.estrategia) conditions.push({ property: "Estrategia", select: { equals: filter.estrategia } });
    if (conditions.length === 1) params.filter = conditions[0];
    if (conditions.length > 1) params.filter = { and: conditions };
  }
  params.sorts = [{ property: "Nome", direction: "ascending" }];
  var res = await notion.databases.query(params);
  return res.results.map(parseLeadPage);
}

export async function updateLeadPipeline(pageId, pipeline) {
  return notion.pages.update({ page_id: pageId, properties: { "Pipeline": { select: { name: pipeline } } } });
}

// ============ EMPRESAS ============

export async function addEmpresa(data) {
  var dbs = await ensureDatabases();
  if (!dbs.empresas) throw new Error("Database Empresas no encontrada");
  var props = {
    "Nome": { title: [{ text: { content: data.nome || "" } }] },
  };
  if (data.website) props["Website"] = { url: data.website };
  if (data.dominio) props["Dominio"] = { rich_text: [{ text: { content: data.dominio } }] };
  if (data.setor) props["Setor"] = { select: { name: data.setor } };
  if (data.industria) props["Industria"] = { rich_text: [{ text: { content: data.industria } }] };
  if (data.tamanho) props["Tamanho"] = { number: data.tamanho };
  if (data.tamanoLabel) props["Tamanho Label"] = { rich_text: [{ text: { content: data.tamanoLabel } }] };
  if (data.pais) props["Pais"] = { rich_text: [{ text: { content: data.pais } }] };
  if (data.cidade) props["Cidade"] = { rich_text: [{ text: { content: data.cidade } }] };
  if (data.descricao) props["Descricao"] = { rich_text: [{ text: { content: data.descricao.substring(0, 2000) } }] };
  if (data.linkedin) props["LinkedIn"] = { url: data.linkedin };
  if (data.funding) props["Funding"] = { rich_text: [{ text: { content: data.funding } }] };
  if (data.fundingStage) props["Funding Stage"] = { rich_text: [{ text: { content: data.fundingStage } }] };
  if (data.keywords) props["Keywords"] = { rich_text: [{ text: { content: data.keywords } }] };
  if (data.fuente) props["Fuente"] = { rich_text: [{ text: { content: data.fuente } }] };
  if (data.estrategia) props["Estrategia"] = { select: { name: data.estrategia } };
  if (data.notas) props["Notas"] = { rich_text: [{ text: { content: data.notas } }] };
  if (data.pipeline) props["Pipeline"] = { select: { name: data.pipeline } };
  return notion.pages.create({ parent: { database_id: dbs.empresas }, properties: props });
}

export async function addBulkEmpresas(empresas) {
  var results = [];
  for (var i = 0; i < empresas.length; i++) {
    try {
      var res = await addEmpresa(empresas[i]);
      results.push({ ok: true, id: res.id, nome: empresas[i].nome });
    } catch (e) {
      results.push({ ok: false, nome: empresas[i].nome, error: e.message });
    }
  }
  return results;
}

export async function getEmpresas() {
  var dbs = await ensureDatabases();
  if (!dbs.empresas) return [];
  var res = await notion.databases.query({
    database_id: dbs.empresas,
    page_size: 100,
    sorts: [{ property: "Nome", direction: "ascending" }]
  });
  return res.results.map(parseEmpresaPage);
}

export async function updateEmpresa(pageId, data) {
  var props = {};
  if (data.setor) props["Setor"] = { select: { name: data.setor } };
  if (data.industria) props["Industria"] = { rich_text: [{ text: { content: data.industria } }] };
  if (data.tamanho) props["Tamanho"] = { number: data.tamanho };
  if (data.tamanoLabel) props["Tamanho Label"] = { rich_text: [{ text: { content: data.tamanoLabel } }] };
  if (data.pais) props["Pais"] = { rich_text: [{ text: { content: data.pais } }] };
  if (data.cidade) props["Cidade"] = { rich_text: [{ text: { content: data.cidade } }] };
  if (data.descricao) props["Descricao"] = { rich_text: [{ text: { content: data.descricao.substring(0, 2000) } }] };
  if (data.linkedin) props["LinkedIn"] = { url: data.linkedin };
  if (data.funding) props["Funding"] = { rich_text: [{ text: { content: data.funding } }] };
  if (data.fundingStage) props["Funding Stage"] = { rich_text: [{ text: { content: data.fundingStage } }] };
  if (data.keywords) props["Keywords"] = { rich_text: [{ text: { content: data.keywords } }] };
  if (data.pipeline) props["Pipeline"] = { select: { name: data.pipeline } };
  return notion.pages.update({ page_id: pageId, properties: props });
}

// ============ FONTES ============

export async function addFonte(data) {
  var dbs = await ensureDatabases();
  if (!dbs.fontes) return null;
  var props = {
    "Nome": { title: [{ text: { content: data.nome } }] },
    "Tipo": { select: { name: data.tipo } },
    "Leads Importados": { number: data.leadsCount || 0 },
    "Status": { select: { name: "Processado" } },
  };
  if (data.url) props["URL"] = { url: data.url };
  if (data.estrategia) props["Estrategia"] = { select: { name: data.estrategia } };
  return notion.pages.create({ parent: { database_id: dbs.fontes }, properties: props });
}

// ============ STATS ============

export async function getStats() {
  var dbs = await ensureDatabases();
  var stats = { total: 0, byPipeline: {}, byPersona: {}, byEstrategia: {}, byPais: {}, empresas: 0 };

  if (dbs.leads) {
    var all = [];
    var cursor = undefined;
    do {
      var res = await notion.databases.query({ database_id: dbs.leads, page_size: 100, start_cursor: cursor });
      for (var i = 0; i < res.results.length; i++) { all.push(parseLeadPage(res.results[i])); }
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);

    stats.total = all.length;
    for (var j = 0; j < all.length; j++) {
      var l = all[j];
      stats.byPipeline[l.pipeline] = (stats.byPipeline[l.pipeline] || 0) + 1;
      if (l.persona) stats.byPersona[l.persona] = (stats.byPersona[l.persona] || 0) + 1;
      if (l.estrategia) stats.byEstrategia[l.estrategia] = (stats.byEstrategia[l.estrategia] || 0) + 1;
      if (l.pais) stats.byPais[l.pais] = (stats.byPais[l.pais] || 0) + 1;
    }
  }

  if (dbs.empresas) {
    var empRes = await notion.databases.query({ database_id: dbs.empresas, page_size: 100 });
    stats.empresas = empRes.results.length;
  }

  return stats;
}

// ============ PARSERS ============

function parseLeadPage(p) {
  var pr = p.properties || {};
  return {
    id: p.id,
    nome: getText(pr["Nome"], "title"),
    email: (pr["Email"] && pr["Email"].email) || "",
    cargo: getText(pr["Cargo"]),
    empresa: getText(pr["Empresa"]),
    pais: getSelect(pr["Pa\u00eds"]),
    setor: getSelect(pr["Setor"]),
    estagio: getSelect(pr["Est\u00e1gio"]),
    persona: getSelect(pr["Persona"]),
    pipeline: getSelect(pr["Pipeline"]) || "Nuevo",
    fuente: getText(pr["Fuente"]),
    estrategia: getSelect(pr["Estrategia"]),
    interes: (pr["Inter\u00e9s"] && pr["Inter\u00e9s"].number) || 0,
    linkedin: (pr["LinkedIn"] && pr["LinkedIn"].url) || "",
    notas: getText(pr["Notas"]),
  };
}

function parseEmpresaPage(p) {
  var pr = p.properties || {};
  return {
    id: p.id,
    nome: getText(pr["Nome"], "title"),
    website: (pr["Website"] && pr["Website"].url) || "",
    dominio: getText(pr["Dominio"]),
    setor: getSelect(pr["Setor"]),
    industria: getText(pr["Industria"]),
    tamanho: (pr["Tamanho"] && pr["Tamanho"].number) || 0,
    tamanoLabel: getText(pr["Tamanho Label"]),
    pais: getText(pr["Pais"]),
    cidade: getText(pr["Cidade"]),
    descricao: getText(pr["Descricao"]),
    linkedin: (pr["LinkedIn"] && pr["LinkedIn"].url) || "",
    funding: getText(pr["Funding"]),
    fundingStage: getText(pr["Funding Stage"]),
    keywords: getText(pr["Keywords"]),
    fuente: getText(pr["Fuente"]),
    estrategia: getSelect(pr["Estrategia"]),
    notas: getText(pr["Notas"]),
    pipeline: getSelect(pr["Pipeline"]) || "Nuevo",
  };
}

function getText(prop, type) {
  if (!prop) return "";
  var arr = type === "title" ? prop.title : prop.rich_text;
  if (!arr || !arr[0]) return "";
  return arr[0].plain_text || "";
}

function getSelect(prop) {
  if (!prop || !prop.select) return "";
  return prop.select.name || "";
}
