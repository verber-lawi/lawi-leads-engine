import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

var notion = new Client({ auth: process.env.NOTION_TOKEN });
var PAGE_ID = process.env.NOTION_PAGE_ID;

export async function POST() {
  try {
    // Check existing databases
    var children = await notion.blocks.children.list({ block_id: PAGE_ID, page_size: 100 });
    var existing = {};
    for (var i = 0; i < children.results.length; i++) {
      var block = children.results[i];
      if (block.type === "child_database") {
        var t = (block.child_database && block.child_database.title) || "";
        if (t.indexOf("Leads") >= 0) existing.leads = block.id;
        if (t.indexOf("Empresas") >= 0) existing.empresas = block.id;
        if (t.indexOf("Fontes") >= 0) existing.fontes = block.id;
      }
    }

    var created = [];

    // Create Leads DB
    if (!existing.leads) {
      await notion.databases.create({
        parent: { type: "page_id", page_id: PAGE_ID },
        title: [{ type: "text", text: { content: "Leads" } }],
        properties: {
          "Nome":       { title: {} },
          "Email":      { email: {} },
          "Cargo":      { rich_text: {} },
          "Empresa":    { rich_text: {} },
          "LinkedIn":   { url: {} },
          "Pipeline":   { select: { options: [
            { name: "Nuevo", color: "gray" },
            { name: "Investigado", color: "yellow" },
            { name: "Contactado", color: "orange" },
            { name: "Respondio", color: "blue" },
            { name: "Reunion", color: "purple" },
            { name: "Propuesta", color: "pink" },
            { name: "Convertido", color: "green" },
            { name: "Perdido", color: "red" },
          ]}},
          "Persona":    { select: { options: [
            { name: "Expansor Multi-Region", color: "blue" },
            { name: "Hueco Operativo", color: "orange" },
            { name: "Post-Ronda", color: "green" },
            { name: "Derivado VC/Aceleradora", color: "purple" },
            { name: "Heavy-Contracts B2B", color: "red" },
          ]}},
          "Estrategia": { select: { options: [
            { name: "A - Benchmark", color: "gray" },
            { name: "B - Job Board", color: "yellow" },
            { name: "C - Eventos", color: "blue" },
            { name: "D - Coworkings", color: "green" },
            { name: "E - VCs/Angels", color: "purple" },
            { name: "F - Newsletters", color: "orange" },
          ]}},
          "País":       { select: { options: [
            { name: "Espana", color: "red" },
            { name: "Brasil", color: "green" },
            { name: "Argentina", color: "blue" },
            { name: "USA", color: "gray" },
            { name: "UK", color: "purple" },
            { name: "Mexico", color: "orange" },
            { name: "Colombia", color: "yellow" },
            { name: "Chile", color: "pink" },
            { name: "Otro", color: "default" },
          ]}},
          "Setor":      { select: { options: [
            { name: "Fintech", color: "blue" },
            { name: "SaaS B2B", color: "purple" },
            { name: "Healthtech", color: "green" },
            { name: "Web3/Crypto", color: "orange" },
            { name: "Edtech", color: "yellow" },
            { name: "Legaltech", color: "red" },
            { name: "Ecommerce", color: "pink" },
            { name: "VC/Angel", color: "gray" },
            { name: "Aceleradora", color: "default" },
            { name: "Otro", color: "default" },
          ]}},
          "Estágio":    { select: { options: [
            { name: "Pre-Seed", color: "gray" },
            { name: "Seed", color: "yellow" },
            { name: "Series A", color: "blue" },
            { name: "Series B+", color: "purple" },
            { name: "Growth", color: "green" },
          ]}},
          "Fuente":     { rich_text: {} },
          "Notas":      { rich_text: {} },
          "Interés":    { number: {} },
        }
      });
      created.push("Leads");
    }

    // Create Empresas DB
    if (!existing.empresas) {
      await notion.databases.create({
        parent: { type: "page_id", page_id: PAGE_ID },
        title: [{ type: "text", text: { content: "Empresas" } }],
        properties: {
          "Nome":          { title: {} },
          "Website":       { url: {} },
          "Dominio":       { rich_text: {} },
          "Setor":         { select: { options: [
            { name: "Fintech", color: "blue" },
            { name: "SaaS B2B", color: "purple" },
            { name: "Healthtech", color: "green" },
            { name: "Web3/Crypto", color: "orange" },
            { name: "Edtech", color: "yellow" },
            { name: "Legaltech", color: "red" },
            { name: "Ecommerce", color: "pink" },
            { name: "VC/Angel", color: "gray" },
            { name: "Aceleradora", color: "default" },
            { name: "Otro", color: "default" },
          ]}},
          "Industria":     { rich_text: {} },
          "Tamanho":       { number: {} },
          "Tamanho Label": { rich_text: {} },
          "Pais":          { rich_text: {} },
          "Cidade":        { rich_text: {} },
          "Descricao":     { rich_text: {} },
          "LinkedIn":      { url: {} },
          "Funding":       { rich_text: {} },
          "Funding Stage": { rich_text: {} },
          "Keywords":      { rich_text: {} },
          "Fuente":        { rich_text: {} },
          "Estrategia":    { select: { options: [
            { name: "A - Benchmark", color: "gray" },
            { name: "B - Job Board", color: "yellow" },
            { name: "C - Eventos", color: "blue" },
            { name: "D - Coworkings", color: "green" },
            { name: "E - VCs/Angels", color: "purple" },
            { name: "F - Newsletters", color: "orange" },
          ]}},
          "Pipeline":      { select: { options: [
            { name: "Nuevo", color: "gray" },
            { name: "Investigado", color: "yellow" },
            { name: "Contactado", color: "orange" },
            { name: "Convertido", color: "green" },
            { name: "Perdido", color: "red" },
          ]}},
          "Notas":         { rich_text: {} },
        }
      });
      created.push("Empresas");
    }

    // Create Fontes DB
    if (!existing.fontes) {
      await notion.databases.create({
        parent: { type: "page_id", page_id: PAGE_ID },
        title: [{ type: "text", text: { content: "Fontes" } }],
        properties: {
          "Nome":             { title: {} },
          "URL":              { url: {} },
          "Tipo":             { select: { options: [
            { name: "Evento", color: "blue" },
            { name: "Lista", color: "gray" },
            { name: "Noticia", color: "orange" },
            { name: "Aceleradora", color: "green" },
            { name: "VC Portfolio", color: "purple" },
            { name: "Job Board", color: "yellow" },
            { name: "Benchmark", color: "red" },
          ]}},
          "Estrategia":       { select: { options: [
            { name: "A - Benchmark", color: "gray" },
            { name: "B - Job Board", color: "yellow" },
            { name: "C - Eventos", color: "blue" },
            { name: "D - Coworkings", color: "green" },
            { name: "E - VCs/Angels", color: "purple" },
            { name: "F - Newsletters", color: "orange" },
          ]}},
          "Leads Importados": { number: {} },
          "Status":           { select: { options: [
            { name: "Processado", color: "green" },
            { name: "Pendente", color: "yellow" },
            { name: "Erro", color: "red" },
          ]}},
        }
      });
      created.push("Fontes");
    }

    // Reset cached dbIds
    return NextResponse.json({
      ok: true,
      created: created,
      alreadyExisted: Object.keys(existing),
      message: created.length > 0
        ? "Criadas: " + created.join(", ")
        : "Todas as databases já existiam"
    });

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    var children = await notion.blocks.children.list({ block_id: PAGE_ID, page_size: 100 });
    var found = {};
    for (var i = 0; i < children.results.length; i++) {
      var block = children.results[i];
      if (block.type === "child_database") {
        var t = (block.child_database && block.child_database.title) || "";
        if (t.indexOf("Leads") >= 0) found.leads = true;
        if (t.indexOf("Empresas") >= 0) found.empresas = true;
        if (t.indexOf("Fontes") >= 0) found.fontes = true;
      }
    }
    return NextResponse.json({ ok: true, databases: found });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
