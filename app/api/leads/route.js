import { NextResponse } from "next/server";
import { getLeads, addLead, updateLeadPipeline, getStats, addBulkLeads, addBulkEmpresas, getEmpresas, addFonte } from "../../../lib/notion";

export async function GET(req) {
  try {
    var url = new URL(req.url);
    if (url.searchParams.get("stats") === "true") {
      var stats = await getStats();
      return NextResponse.json(stats);
    }
    if (url.searchParams.get("type") === "empresas") {
      var empresas = await getEmpresas();
      return NextResponse.json(empresas);
    }
    var filter = {};
    if (url.searchParams.get("pipeline")) filter.pipeline = url.searchParams.get("pipeline");
    if (url.searchParams.get("persona")) filter.persona = url.searchParams.get("persona");
    if (url.searchParams.get("estrategia")) filter.estrategia = url.searchParams.get("estrategia");
    var leads = await getLeads(Object.keys(filter).length > 0 ? filter : null);
    return NextResponse.json(leads);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    var body = await req.json();

    // Update pipeline
    if (body.action === "updatePipeline") {
      await updateLeadPipeline(body.id, body.pipeline);
      return NextResponse.json({ ok: true });
    }

    // Bulk import empresas
    if (body.action === "importEmpresas") {
      var results = await addBulkEmpresas(body.empresas);
      var savedCount = results.filter(function(r) { return r.ok; }).length;
      if (body.fonte) {
        await addFonte({
          nome: body.fonte.nome || "Import",
          tipo: body.fonte.tipo || "Lista",
          url: body.fonte.url || "",
          estrategia: body.fonte.estrategia || "",
          leadsCount: savedCount,
        });
      }
      return NextResponse.json({ ok: true, saved: savedCount, errors: results.filter(function(r) { return !r.ok; }).length });
    }

    // Bulk import leads
    if (body.action === "importLeads") {
      var leadResults = await addBulkLeads(body.leads);
      var leadsSaved = leadResults.filter(function(r) { return r.ok; }).length;
      return NextResponse.json({ ok: true, saved: leadsSaved });
    }

    // Single lead
    if (body.nome) {
      await addLead(body);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
