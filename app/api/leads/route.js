import { getLeads, addLead, addBulkLeads, updateLeadPipeline, getStats } from "../../../lib/notion";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("stats") === "true") {
      const stats = await getStats();
      return NextResponse.json(stats);
    }
    const filter = {};
    if (searchParams.get("pipeline")) filter.pipeline = searchParams.get("pipeline");
    if (searchParams.get("persona")) filter.persona = searchParams.get("persona");
    if (searchParams.get("estrategia")) filter.estrategia = searchParams.get("estrategia");
    if (searchParams.get("pais")) filter.pais = searchParams.get("pais");
    const leads = await getLeads(Object.keys(filter).length ? filter : null);
    return NextResponse.json(leads);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      const results = await addBulkLeads(body);
      return NextResponse.json({ ok: true, results });
    }
    if (body.action === "updatePipeline") {
      await updateLeadPipeline(body.id, body.pipeline);
      return NextResponse.json({ ok: true });
    }
    const res = await addLead(body);
    return NextResponse.json({ ok: true, id: res.id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
