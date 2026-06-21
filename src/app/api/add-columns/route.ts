import { NextResponse } from "next/server";
import pkg from "pg";
const { Client } = pkg;

export const dynamic = "force-dynamic";

export async function POST() {
  const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/(.+)\.supabase\.co/)?.[1];
  const pw = process.env.SUPABASE_DB_PASSWORD;

  if (!ref || !pw) {
    return NextResponse.json({ 
      error: "Configuracion faltante. Necesitas NEXT_PUBLIC_SUPABASE_URL y SUPABASE_DB_PASSWORD en .env.local" 
    }, { status: 500 });
  }

  const queries = [
    "ALTER TABLE repartidores ADD COLUMN IF NOT EXISTS codigo TEXT DEFAULT '';",
    "ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url TEXT DEFAULT '';",
    "ALTER TABLE repartidores ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;",
  ];

  const results: any[] = [];

  // Intentar conexion via pooler
  const configs = [
    { host: `${ref}.pooler.supabase.com`, port: 6543, user: `postgres.${ref}` },
    { host: `${ref}.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
    { host: "aws-0-us-east-1.pooler.supabase.com", port: 6543, user: `postgres.${ref}` },
    { host: "aws-0-us-east-1.pooler.supabase.com", port: 5432, user: `postgres.${ref}` },
  ];

  for (const cfg of configs) {
    try {
      const client = new Client({
        host: cfg.host,
        port: cfg.port,
        database: "postgres",
        user: cfg.user,
        password: pw,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
      });
      
      await client.connect();
      
      for (const query of queries) {
        try {
          await client.query(query);
          results.push({ query: query.substring(0, 60), success: true });
        } catch (e: any) {
          results.push({ query: query.substring(0, 60), success: false, error: e.message });
        }
      }
      
      await client.end();
      return NextResponse.json({ success: true, results });
    } catch (e: any) {
      results.push({ config: `${cfg.host}:${cfg.port}`, error: e.message });
    }
  }

  return NextResponse.json({ 
    success: false, 
    error: "No se pudo conectar a la base de datos",
    results,
    instructions: "Ejecuta manualmente fix_database.sql en Supabase SQL Editor"
  });
}
