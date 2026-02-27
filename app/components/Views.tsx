'use client';

import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TreePine, BarChart2, TrendingUp, ArrowUpFromLine, Archive, FileSpreadsheet, AlertTriangle, CheckCircle2, Clock, Layers, ChevronUp, ChevronDown, ChevronsUpDown, UploadCloud } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────
export interface FilaProduccion {
    loteOriginal: string; loteEstandarizado: string; anio: string;
    especie: string; especieCientifica: string;
    consumoM3: number; lineaProduccion: string;
    produccionM3: number; reprocesoM3: number; salidasM3: number; saldoM3: number; rendimiento: number;
}
export interface LoteAgrupado {
    loteEstandarizado: string; anio: string; especie: string;
    consumoTotalM3: number; produccionTotalM3: number; produccionLP: number; produccionLRE: number;
    reprocesoTotal: number; salidasTotal: number; saldoTotal: number;
    rendimientoGlobal: number; rendimientoLP: number; rendimientoLRE: number;
    consumosUnicos: Set<number>; estadoLote: 'cerrado' | 'en_proceso' | 'deficit';
}
export interface ViewProps {
    datos: FilaProduccion[];
    agrupados: LoteAgrupado[];
    hasData: boolean;
    unitMode?: 'm3' | 'pt';
}

// ── Formatters ─────────────────────────────────────────────
const PT_FACTOR = 424;
const fv = (v: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v || 0);
const fvPT = (v: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((v || 0) * PT_FACTOR);
const fp = (v: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v || 0) + '%';
// conv() convierte según el modo activo; label devuelve la unidad
const makeUnit = (mode?: 'm3' | 'pt') => ({
    fmt: mode === 'pt' ? fvPT : fv,
    label: mode === 'pt' ? 'PT' : 'm³',
    conv: (v: number) => mode === 'pt' ? v / PT_FACTOR : v,
});

// ── Sort helpers ───────────────────────────────────────────
type SortDir = 'asc' | 'desc';

function useSort<T>(items: T[]) {
    const [key, setKey] = useState<keyof T | null>(null);
    const [dir, setDir] = useState<SortDir>('asc');
    const onSort = (k: keyof T) => {
        if (key === k) setDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setKey(k); setDir('asc'); }
    };
    const sorted = useMemo(() => {
        if (!key) return items;
        return [...items].sort((a, b) => {
            const av = a[key]; const bv = b[key];
            if (typeof av === 'number' && typeof bv === 'number') return dir === 'asc' ? av - bv : bv - av;
            return dir === 'asc'
                ? String(av).localeCompare(String(bv))
                : String(bv).localeCompare(String(av));
        });
    }, [items, key, dir]);
    return { sorted, key, dir, onSort };
}

