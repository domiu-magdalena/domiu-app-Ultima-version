const SUPABASE_URL = "https://auyzmvyfscvfzrhhjejq.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eXptdnlmc2N2ZnpyaGhqZWpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTY0OCwiZXhwIjoyMDkzMDkxNjQ4fQ.cnNvu2ThxAhzmpE2yYo_J-VNNQ98QxPt4yTIGXm8GsA";
const OLMA_ID = "58ed85d5-94a7-4433-afab-3b9bf7de8d6f";

const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

const products = [
  ...[6,12,18,24,30,36].map(n => ({ negocio_id: OLMA_ID, nombre: `${n} und`, descripcion: `Pack de ${n} alitas`, precio: n<=6?24000:n<=12?46000:n<=18?68000:n<=24?90000:n<=30?112000:134000, categoria_producto: "Pack Alitas", disponible: true, imagen: "" })),
  ...["BBQ Picante","Gochujang","Corozo","Ajo","Tamarindo","Mango Picante","Maracuyá","Miel Mostaza","BBQ Ahumada"].map(s => ({ negocio_id: OLMA_ID, nombre: s, descripcion: `Salsa ${s}`, precio: 0, categoria_producto: "Salsa", disponible: true, imagen: "" })),
  ...["Coca Cola","Sprite","Colombiana","Agua","Hatsu"].map((s,i) => ({ negocio_id: OLMA_ID, nombre: s, descripcion: `Gaseosa ${s}`, precio: i===3?3000:i===4?7000:5000, categoria_producto: "Gaseosa", disponible: true, imagen: "" })),
  ...["Heineken","Corona","Poker","Costeña"].map(s => ({ negocio_id: OLMA_ID, nombre: s, descripcion: `Cerveza ${s}`, precio: 6000, categoria_producto: "Cerveza", disponible: true, imagen: "" })),
  { negocio_id: OLMA_ID, nombre: "Salsa extra", descripcion: "Salsa adicional", precio: 2300, categoria_producto: "Adición", disponible: true, imagen: "" },
  { negocio_id: OLMA_ID, nombre: "Alita extra", descripcion: "Alita de pollo extra", precio: 4500, categoria_producto: "Adición", disponible: true, imagen: "" },
  { negocio_id: OLMA_ID, nombre: "Porción extra de papas", descripcion: "Porción adicional de papas", precio: 4000, categoria_producto: "Adición", disponible: true, imagen: "" },
];

async function main() {
  // Check existing count
  const countRes = await fetch(`${SUPABASE_URL}/rest/v1/productos?negocio_id=eq.${OLMA_ID}&select=id&limit=1`, { headers });
  const existing = await countRes.json();
  if (existing.length > 0) {
    console.log(`Ya existen productos para Olma Wings (${existing.length}+ encontrados). Omitiendo seed.`);
    return;
  }

  // Bulk insert
  const res = await fetch(`${SUPABASE_URL}/rest/v1/productos`, {
    method: "POST", headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(products),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Error:", res.status, err);
    return;
  }

  const data = await res.json();
  console.log(`✅ ${data.length} productos insertados para Olma Wings`);
}
main().catch(e => console.error(e));
