// ============================================
// DOMIU MAGDALENA - GENERADOR DE DATOS DE PRUEBA
// ============================================
// Uso: node scripts/seed_data.js
// Requiere: SUPABASE_SERVICE_ROLE_KEY en .env.local

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Cargar .env.local
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) envVars[k] = v.join("=");
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltan variables de entorno en .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ======================== DATOS ========================

const nombresRepartidores = [
  "Carlos Jimenez", "Andres Ruiz", "Brayan Cortez", "Camilo Torres", "Daniel Moreno",
  "Esteban Gutierrez", "Felipe Rojas", "Gabriel Medina", "Hector Paez", "Ivan Castillo",
  "Javier Orozco", "Kevin Vargas", "Luis Navarro", "Miguel Angel Paz", "Nicolas Duarte",
  "Oscar Valencia", "Pablo Cardenas", "Ricardo Mora", "Santiago Pino", "Tomas Aguirre",
  "Valentino Suarez", "William Campos", "Xavier Rueda", "Yeferson Largo", "Zacarias Pinto",
  "Alejandro Marin", "Bryan Carvajal", "Cristian Moya", "Diego Pardo", "Eduardo Ferrer",
  "Francisco Leon", "Gustavo Peña", "Harold Gomez", "Ismael Cruz", "Jhonatan Mesa",
];

const telefonosRepartidores = [
  "3001110001","3001110002","3001110003","3001110004","3001110005",
  "3001110006","3001110007","3001110008","3001110009","3001110010",
  "3001110011","3001110012","3001110013","3001110014","3001110015",
  "3001110016","3001110017","3001110018","3001110019","3001110020",
  "3001110021","3001110022","3001110023","3001110024","3001110025",
  "3001110026","3001110027","3001110028","3001110029","3001110030",
];

const vehiculos = ["Moto", "Bicicleta", "Moto", "Moto", "Bicicleta", "Carro", "Moto", "Bicicleta", "Moto", "Moto"];

const nombresLocales = [
  "El Buen Sabor", "Pizzeria Roma", "Comida Rapida Express", "Restaurante Don Pepe",
  "El Rincon Criollo", "Burger House", "Sushi Master", "La Casa del Pollo",
  "Arepa Gourmet", "Marisqueria Del Mar", "Heladeria Fria", "Cafe Paris",
  "La Hamburgueseria", "Tacos El Pastor", "Parrilla Argentina", "Wok Oriental",
];

const clientes = [
  "Carlos Mendoza", "Ana Rodriguez", "Luis Garcia", "Maria Torres", "Pedro Sanchez",
  "Laura Martinez", "Diego Ramirez", "Camila Herrera", "Andres Lopez", "Sofia Castro",
  "Juan Morales", "Valentina Diaz", "Ricardo Vargas", "Isabella Rojas", "Felipe Cruz",
  "Daniela Ortiz", "Mateo Silva", "Gabriela Reyes", "Nicolas Flores", "Mariana Gutierrez",
  "Alejandro Pena", "Paula Jimenez", "Sebastian Medina", "Natalia Aguilar", "Emilio Vargas",
  "Carolina Salazar", "David Castillo", "Andrea Morales", "Javier Gomez", "Patricia Luna",
  "Oscar Navarro", "Manuela Restrepo", "Fernando Quintero", "Catalina Mendez", "Roberto Vega",
  "Juliana Franco", "Hugo Padilla", "Veronica Ceballos", "Alberto Rios", "Liliana Cordoba",
];

const direcciones = [
  "Calle 22 #5-34 Centro", "Cra 5 #12-89", "Av Universidad #20-15", "Calle 30 #10-45",
  "Cra 3 #8-67", "Calle 18 #4-23", "Av 19 #15-90", "Cra 7 #25-12", "Calle 15 #6-78",
  "Cra 4 #14-56", "Calle 25 #9-34", "Av Central #18-45", "Cra 8 #22-67", "Calle 20 #3-89",
  "Cra 6 #11-23", "Calle 28 #7-56", "Av Principal #12-34", "Cra 2 #16-78", "Calle 12 #5-90",
  "Cra 9 #20-45", "Calle 35 #8-12", "Av Norte #22-67", "Cra 1 #18-34", "Calle 10 #4-56",
  "Cra 10 #15-23", "Calle 40 #6-89", "Av Sur #14-45", "Cra 11 #19-67", "Calle 45 #3-12",
  "Cra 12 #7-34", "Calle 8 #2-56", "Av Primera #30-10", "Calle 50 #15-30", "Cra 15 #21-45",
  "Av Siempre Viva #42", "Calle 7 #3-89", "Cra 20 #5-67", "Av Las Palmas #10", "Calle 60 #4-32",
  "Cra 25 #9-15",
];