// ── SortableTh ─────────────────────────────────────────────
function SortableTh<T>({ label, field, sortKey, dir, onSort, align = 'left' }: {
    label: string; field: keyof T; sortKey: keyof T | null; dir: SortDir;
    onSort: (k: keyof T) => void; align?: 'left' | 'right' | 'center';
}) {
    const active = sortKey === field;
    const Icon = active ? (dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
    return (
        <th onClick={() => onSort(field)}
            className={`px-4 py-3 text-${align} text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors group`}
            style={{ color: active ? '#057b57' : '#6b7280' }}>
            <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
                {label}
                <Icon size={10} className={active ? 'text-brand' : 'text-gray-300 group-hover:text-gray-400'} />
            </span>
        </th>
    );
}

// ── KPI Card ───────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, iconBg }: { icon: React.ReactNode; label: string; value: string; sub?: string; iconBg: string }) {
    return (
        <div className="bg-white rounded-2xl p-4 flex gap-3 items-start" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className={`w-10 h-10 rounded-icon flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
            <div className="min-w-0">
                <p className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-timber-grey)' }}>{label}</p>
                <p className="text-[22px] font-extrabold leading-tight truncate" style={{ color: 'var(--color-timber-dark)' }}>{value}</p>
                {sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-timber-grey)' }}>{sub}</p>}
            </div>
        </div>
    );
}

// ── Empty State ────────────────────────────────────────────
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center px-6 py-20">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--color-brand-light)' }}>
                <FileSpreadsheet size={36} style={{ color: 'var(--color-brand)' }} />
            </div>
            <h2 className="text-[20px] font-bold mb-2" style={{ color: 'var(--color-timber-dark)' }}>Sube el Cuadro Resumen 3</h2>
            <p className="text-[14px] max-w-xs font-medium" style={{ color: 'var(--color-timber-grey)' }}>
                Importa el archivo <strong>.xlsx</strong> del SNIFFS usando el botón <strong>Importar</strong>.
            </p>
        </div>
    );
}

// ── Card shell for table ───────────────────────────────────
function TableCard({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
                <span className="text-[13px] font-bold" style={{ color: 'var(--color-timber-dark)' }}>{title}</span>
                <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold bg-gray-100 text-gray-500">{count} lotes</span>
            </div>
            {children}
        </div>
    );
}

// ── thead style ────────────────────────────────────────────
const TH_BASE = 'bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200';
// Dynamic table height: 100dvh minus approx offset (header + topbar + KPI row + card header + padding)
const TABLE_H = 'max-h-[calc(100dvh-440px)] min-h-[220px] overflow-y-auto';

const BRAND = '#057b57';
const INDIGO = '#4f46e5';
const FUCHSIA = '#a21caf';
const AMBER = '#d97706';
const RED = '#dc2626';
const customTooltip = { fontWeight: 600, borderRadius: '10px', fontSize: '12px' };

// ── CONSUMOS VIEW ──────────────────────────────────────────
export function ConsumoView(props: ViewProps) {
    const { agrupados, datos } = props;
    const totalConsumo = agrupados.reduce((s, l) => s + l.consumoTotalM3, 0);
    const especiesUnicas = new Set(datos.map(d => d.especie)).size;
    const aniosUnicos = new Set(datos.map(d => d.anio)).size;
    const { sorted, key, dir, onSort } = useSort(agrupados);

    if (!props.hasData) return <EmptyState />;
    return (
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard icon={<TreePine size={20} className="text-white" />} iconBg="bg-[#057b57]" label="Consumo Total" value={`${fv(totalConsumo)} m³`} sub={`${agrupados.length} lotes procesados`} />
                <KpiCard icon={<Layers size={20} className="text-white" />} iconBg="bg-indigo-600" label="Especies" value={String(especiesUnicas)} sub="especies distintas" />
                <KpiCard icon={<BarChart2 size={20} className="text-white" />} iconBg="bg-amber-500" label="Campañas" value={String(aniosUnicos)} sub="años de corte" />
            </div>

            <div className="bg-white rounded-2xl p-4 md:p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
                <h3 className="text-[15px] font-extrabold mb-4" style={{ color: 'var(--color-timber-dark)' }}>Consumo por Lote (m³)</h3>
                <div className="h-64 md:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agrupados} margin={{ bottom: 0, left: -18, right: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="loteEstandarizado" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} angle={-90} textAnchor="end" interval={0} height={68} tickMargin={18} />
                            <YAxis tickFormatter={v => new Intl.NumberFormat('en-US').format(v)} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                            <Tooltip formatter={(v: number | undefined) => v !== undefined ? fv(v) : ''} contentStyle={customTooltip} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="consumoTotalM3" name="Consumo (m³)" fill={BRAND} radius={[5, 5, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <TableCard title="Detalle por Lote" count={agrupados.length}>
                <div className={`overflow-x-auto ${TABLE_H}`}>
                    <table className="w-full text-[12px] min-w-[480px]">
                        <thead className={`sticky top-0 ${TH_BASE}`}>
                            <tr>
                                <SortableTh<LoteAgrupado> label="Lote" field="loteEstandarizado" sortKey={key} dir={dir} onSort={onSort} />
                                <SortableTh<LoteAgrupado> label="Año" field="anio" sortKey={key} dir={dir} onSort={onSort} align="center" />
                                <SortableTh<LoteAgrupado> label="Especie" field="especie" sortKey={key} dir={dir} onSort={onSort} />
                                <SortableTh<LoteAgrupado> label="Consumo m³" field="consumoTotalM3" sortKey={key} dir={dir} onSort={onSort} align="right" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sorted.map(l => (
                                <tr key={l.loteEstandarizado} className="hover:bg-[#f0fdf4] transition-colors">
                                    <td className="px-4 py-2.5 font-bold" style={{ color: 'var(--color-brand)' }}>{l.loteEstandarizado}</td>
                                    <td className="px-4 py-2.5 text-center" style={{ color: 'var(--color-timber-grey)' }}>{l.anio}</td>
                                    <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--color-timber-dark)' }}>{l.especie}</td>
                                    <td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: 'var(--color-timber-dark)' }}>{fv(l.consumoTotalM3)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </TableCard>
        </div>
    );
}

// ── PRODUCCIÓN VIEW ──────────────────────────────────────────
const ChartDataTooltipFormatter = (u: ReturnType<typeof makeUnit>) =>
    (v: unknown) => typeof v === 'number' ? u.fmt(v) : String(v);
export function ProduccionView(props: ViewProps) {
    const { agrupados, unitMode } = props;
    const u = makeUnit(unitMode);
    const totalProd = agrupados.reduce((s, l) => s + l.produccionTotalM3, 0);
    const totalLP = agrupados.reduce((s, l) => s + l.produccionLP, 0);
    const totalLRE = agrupados.reduce((s, l) => s + l.produccionLRE, 0);
    const { sorted, key, dir, onSort } = useSort(agrupados);

    if (!props.hasData) return <EmptyState />;
    return (
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard icon={<BarChart2 size={20} className="text-white" />} iconBg="bg-[#057b57]" label="Producción Total" value={`${u.fmt(totalProd)} ${u.label}`} />
                <KpiCard icon={<span className="text-white text-xs font-black">LP</span>} iconBg="bg-indigo-600" label="Línea Principal (LP)" value={`${u.fmt(totalLP)} ${u.label}`} sub={`${fp(totalProd > 0 ? totalLP / totalProd * 100 : 0)} del total`} />
                <KpiCard icon={<span className="text-white text-xs font-black">LRE</span>} iconBg="bg-fuchsia-700" label="Línea Reaserío (LRE)" value={`${u.fmt(totalLRE)} ${u.label}`} sub={`${fp(totalProd > 0 ? totalLRE / totalProd * 100 : 0)} del total`} />
            </div>

            <div className="bg-white rounded-2xl p-4 md:p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
                <h3 className="text-[15px] font-extrabold mb-4" style={{ color: 'var(--color-timber-dark)' }}>Producción LP vs LRE por Lote ({u.label})</h3>
                <div className="h-64 md:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agrupados} margin={{ bottom: 0, left: -18, right: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="loteEstandarizado" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} angle={-90} textAnchor="end" interval={0} height={68} tickMargin={18} />
                            <YAxis tickFormatter={v => new Intl.NumberFormat('en-US').format(typeof v === 'number' ? u.conv(v) : 0)} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                            <Tooltip formatter={ChartDataTooltipFormatter(u)} contentStyle={customTooltip} cursor={{ fill: '#f8fafc' }} />
                            <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                            <Bar dataKey="produccionLP" name={`LP (${u.label})`} fill={INDIGO} radius={[4, 4, 0, 0]} stackId="a" />
                            <Bar dataKey="produccionLRE" name={`LRE (${u.label})`} fill={FUCHSIA} radius={[4, 4, 0, 0]} stackId="a" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <TableCard title="Detalle por Lote" count={agrupados.length}>
                <div className={`overflow-x-auto ${TABLE_H}`}>
                    <table className="w-full text-[12px] min-w-[520px]">
                        <thead className={`sticky top-0 ${TH_BASE}`}>
                            <tr>
                                <SortableTh<LoteAgrupado> label="Lote" field="loteEstandarizado" sortKey={key} dir={dir} onSort={onSort} />
                                <SortableTh<LoteAgrupado> label="Especie" field="especie" sortKey={key} dir={dir} onSort={onSort} />
                                <SortableTh<LoteAgrupado> label={`LP ${u.label}`} field="produccionLP" sortKey={key} dir={dir} onSort={onSort} align="right" />
                                <SortableTh<LoteAgrupado> label={`LRE ${u.label}`} field="produccionLRE" sortKey={key} dir={dir} onSort={onSort} align="right" />
                                <SortableTh<LoteAgrupado> label={`Total ${u.label}`} field="produccionTotalM3" sortKey={key} dir={dir} onSort={onSort} align="right" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sorted.map(l => (
                                <tr key={l.loteEstandarizado} className="hover:bg-[#f0fdf4] transition-colors">
                                    <td className="px-4 py-2.5 font-bold" style={{ color: 'var(--color-brand)' }}>{l.loteEstandarizado}</td>
                                    <td className="px-4 py-2.5 font-medium truncate max-w-[150px]" style={{ color: 'var(--color-timber-dark)' }}>{l.especie}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-indigo-700">{u.fmt(l.produccionLP)}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-fuchsia-700">{u.fmt(l.produccionLRE)}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums font-bold" style={{ color: 'var(--color-timber-dark)' }}>{u.fmt(l.produccionTotalM3)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </TableCard>
        </div>
    );
}

// ── RENDIMIENTOS VIEW ──────────────────────────────────────
export function RendimientosView(props: ViewProps) {
    const { agrupados } = props;
    const global = agrupados.reduce((s, l) => s + l.rendimientoGlobal, 0) / (agrupados.length || 1);
    const mejor = agrupados.length ? agrupados.reduce((b, l) => l.rendimientoGlobal > b.rendimientoGlobal ? l : b, agrupados[0]) : null;
    const peor = agrupados.length ? agrupados.reduce((b, l) => l.rendimientoGlobal < b.rendimientoGlobal ? l : b, agrupados[0]) : null;
    const { sorted, key, dir, onSort } = useSort(agrupados);

    if (!props.hasData) return <EmptyState />;
    return (
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard icon={<TrendingUp size={20} className="text-white" />} iconBg="bg-amber-500" label="Rto. Promedio Global" value={fp(global)} sub="sobre todos los lotes filtrados" />
                {mejor && <KpiCard icon={<CheckCircle2 size={20} className="text-white" />} iconBg="bg-[#057b57]" label="Mejor Lote" value={fp(mejor.rendimientoGlobal)} sub={`${mejor.loteEstandarizado} · ${mejor.especie}`} />}
                {peor && <KpiCard icon={<AlertTriangle size={20} className="text-white" />} iconBg="bg-red-500" label="Lote a Revisar" value={fp(peor.rendimientoGlobal)} sub={`${peor.loteEstandarizado} · ${peor.especie}`} />}
            </div>

            <div className="bg-white rounded-2xl p-4 md:p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
                <h3 className="text-[15px] font-extrabold mb-4" style={{ color: 'var(--color-timber-dark)' }}>Tendencia de Rendimiento (%)</h3>
                <div className="h-64 md:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={agrupados} margin={{ bottom: 0, left: -18, right: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="loteEstandarizado" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} angle={-90} textAnchor="end" interval={0} height={68} tickMargin={18} />
                            <YAxis tickFormatter={v => v + '%'} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} domain={[0, 'auto']} />
                            <Tooltip formatter={(v: number | undefined) => v !== undefined ? fp(v) : ''} contentStyle={customTooltip} />
                            <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                            <Line type="monotone" dataKey="rendimientoGlobal" name="Total %" stroke={AMBER} strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="rendimientoLP" name="LP %" stroke={INDIGO} strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="rendimientoLRE" name="LRE %" stroke={FUCHSIA} strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <TableCard title="Rendimiento por Lote" count={agrupados.length}>
                <div className={`overflow-x-auto ${TABLE_H}`}>
                    <table className="w-full text-[12px] min-w-[500px]">
                        <thead className={`sticky top-0 ${TH_BASE}`}>
                            <tr>
                                <SortableTh<LoteAgrupado> label="Lote" field="loteEstandarizado" sortKey={key} dir={dir} onSort={onSort} />
                                <SortableTh<LoteAgrupado> label="Especie" field="especie" sortKey={key} dir={dir} onSort={onSort} />
                                <SortableTh<LoteAgrupado> label="Consumo m³" field="consumoTotalM3" sortKey={key} dir={dir} onSort={onSort} align="right" />
                                <SortableTh<LoteAgrupado> label="Producción m³" field="produccionTotalM3" sortKey={key} dir={dir} onSort={onSort} align="right" />
                                <SortableTh<LoteAgrupado> label="Rto. %" field="rendimientoGlobal" sortKey={key} dir={dir} onSort={onSort} align="right" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sorted.map(l => {
                                const rto = l.rendimientoGlobal;
                                const color = rto >= 40 ? '#16a34a' : rto >= 25 ? '#d97706' : '#dc2626';
                                return (
                                    <tr key={l.loteEstandarizado} className="hover:bg-[#f0fdf4] transition-colors">
                                        <td className="px-4 py-2.5 font-bold" style={{ color: 'var(--color-brand)' }}>{l.loteEstandarizado}</td>
                                        <td className="px-4 py-2.5 font-medium truncate max-w-[140px]" style={{ color: 'var(--color-timber-dark)' }}>{l.especie}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{fv(l.consumoTotalM3)}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{fv(l.produccionTotalM3)}</td>
                                        <td className="px-4 py-2.5 text-right font-black tabular-nums" style={{ color }}>{fp(rto)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </TableCard>
        </div>
    );
}

// ── SALIDAS VIEW ───────────────────────────────────────────
export function SalidasView(props: ViewProps) {
    const { agrupados, unitMode } = props;
    const u = makeUnit(unitMode);
    const totalSalidas = agrupados.reduce((s, l) => s + l.salidasTotal, 0);
    const totalProd = agrupados.reduce((s, l) => s + l.produccionTotalM3, 0);
    const pctDespachado = totalProd > 0 ? (totalSalidas / totalProd) * 100 : 0;
    const conSalidas = agrupados.filter(l => l.salidasTotal > 0).length;
    const { sorted, key, dir, onSort } = useSort(agrupados);

    if (!props.hasData) return <EmptyState />;
    return (
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard icon={<ArrowUpFromLine size={20} className="text-white" />} iconBg="bg-[#057b57]" label="Total Salidas" value={`${u.fmt(totalSalidas)} ${u.label}`} sub={`${conSalidas} lotes con despacho`} />
                <KpiCard icon={<TrendingUp size={20} className="text-white" />} iconBg="bg-amber-500" label="% Despachado" value={fp(pctDespachado)} sub="sobre producción total" />
                <KpiCard icon={<BarChart2 size={20} className="text-white" />} iconBg="bg-indigo-600" label="Producción Base" value={`${u.fmt(totalProd)} ${u.label}`} sub="sobre la que se calcula" />
            </div>

            <div className="bg-white rounded-2xl p-4 md:p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
                <h3 className="text-[15px] font-extrabold mb-4" style={{ color: 'var(--color-timber-dark)' }}>Salidas por Lote ({u.label})</h3>
                <div className="h-64 md:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agrupados} margin={{ bottom: 0, left: -18, right: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="loteEstandarizado" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} angle={-90} textAnchor="end" interval={0} height={68} tickMargin={18} />
                            <YAxis tickFormatter={v => new Intl.NumberFormat('en-US').format(typeof v === 'number' ? u.conv(v) : 0)} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                            <Tooltip formatter={ChartDataTooltipFormatter(u)} contentStyle={customTooltip} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="salidasTotal" name={`Salidas (${u.label})`} radius={[5, 5, 0, 0]}>
                                {agrupados.map((l, i) => <Cell key={i} fill={l.salidasTotal > 0 ? BRAND : '#e2e8f0'} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <TableCard title="Detalle de Salidas por Lote" count={agrupados.length}>
                <div className={`overflow-x-auto ${TABLE_H}`}>
                    <table className="w-full text-[12px] min-w-[560px]">
                        <thead className={`sticky top-0 ${TH_BASE}`}>
                            <tr>
                                <SortableTh<LoteAgrupado> label="Lote" field="loteEstandarizado" sortKey={key} dir={dir} onSort={onSort} />
                                <SortableTh<LoteAgrupado> label="Especie" field="especie" sortKey={key} dir={dir} onSort={onSort} />
                                <SortableTh<LoteAgrupado> label={`Producción ${u.label}`} field="produccionTotalM3" sortKey={key} dir={dir} onSort={onSort} align="right" />
                                <SortableTh<LoteAgrupado> label={`Salidas ${u.label}`} field="salidasTotal" sortKey={key} dir={dir} onSort={onSort} align="right" />
                                <SortableTh<LoteAgrupado> label={`Saldo ${u.label}`} field="saldoTotal" sortKey={key} dir={dir} onSort={onSort} align="right" />
                                <SortableTh<LoteAgrupado> label="Rto. %" field="rendimientoGlobal" sortKey={key} dir={dir} onSort={onSort} align="right" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sorted.map(l => (
                                <tr key={l.loteEstandarizado} className="hover:bg-[#f0fdf4] transition-colors">
                                    <td className="px-4 py-2.5 font-bold" style={{ color: 'var(--color-brand)' }}>{l.loteEstandarizado}</td>
                                    <td className="px-4 py-2.5 font-medium truncate max-w-[130px]" style={{ color: 'var(--color-timber-dark)' }}>{l.especie}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{u.fmt(l.produccionTotalM3)}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums font-bold" style={{ color: l.salidasTotal > 0 ? 'var(--color-brand)' : 'var(--color-timber-grey)' }}>{u.fmt(l.salidasTotal)}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{u.fmt(l.saldoTotal)}</td>
                                    <td className="px-4 py-2.5 text-right font-black tabular-nums text-amber-600">{fp(l.rendimientoGlobal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </TableCard>
        </div>
    );
}

// ── SALDOS (STOCK) VIEW ────────────────────────────────────
const BADGE: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    cerrado: { label: 'Cerrado', bg: '#dcfce7', text: '#15803d', icon: <CheckCircle2 size={12} /> },
    en_proceso: { label: 'En Proceso', bg: '#fef9c3', text: '#92400e', icon: <Clock size={12} /> },
    deficit: { label: 'Déficit', bg: '#fee2e2', text: '#991b1b', icon: <AlertTriangle size={12} /> },
};

export function SaldosView(props: ViewProps) {
    const { agrupados, unitMode } = props;
    const u = makeUnit(unitMode);
    const totalStock = agrupados.filter(l => l.saldoTotal > 0).reduce((s, l) => s + l.saldoTotal, 0);
    const cerrados = agrupados.filter(l => l.estadoLote === 'cerrado').length;
    const enProceso = agrupados.filter(l => l.estadoLote === 'en_proceso').length;
    const deficits = agrupados.filter(l => l.estadoLote === 'deficit').length;
    const { sorted, key, dir, onSort } = useSort(agrupados);

    if (!props.hasData) return <EmptyState />;
    return (
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">

            {deficits > 0 && (
                <div className="flex items-center gap-3 p-4 rounded-2xl border border-red-200" style={{ background: '#fff5f5' }}>
                    <AlertTriangle size={20} className="text-red-600 shrink-0" />
                    <div>
                        <p className="text-[13px] font-bold text-red-700">⚠️ Alerta de Auditoría: {deficits} lote{deficits > 1 ? 's' : ''} con déficit</p>
                        <p className="text-[11px] text-red-600">El saldo negativo indica inconsistencia entre producción y despachos registrados.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KpiCard icon={<Archive size={20} className="text-white" />} iconBg="bg-[#057b57]" label="Stock en Proceso" value={`${u.fmt(totalStock)} ${u.label}`} />
                <KpiCard icon={<CheckCircle2 size={20} className="text-white" />} iconBg="bg-emerald-600" label="Cerrados" value={String(cerrados)} sub="lotes despachados" />
                <KpiCard icon={<Clock size={20} className="text-white" />} iconBg="bg-amber-500" label="En Proceso" value={String(enProceso)} sub="lotes con saldo" />
                <KpiCard icon={<AlertTriangle size={20} className="text-white" />} iconBg="bg-red-500" label="Déficits" value={String(deficits)} sub="a revisar" />
            </div>

            <TableCard title="Stock por Lote — Saldo (B−C−D)" count={agrupados.length}>
                <div className={`overflow-x-auto ${TABLE_H}`}>
                    <table className="w-full text-[12px] min-w-[680px]">
                        <thead className={`sticky top-0 ${TH_BASE}`}>
                            <tr>
                                <SortableTh<LoteAgrupado> label="Lote" field="loteEstandarizado" sortKey={key} dir={dir} onSort={onSort} />
                                <SortableTh<LoteAgrupado> label="Especie" field="especie" sortKey={key} dir={dir} onSort={onSort} />
                                <SortableTh<LoteAgrupado> label={`Prod. ${u.label}`} field="produccionTotalM3" sortKey={key} dir={dir} onSort={onSort} align="right" />
                                <SortableTh<LoteAgrupado> label={`Reproceso ${u.label}`} field="reprocesoTotal" sortKey={key} dir={dir} onSort={onSort} align="right" />
                                <SortableTh<LoteAgrupado> label={`Salidas ${u.label}`} field="salidasTotal" sortKey={key} dir={dir} onSort={onSort} align="right" />
                                <SortableTh<LoteAgrupado> label={`Saldo ${u.label}`} field="saldoTotal" sortKey={key} dir={dir} onSort={onSort} align="right" />
                                <th className={`px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider`} style={{ color: '#6b7280' }}>Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sorted.map(l => {
                                const b = BADGE[l.estadoLote];
                                return (
                                    <tr key={l.loteEstandarizado} className="hover:bg-[#f0fdf4] transition-colors">
                                        <td className="px-4 py-2.5 font-bold whitespace-nowrap" style={{ color: 'var(--color-brand)' }}>{l.loteEstandarizado}</td>
                                        <td className="px-4 py-2.5 font-medium truncate max-w-[140px]" style={{ color: 'var(--color-timber-dark)' }}>{l.especie}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{u.fmt(l.produccionTotalM3)}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{u.fmt(l.reprocesoTotal)}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{u.fmt(l.salidasTotal)}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums font-black"
                                            style={{ color: l.estadoLote === 'deficit' ? RED : l.estadoLote === 'cerrado' ? BRAND : AMBER }}>
                                            {u.fmt(l.saldoTotal)}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                                style={{ background: b.bg, color: b.text }}>
                                                {b.icon}{b.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </TableCard>
        </div>
    );
}

// ── INICIO VIEW ────────────────────────────────────────────
import type { DockTab } from './AppShell';

interface InicioViewProps extends ViewProps {
    onTabChange: (tab: DockTab) => void;
    onImport: () => void;
    periodoLabel?: string;
}

const fvShort = (v: number) =>
    v >= 1000
        ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v)
        : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

export function InicioView({ datos, agrupados, hasData, unitMode, onTabChange, onImport, periodoLabel }: InicioViewProps) {
    const u = makeUnit(unitMode);

    // ── KPIs calculados ─────────────────────────────────────
    const totalConsumo = agrupados.reduce((s, l) => s + l.consumoTotalM3, 0);
    const totalProd = agrupados.reduce((s, l) => s + l.produccionTotalM3, 0);
    const totalLP = agrupados.reduce((s, l) => s + l.produccionLP, 0);
    const totalLRE = agrupados.reduce((s, l) => s + l.produccionLRE, 0);
    const totalSalidas = agrupados.reduce((s, l) => s + l.salidasTotal, 0);
    const totalStock = agrupados.filter(l => l.saldoTotal > 0).reduce((s, l) => s + l.saldoTotal, 0);
    const rendProm = agrupados.length ? agrupados.reduce((s, l) => s + l.rendimientoGlobal, 0) / agrupados.length : 0;
    const deficits = agrupados.filter(l => l.estadoLote === 'deficit').length;
    const cerrados = agrupados.filter(l => l.estadoLote === 'cerrado').length;
    const enProceso = agrupados.filter(l => l.estadoLote === 'en_proceso').length;
    const especiesUnicas = new Set(datos.map(d => d.especie)).size;
    const pctDespachado = totalProd > 0 ? (totalSalidas / totalProd) * 100 : 0;

    // ── Estado sin datos — bienvenida ───────────────────────
    if (!hasData) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 animate-fade-in">
                <h1 className="text-[26px] md:text-[34px] font-extrabold leading-tight" style={{ color: 'var(--color-timber-dark)' }}>
                    ¿Qué balance de
                </h1>
                <h1 className="text-[26px] md:text-[34px] font-extrabold leading-tight" style={{ color: 'var(--color-brand)' }}>
                    Transformación Primaria
                </h1>
                <h1 className="text-[26px] md:text-[34px] font-extrabold leading-tight mb-8" style={{ color: 'var(--color-timber-dark)' }}>
                    te gustaría analizar hoy?
                </h1>

                {/* Botón latiente */}
                <div className="relative flex items-center justify-center mb-6" style={{ width: 80, height: 80 }}>
                    <span className="absolute inset-0 rounded-full" style={{
                        background: '#057b57',
                        animation: 'pulse-ring 1.8s cubic-bezier(0.215,0.61,0.355,1) infinite',
                        opacity: 0.4,
                    }} />
                    <button
                        onClick={onImport}
                        className="relative z-10 flex flex-col items-center justify-center rounded-full text-white cursor-pointer border-none w-full h-full"
                        style={{
                            background: 'var(--color-brand)',
                            boxShadow: 'var(--shadow-fab)',
                            animation: 'pulse-scale 2.4s ease-in-out infinite',
                        }}
                        aria-label="Importar Excel"
                    >
                        <UploadCloud size={28} />
                    </button>
                </div>

                <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--color-timber-dark)' }}>
                    Importar Cuadro Resumen 3
                </p>
                <p className="text-[12px]" style={{ color: 'var(--color-timber-grey)' }}>
                    Archivo <strong>.xlsx</strong> exportado del sistema SNIFFS
                </p>

                {/* Mini módulos preview */}
                <div className="mt-10 grid grid-cols-3 md:grid-cols-5 gap-3 w-full max-w-sm">
                    {[
                        { icon: <TreePine size={16} />, label: 'Consumos', color: '#057b57' },
                        { icon: <BarChart2 size={16} />, label: 'Producción', color: '#4f46e5' },
                        { icon: <TrendingUp size={16} />, label: 'Rendimiento', color: '#d97706' },
                        { icon: <ArrowUpFromLine size={16} />, label: 'Salidas', color: '#0891b2' },
                        { icon: <Archive size={16} />, label: 'Stock', color: '#7c3aed' },
                    ].map(m => (
                        <div key={m.label} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white"
                            style={{ boxShadow: 'var(--shadow-card)', opacity: 0.5 }}>
                            <span style={{ color: m.color }}>{m.icon}</span>
                            <span className="text-[10px] font-bold" style={{ color: 'var(--color-timber-grey)' }}>{m.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Estado con datos — dashboard KPIs ───────────────────
    const modules: {
        tab: DockTab; icon: React.ReactNode; label: string; iconBg: string;
        kpi1: string; kpi1sub: string; kpi2: string; kpi2sub: string; kpi2color?: string;
    }[] = [
            {
                tab: 'consumos', label: 'Consumos', iconBg: '#057b57',
                icon: <TreePine size={22} className="text-white" />,
                kpi1: `${fvShort(totalConsumo)} m³`, kpi1sub: 'Total consumido',
                kpi2: `${agrupados.length}`, kpi2sub: 'lotes procesados',
            },
            {
                tab: 'produccion', label: 'Producción', iconBg: '#4f46e5',
                icon: <BarChart2 size={22} className="text-white" />,
                kpi1: `${u.fmt(totalProd)} ${u.label}`, kpi1sub: 'Producción total',
                kpi2: `${fvShort(totalProd > 0 ? totalLP / totalProd * 100 : 0)}% LP`,
                kpi2sub: `${fvShort(totalProd > 0 ? totalLRE / totalProd * 100 : 0)}% LRE`,
            },
            {
                tab: 'rendimientos', label: 'Rendimiento', iconBg: '#d97706',
                icon: <TrendingUp size={22} className="text-white" />,
                kpi1: fp(rendProm), kpi1sub: 'Rendimiento prom.',
                kpi2: `${especiesUnicas}`, kpi2sub: 'especies distintas',
            },
            {
                tab: 'salidas', label: 'Salidas', iconBg: '#0891b2',
                icon: <ArrowUpFromLine size={22} className="text-white" />,
                kpi1: `${u.fmt(totalSalidas)} ${u.label}`, kpi1sub: 'Total despachado',
                kpi2: fp(pctDespachado), kpi2sub: '% sobre producción',
                kpi2color: pctDespachado >= 70 ? '#16a34a' : pctDespachado >= 40 ? '#d97706' : '#dc2626',
            },
            {
                tab: 'saldos', label: 'Stock', iconBg: '#7c3aed',
                icon: <Archive size={22} className="text-white" />,
                kpi1: `${u.fmt(totalStock)} ${u.label}`, kpi1sub: 'En proceso',
                kpi2: deficits > 0
                    ? `${deficits} déficit${deficits > 1 ? 's' : ''}`
                    : `${cerrados} cerrado${cerrados !== 1 ? 's' : ''}`,
                kpi2sub: deficits > 0 ? 'a revisar urgente' : `${enProceso} en proceso`,
                kpi2color: deficits > 0 ? '#dc2626' : '#16a34a',
            },
        ];

    return (
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">
            {/* Header */}
            <div>
                <h2 className="text-[20px] font-extrabold" style={{ color: 'var(--color-timber-dark)' }}>
                    Resumen ejecutivo
                </h2>
                <p className="text-[12px] font-medium" style={{ color: 'var(--color-timber-grey)' }}>
                    {agrupados.length} lotes · {especiesUnicas} especies analizadas
                </p>
            </div>

            {/* Alerta de déficit */}
            {deficits > 0 && (
                <button
                    onClick={() => onTabChange('saldos')}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-red-200 text-left cursor-pointer transition-all hover:shadow-md bg-transparent"
                    style={{ background: '#fff5f5' }}
                >
                    <AlertTriangle size={18} className="text-red-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-red-700">
                            ⚠️ {deficits} lote{deficits > 1 ? 's' : ''} con déficit detectado{deficits > 1 ? 's' : ''}
                        </p>
                        <p className="text-[11px] text-red-500">
                            Saldo negativo: inconsistencia entre producción y despachos · Ver Saldos →
                        </p>
                    </div>
                </button>
            )}

            {/* Tarjetas de módulo */}
            <div className="grid grid-cols-2 gap-4">
                {modules.map(m => (
                    <button
                        key={m.tab}
                        onClick={() => onTabChange(m.tab)}
                        className="group bg-white rounded-2xl p-4 text-left flex flex-col gap-3 cursor-pointer border-none transition-all hover:-translate-y-0.5 w-full"
                        style={{ boxShadow: 'var(--shadow-card)' }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
                    >
                        {/* Cabecera */}
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: m.iconBg }}>
                                {m.icon}
                            </div>
                            <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ color: m.iconBg }}>
                                Ver →
                            </span>
                        </div>
                        {/* Etiqueta módulo */}
                        <p className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-timber-grey)' }}>
                            {m.label}
                        </p>
                        {/* KPI principal */}
                        <div>
                            <p className="text-[19px] font-extrabold leading-tight tabular-nums" style={{ color: 'var(--color-timber-dark)' }}>
                                {m.kpi1}
                            </p>
                            <p className="text-[10.5px] font-medium" style={{ color: 'var(--color-timber-grey)' }}>{m.kpi1sub}</p>
                        </div>
                        {/* Divisor */}
                        <div className="h-px w-full bg-gray-100" />
                        {/* KPI secundario */}
                        <div>
                            <p className="text-[15px] font-extrabold tabular-nums leading-tight"
                                style={{ color: m.kpi2color ?? m.iconBg }}>
                                {m.kpi2}
                            </p>
                            <p className="text-[10.5px] font-medium" style={{ color: 'var(--color-timber-grey)' }}>{m.kpi2sub}</p>
                        </div>
                    </button>
                ))}
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-center pt-1" style={{ color: '#cbd5e1' }}>
                Toca cualquier tarjeta para ver el análisis detallado
            </p>
        </div>
    );
}
