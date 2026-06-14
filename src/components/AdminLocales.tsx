"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Store, Package, Plus, Edit2, Trash2, X, Star, DollarSign,
  Search, AlertCircle, CheckCircle, MapPin, Phone, Clock,
  ChevronDown, ChevronUp, Image
} from "lucide-react";

const CATEGORIAS = ['Restaurantes','Tiendas','Licoreras','Droguerias','Promociones'];
const CATEGORIAS_PRODUCTO = ['General','Pizzas','Bebidas','Abarrotes','Lacteos','Panaderia','Limpieza','Cervezas','Vinos','Licores','Cocteles','Medicamentos','Cuidado Personal','Rolls','Nigiri','Postres','Otros'];

const inpC = "w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 text-sm";
const lblC = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide";
const btnYellow = "px-6 py-3 bg-yellow-400 text-slate-900 font-bold rounded-xl hover:bg-yellow-300 transition disabled:opacity-50";
const btnGhost = "px-4 py-2 rounded-lg bg-slate-800 text-slate-400 text-xs font-semibold hover:bg-slate-700 transition";

export default function AdminLocales({ onLocsChange }: { onLocsChange?: (locs: any[]) => void }) {
  const [locales, setLocales] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [editLoc, setEditLoc] = useState<any | null>(null);
  const [showLocForm, setShowLocForm] = useState(false);
  const [locExpanded, setLocExpanded] = useState<string | null>(null);
  const [editProd, setEditProd] = useState<any | null>(null);
  const [showProdForm, setShowProdForm] = useState(false);
  const [toast, setToast] = useState("");
  const [toastError, setToastError] = useState("");

  // Local form fields
  const [fNom, setFNom] = useState(""); const [fCat, setFCat] = useState("Restaurantes");
  const [fDesc, setFDesc] = useState(""); const [fLogo, setFLogo] = useState("");
  const [fBanner, setFBanner] = useState(""); const [fDir, setFDir] = useState("");
  const [fTel, setFTel] = useState(""); const [fHor, setFHor] = useState("Lun-Dom 8:00-22:00");
  const [fRating, setFRating] = useState("4.5"); const [fDom, setFDom] = useState("3000");
  const [fAbierto, setFAbierto] = useState(true); const [fDest, setFDest] = useState(false);

  // Product form fields
  const [fpNom, setFpNom] = useState(""); const [fpDesc, setFpDesc] = useState("");
  const [fpPrecio, setFpPrecio] = useState(""); const [fpImg, setFpImg] = useState("");
  const [fpCat, setFpCat] = useState("General");

  const ok = (m: string) => { setToast(m); setToastError(""); setTimeout(() => setToast(""), 3000); };
  const fail = (m: string) => { setToastError(m); setToast(""); setTimeout(() => setToastError(""), 5000); };

  const load = useCallback(async () => {
    try {
      const [locRes, prodRes, negRes] = await Promise.all([
        fetch("/api/admin/locales"),
        fetch("/api/admin/productos"),
        fetch("/api/admin/negocios"),
      ]);
      const locsData = await locRes.json();
      const prodsData = await prodRes.json();
      const negsData = await negRes.json();
      setLocales(Array.isArray(locsData) ? locsData : locsData?.data ? [locsData.data] : []);
      setProductos(Array.isArray(prodsData) ? prodsData : []);
      if (Array.isArray(negsData)) {
        const map: Record<string, string> = {};
        negsData.forEach((n: any) => { map[n.nombre] = n.id; });
        setNegocioMap(map);
      }
      if (onLocsChange) onLocsChange(Array.isArray(locsData) ? locsData : []);
    } catch (e: any) {
      fail(e.message);
    }
    setLoading(false);
  }, [onLocsChange]);

  useEffect(() => { load(); }, [load]);

  // --- Local CRUD ---
  const resetLocForm = () => {
    setEditLoc(null); setFNom(""); setFCat("Restaurantes"); setFDesc(""); setFLogo("");
    setFBanner(""); setFDir(""); setFTel(""); setFHor("Lun-Dom 8:00-22:00");
    setFRating("4.5"); setFDom("3000"); setFAbierto(true); setFDest(false);
    setShowLocForm(false);
  };

  const openEditLoc = (l: any) => {
    setEditLoc(l); setFNom(l.nombre); setFCat(l.categoria || "Restaurantes");
    setFDesc(l.descripcion || ""); setFLogo(l.logo || ""); setFBanner(l.banner || "");
    setFDir(l.direccion || ""); setFTel(l.telefono || ""); setFHor(l.horario || "Lun-Dom 8:00-22:00");
    setFRating(String(l.rating || 4.5)); setFDom(String(l.domicilio_cost || 3000));
    setFAbierto(l.abierto !== false); setFDest(l.destacado || false);
    setShowLocForm(true);
  };

  const saveLocal = async (e: any) => {
    e.preventDefault();
    if (!fNom.trim()) { fail("El nombre es obligatorio"); return; }
    try {
      const data = {
        nombre: fNom.trim(), categoria: fCat, descripcion: fDesc.trim(),
        logo: fLogo.trim(), banner: fBanner.trim(), direccion: fDir.trim(),
        telefono: fTel.trim(), horario: fHor.trim(), rating: Number(fRating),
        domicilio_cost: Number(fDom), abierto: fAbierto, destacado: fDest,
      };
      const payload = editLoc
        ? { ...data, id: editLoc.id, old_nombre: editLoc.nombre }
        : data;

      const res = await fetch("/api/admin/locales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error guardando local");
      ok(editLoc ? "Local actualizado" : "Local creado");
      resetLocForm();
      load();
    } catch (e: any) {
      fail(e.message);
    }
  };

  const deleteLocal = async (id: string, nombre: string) => {
    if (!confirm(`Eliminar ${nombre} y todos sus productos?`)) return;
    try {
      const res = await fetch("/api/admin/locales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, nombre, action: "delete" }),
      });
      if (!res.ok) throw new Error("Error eliminando");
      ok("Local eliminado");
      load();
    } catch (e: any) {
      fail(e.message);
    }
  };

  const toggleLocal = async (id: string, activo: boolean, nombre: string) => {
    try {
      const res = await fetch("/api/admin/locales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, activo, action: "toggle", nombre }),
      });
      if (!res.ok) throw new Error("Error cambiando estado");
      load();
    } catch (e: any) {
      fail(e.message);
    }
  };

  // --- Product CRUD ---
  const resetProdForm = () => {
    setEditProd(null); setFpNom(""); setFpDesc(""); setFpPrecio(""); setFpImg(""); setFpCat("General");
    setShowProdForm(false);
  };

  const openEditProd = (p: any) => {
    setEditProd(p); setFpNom(p.nombre); setFpDesc(p.descripcion || "");
    setFpPrecio(String(p.precio)); setFpImg(p.imagen || ""); setFpCat(p.categoria_producto || "General");
    setShowProdForm(true);
  };

  const saveProducto = async (e: any, negocioId: string) => {
    e.preventDefault();
    if (!fpNom.trim() || !fpPrecio) { fail("Nombre y precio obligatorios"); return; }
    try {
      const data = {
        negocio_id: negocioId, nombre: fpNom.trim(), descripcion: fpDesc.trim(),
        precio: Number(fpPrecio), imagen: fpImg.trim(), categoria_producto: fpCat,
      };
      const res = await fetch("/api/admin/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editProd ? { ...data, id: editProd.id } : data),
      });
      if (!res.ok) throw new Error("Error guardando producto");
      ok(editProd ? "Producto actualizado" : "Producto creado");
      resetProdForm();
      // Wait a tiny bit so the product list refreshes with the new data
      setTimeout(() => load(), 100);
    } catch (e: any) {
      fail(e.message);
    }
  };

  const deleteProducto = async (id: string) => {
    if (!confirm("Eliminar producto?")) return;
    try {
      await fetch("/api/admin/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "delete" }),
      });
      ok("Producto eliminado");
      load();
    } catch (e: any) {
      fail(e.message);
    }
  };

  const toggleProducto = async (id: string, disponible: boolean) => {
    try {
      await fetch("/api/admin/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "toggle", disponible }),
      });
      load();
    } catch (e: any) {
      fail(e.message);
    }
  };

  const [negocioMap, setNegocioMap] = useState<Record<string, string>>({});

  const getNegocioId = (nombreLocal: string): string | null => {
    return negocioMap[nombreLocal] || null;
  };

  const getProductsForLocal = (nombreLocal: string) => {
    const nid = getNegocioId(nombreLocal);
    if (!nid) return [];
    return productos.filter(p => p.negocio_id === nid);
  };

  const filtered = busqueda
    ? locales.filter(l =>
        l.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (l.categoria || "").toLowerCase().includes(busqueda.toLowerCase())
      )
    : locales;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl font-bold text-sm shadow-lg" style={{ background: "#10b981", color: "#fff" }}>{toast}</div>
      )}
      {toastError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl font-bold text-sm shadow-lg" style={{ background: "#ef4444", color: "#fff" }}>{toastError}</div>
      )}

      {/* Header + Search */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Buscar local..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/50 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-yellow-400" />
        </div>
        <button onClick={() => { resetLocForm(); setShowLocForm(true); }} className="px-5 py-2.5 bg-yellow-400 text-slate-900 font-bold rounded-xl hover:bg-yellow-300 transition flex items-center gap-2 text-sm">
          <Plus size={18} /> Nuevo Local
        </button>
      </div>

      {/* Local Form Modal */}
      {showLocForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" onClick={() => resetLocForm()}>
          <div className="bg-slate-900 rounded-2xl p-6 max-w-2xl w-full border border-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-white text-lg">{editLoc ? "Editar Local" : "Nuevo Local"}</h3>
              <button onClick={resetLocForm}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={saveLocal} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className={lblC}>Nombre *</label><input className={inpC} value={fNom} onChange={e => setFNom(e.target.value)} required /></div>
                <div><label className={lblC}>Categoria</label><select className={inpC} value={fCat} onChange={e => setFCat(e.target.value)}>{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label className={lblC}>Rating</label><input className={inpC} type="number" step="0.1" min="0" max="5" value={fRating} onChange={e => setFRating(e.target.value)} /></div>
                <div className="col-span-2"><label className={lblC}>Descripcion</label><textarea className={inpC} rows={3} value={fDesc} onChange={e => setFDesc(e.target.value)} /></div>
                <div><label className={lblC}>Logo (URL)</label><input className={inpC} value={fLogo} onChange={e => setFLogo(e.target.value)} placeholder="https://..." /></div>
                <div><label className={lblC}>Banner (URL)</label><input className={inpC} value={fBanner} onChange={e => setFBanner(e.target.value)} placeholder="https://..." /></div>
                <div><label className={lblC}>Direccion</label><input className={inpC} value={fDir} onChange={e => setFDir(e.target.value)} /></div>
                <div><label className={lblC}>Telefono</label><input className={inpC} value={fTel} onChange={e => setFTel(e.target.value)} /></div>
                <div><label className={lblC}>Horario</label><input className={inpC} value={fHor} onChange={e => setFHor(e.target.value)} /></div>
                <div><label className={lblC}>Costo domicilio</label><input className={inpC} type="number" value={fDom} onChange={e => setFDom(e.target.value)} /></div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={fAbierto} onChange={e => setFAbierto(e.target.checked)} className="accent-yellow-400" /> Abierto
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={fDest} onChange={e => setFDest(e.target.checked)} className="accent-yellow-400" /> Destacado
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className={btnYellow}>{editLoc ? "Guardar cambios" : "Crear local"}</button>
                <button type="button" onClick={resetLocForm} className={btnGhost}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Producto Form Modal */}
      {showProdForm && locExpanded && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => resetProdForm()}>
          <div className="bg-slate-900 rounded-2xl p-6 max-w-lg w-full border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-white text-lg">{editProd ? "Editar Producto" : "Nuevo Producto"}</h3>
              <button onClick={resetProdForm}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              const nid = getNegocioId(locExpanded);
              if (!nid) { fail("No se encontro el negocio vinculado. Guarda el local primero."); return; }
              saveProducto(e, nid);
            }} className="space-y-4">
              <div><label className={lblC}>Nombre *</label><input className={inpC} value={fpNom} onChange={e => setFpNom(e.target.value)} required /></div>
              <div><label className={lblC}>Descripcion</label><textarea className={inpC} rows={2} value={fpDesc} onChange={e => setFpDesc(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lblC}>Precio *</label><input className={inpC} type="number" min="1" value={fpPrecio} onChange={e => setFpPrecio(e.target.value)} required /></div>
                <div><label className={lblC}>Categoria</label><select className={inpC} value={fpCat} onChange={e => setFpCat(e.target.value)}>{CATEGORIAS_PRODUCTO.map(c => <option key={c}>{c}</option>)}</select></div>
              </div>
              <div><label className={lblC}>Imagen (URL)</label><input className={inpC} value={fpImg} onChange={e => setFpImg(e.target.value)} placeholder="https://..." /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className={btnYellow}>{editProd ? "Guardar" : "Crear producto"}</button>
                <button type="button" onClick={resetProdForm} className={btnGhost}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Locales */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center">
          <Store size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">No hay locales</p>
          <p className="text-slate-600 text-sm mt-1">Crea tu primer local para empezar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(l => {
            const prods = getProductsForLocal(l.nombre);
            const expanded = locExpanded === l.nombre;
            return (
              <div key={l.id} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                {/* Header */}
                <div className="p-5 flex items-start justify-between cursor-pointer hover:bg-slate-800/30 transition" onClick={() => setLocExpanded(expanded ? null : l.nombre)}>
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                      {l.logo ? <img src={l.logo} alt="" className="w-full h-full object-cover" /> : <Store size={24} className="text-yellow-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-white font-bold">{l.nombre}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-700 text-slate-300">{l.categoria || "General"}</span>
                        {l.activo === false && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-500/10 text-red-400">Inactivo</span>}
                        {l.destacado && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-yellow-500/10 text-yellow-400">Destacado</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        {l.rating && <span className="flex items-center gap-1"><Star size={12} className="text-yellow-400" /> {l.rating}</span>}
                        <span className="flex items-center gap-1"><DollarSign size={12} /> {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(l.domicilio_cost || 3000)}</span>
                        <span className="flex items-center gap-1"><Package size={12} /> {prods.length} productos</span>
                        {l.direccion && <span className="flex items-center gap-1"><MapPin size={12} /> {l.direccion}</span>}
                        <span className={`flex items-center gap-1 ${l.abierto !== false ? "text-green-400" : "text-red-400"}`}>{l.abierto !== false ? "Abierto" : "Cerrado"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={e => { e.stopPropagation(); openEditLoc(l); }} className={btnGhost}><Edit2 size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); toggleLocal(l.id, l.activo !== false ? false : true, l.nombre); }} className={btnGhost}>{l.activo !== false ? "Desactivar" : "Activar"}</button>
                    <button onClick={e => { e.stopPropagation(); deleteLocal(l.id, l.nombre); }} className={`${btnGhost} hover:text-red-400`}><Trash2 size={14} /></button>
                    {expanded ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                  </div>
                </div>

                {/* Expanded: Products */}
                {expanded && (
                  <div className="border-t border-slate-800 px-5 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-sm font-bold text-white flex items-center gap-2"><Package size={16} className="text-yellow-400" /> Productos ({prods.length})</h5>
                      <button onClick={() => { resetProdForm(); setLocExpanded(l.nombre); setShowProdForm(true); }} className="px-4 py-2 bg-yellow-400/10 text-yellow-400 rounded-lg text-xs font-semibold border border-yellow-400/20 hover:bg-yellow-400/20 transition flex items-center gap-1.5">
                        <Plus size={14} /> Agregar producto
                      </button>
                    </div>
                    {prods.length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-4">Sin productos. Agrega el primero.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {prods.map(p => (
                          <div key={p.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                            <div className="flex gap-3">
                              {p.imagen ? (
                                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-slate-700"><img src={p.imagen} alt="" className="w-full h-full object-cover" /></div>
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center shrink-0"><Image size={20} className="text-slate-500" /></div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-1">
                                  <p className="text-white font-semibold text-sm truncate">{p.nombre}</p>
                                  <div className="flex gap-1 shrink-0">
                                    <button onClick={() => openEditProd(p)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"><Edit2 size={12} /></button>
                                    <button onClick={() => deleteProducto(p.id)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400"><Trash2 size={12} /></button>
                                  </div>
                                </div>
                                {p.descripcion && <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{p.descripcion}</p>}
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-yellow-400 font-bold text-sm">{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(p.precio)}</span>
                                  <button onClick={() => toggleProducto(p.id, !p.disponible)} className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${p.disponible !== false ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                    {p.disponible !== false ? "Disponible" : "Agotado"}
                                  </button>
                                </div>
                                <span className="text-[9px] text-slate-600">{p.categoria_producto}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