const barrios = ["Centro", "Boston", "San Isidro", "La Merced", "El Santuario", "San Fernando", "Modelo", "Prado", "Los Angeles", "Albergue"];
const notas = ["Llamar antes de llegar", "Dejar en la puerta", "Edificio azul, apto 302", "Porton negro", "Entregar en recepcion", "", "", "", "", ""];

// Estados para pedidos: distribucion realista
const ESTADOS_MIX = [
  // 105 pedidos: 5 pendientes, 8 aceptados, 8 recogidos, 8 en camino, 65 entregados, 6 cancelados, 5 problema
  ...Array(5).fill("Pendiente"),
  ...Array(8).fill("Aceptado"),
  ...Array(8).fill("Recogido"),
  ...Array(8).fill("En camino"),
  ...Array(65).fill("Entregado"),
  ...Array(6).fill("Cancelado"),
  ...Array(5).fill("Problema"),
];

const PRECIOS_BASE = [
  15000, 18000, 22000, 25000, 28000, 30000, 32000, 35000, 38000, 40000,
  42000, 45000, 48000, 50000, 52000, 55000, 58000, 60000, 65000, 70000,
  25000, 30000, 18000, 40000, 22000, 35000, 50000, 28000, 45000, 60000,
  15000, 32000, 38000, 55000, 20000, 42000, 48000, 30000, 25000, 58000,
];

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fmt(n) { return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n); }

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ======================== MAIN ========================

