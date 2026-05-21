import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada");
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  try {
    const supabase = getAdminClient();
    const body = await req.json();
    const { table, select, filters, single, order, action, data, id } = body;

    if (!table) return NextResponse.json({ error: "table requerida" }, { status: 400 });

    // Write operations
    if (action === "insert") {
      const { data: inserted, error } = await supabase.from(table).insert(data).select().single();
      if (error) throw error;
      return NextResponse.json(inserted);
    }

    if (action === "update") {
      const { error } = await supabase.from(table).update(data).eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Read operations
    let query = supabase.from(table).select(select || "*");

    if (filters) {
      for (const f of filters) {
        if (f.method === "eq") query = query.eq(f.column, f.value);
        else if (f.method === "neq") query = query.neq(f.column, f.value);
        else if (f.method === "in") query = query.in(f.column, f.value);
        else if (f.method === "gte") query = query.gte(f.column, f.value);
        else if (f.method === "lte") query = query.lte(f.column, f.value);
        else if (f.method === "lt") query = query.lt(f.column, f.value);
        else if (f.method === "gt") query = query.gt(f.column, f.value);
        else if (f.method === "ilike") query = query.ilike(f.column, f.value);
      }
    }

    if (order) {
      for (const o of order) {
        query = query.order(o.column, { ascending: o.ascending ?? false });
      }
    }

    if (single) {
      const { data: singleData, error } = await query.maybeSingle();
      if (error) throw error;
      return NextResponse.json(singleData);
    }

    const { data: allData, error: queryError } = await query;
    if (queryError) throw queryError;
    return NextResponse.json(allData || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
