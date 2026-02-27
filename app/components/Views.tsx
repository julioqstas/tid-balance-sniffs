'use client';

import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TreePine, BarChart2, TrendingUp, ArrowUpFromLine, Archive, FileSpreadsheet, AlertTriangle, CheckCircle2, Clock, Layers, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

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
                <Icon size={10} className={active ? 'text-[#057b57]' : 'text-gray-300 group-hover:text-gray-400'} />
            </span>
        </th>
    );
}

// ── KPI Card ───────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, iconBg }: { icon: React.ReactNode; label: string; value: string; sub?: string; iconBg: string }) {
    return (
        <div className="bg-white rounded-2xl p-4 flex gap-3 items-start" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
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
                            <Tooltip formatter={(v: number) => fv(v)} contentStyle={customTooltip} cursor={{ fill: '#f8fafc' }} />
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
                            <Tooltip formatter={(v: number) => fp(v)} contentStyle={customTooltip} />
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