async function main() {
  console.log("============================================");
  console.log("  DOMIU MAGDALENA - GENERADOR DE DATOS");
  console.log("============================================\n");

  // 1. Buscar admin user
  console.log("📡 Buscando usuario administrador...");
  const { data: admins } = await supabase.from("profiles").select("id").eq("rol", "admin").limit(1);
  let adminId = admins?.[0]?.id;
  if (!adminId) {
    console.log("❌ No hay usuario admin. Crea uno primero en /login");
    process.exit(1);
  }
  console.log(`✅ Admin ID: ${adminId}\n`);

  // 2. Crear locales de prueba
  console.log("🏪 Creando locales de prueba...");
  const localesExistentes = await supabase.from("locales").select("id, nombre");
  const locNombresExistentes = new Set(localesExistentes.data?.map(l => l.nombre) || []);
  const localesIds = (localesExistentes.data?.map(l => l.id) || []);
  
  for (const nombre of nombresLocales) {
    if (locNombresExistentes.has(nombre)) continue;
    const { data, error } = await supabase.from("locales").insert({
      user_id: adminId, nombre, direccion: pick(direcciones), telefono: pick(telefonosRepartidores), activo: true,
    }).select().single();
    if (data) { localesIds.push(data.id); console.log(`  ✅ ${nombre}`); }
    else console.log(`  ❌ ${nombre}: ${error?.message}`);
    await delay(50);
  }
  console.log(`  Total locales: ${localesIds.length}\n`);

  // 3. Crear ~30 repartidores
  console.log("🛵 Creando repartidores de prueba...");
  const repsExistentes = await supabase.from("repartidores").select("id, nombre");
  const repsNombresExistentes = new Set(repsExistentes.data?.map(r => r.nombre) || []);
  const repsIds = (repsExistentes.data?.map(r => r.id) || []);
  let repIndex = 0;

  for (let i = 0; i < 30; i++) {
    const nombre = nombresRepartidores[i % nombresRepartidores.length];
    if (repsNombresExistentes.has(nombre) && repsExistentes.data?.some(r => r.nombre === nombre)) {
      continue; // Ya existe
    }
    const telefono = telefonosRepartidores[i % telefonosRepartidores.length];
    const vehiculo = vehiculos[i % vehiculos.length];
    const estadosRider = ["Disponible", "Disponible", "Disponible", "Ocupado", "No disponible"];
    const estado = pick(estadosRider);
    const placa = vehiculo === "Moto" ? `ABC-${String(i + 1).padStart(3, "0")}` : null;

    const { data, error } = await supabase.from("repartidores").insert({
      user_id: adminId, nombre, telefono, vehiculo, placa,
      documento: `${10000000 + i}`, estado, activo: true,
    }).select().single();

    if (data) { repsIds.push(data.id); repIndex++; console.log(`  ✅ ${nombre}`); }
    else console.log(`  ❌ ${nombre}: ${error?.message}`);
    await delay(50);
  }
  console.log(`  Total repartidores: ${repsIds.length}\n`);

  // 4. Asegurar que hay al menos un turno activo
  console.log("🕐 Verificando turno activo...");
  const { data: turnosActivos } = await supabase.from("turnos").select("id").eq("activo", true).limit(1);
  let turnoId = turnosActivos?.[0]?.id;
  if (!turnoId) {
    const { data: newTurno } = await supabase.from("turnos").insert({
      user_id: adminId, activo: true, notas: "Turno prueba masiva",
    }).select().single();
    if (newTurno) turnoId = newTurno.id;
    console.log("  ✅ Turno creado");
  } else {
    console.log("  ✅ Turno existente");
  }

  // 5. Limpiar pedidos antiguos para evitar duplicados de codigo
  console.log("\n🧹 Limpiando pedidos anteriores...");
  const { error: delError } = await supabase.from("pedidos_estado_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delError) console.log("  ⚠️ No se pudo limpiar historial:", delError.message);
  
  const { error: delPedError } = await supabase.from("pedidos").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delPedError) console.log("  ⚠️ No se pudieron borrar pedidos:", delPedError.message);
  console.log("  ✅ Pedidos anteriores eliminados\n");

  // 6. Crear 105 pedidos
  console.log("📦 Creando 105 pedidos...");
  let created = 0;
  let totalPrecio = 0;
  let totalEmpresaRecibe = 0;
  let totalRepartidorGana = 0;

  for (let i = 0; i < 105; i++) {
    const cliente = clientes[i % clientes.length];
    const direccion = direcciones[i % direcciones.length];
    const telefono = telefonosRepartidores[i % telefonosRepartidores.length];
    const barrio = pick(barrios);
    const nota = pick(notas);
    const localId = pick(localesIds);
    const estado = ESTADOS_MIX[i];

    // Asignar repartidor segun estado
    let repId = null;
    if (!["Pendiente", "Cancelado"].includes(estado)) {
      repId = repsIds[i % repsIds.length];
    }

    // Precio variable para alcanzar la meta de ganancia
    const precio = PRECIOS_BASE[i % PRECIOS_BASE.length];

    // Calcular comisiones
    let pagoRepartidor, empresaRecibe;
    if (precio > 8000) {
      pagoRepartidor = Math.round(precio * 0.6);
      empresaRecibe = precio - pagoRepartidor;
    } else {
      pagoRepartidor = Math.round(precio * 0.75);
      empresaRecibe = precio - pagoRepartidor;
    }

    const km = randInt(1, 10);
    const codigo = `DOM-${String(i + 1).padStart(4, "0")}`;

    const pedido = {
      codigo, cliente, telefono, direccion, barrio, notas: nota,
      local_id: localId, repartidor_id: repId, km,
      envio: Math.round(precio * 0.15),
      precio, pago_repartidor: pagoRepartidor, empresa_recibe: empresaRecibe,
      metodo_pago: pick(["Efectivo", "Efectivo", "Efectivo", "Transferencia"]),
      estado,
      liquidado: estado === "Entregado",
      user_id: adminId, turno_id: turnoId,
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const { error } = await supabase.from("pedidos").insert(pedido);
    if (error) {
      console.log(`  ❌ ${codigo}: ${error.message}`);
    } else {
      created++;
      totalPrecio += precio;
      totalEmpresaRecibe += empresaRecibe;
      totalRepartidorGana += pagoRepartidor;
    }
    await delay(20);
  }

  // 7. Mostrar resultados financieros
  console.log("\n============================================");
  console.log("  RESULTADOS");
  console.log("============================================\n");
  console.log(`📊 Pedidos creados: ${created} de 105`);
  console.log(`💰 Recaudo total (suma de precios): ${fmt(totalPrecio)}`);
  console.log(`🏢 Ganancia empresa (empresa_recibe): ${fmt(totalEmpresaRecibe)}`);
  console.log(`🛵 Ganancia repartidores (pago_repartidor): ${fmt(totalRepartidorGana)}`);
  console.log(`👥 Repartidores disponibles: ${repsIds.length}`);
  console.log(`🏪 Locales disponibles: ${localesIds.length}\n`);

  const estadosCount = {};
  ESTADOS_MIX.forEach(e => { estadosCount[e] = (estadosCount[e] || 0) + 1; });
  console.log("📋 Distribucion de estados:");
  Object.entries(estadosCount).forEach(([estado, count]) => {
    const pct = ((count / 105) * 100).toFixed(1);
    const bar = "█".repeat(Math.round(count / 5));
    console.log(`  ${estado.padEnd(15)} ${String(count).padStart(3)} (${pct}%) ${bar}`);
  });

  console.log("\n✅ ¡Datos de prueba generados exitosamente!");
  console.log("👉 Ve al panel de administracion para ver los resultados.\n");
}

main().catch(console.error);
