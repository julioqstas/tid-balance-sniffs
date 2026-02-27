'use client';

import { ReactNode, useState } from 'react';
import {
    UploadCloud, TreePine, BarChart2, TrendingUp, ArrowUpFromLine,
    Archive, Filter, ChevronDown, Check, X, RefreshCcw, SlidersHorizontal
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────
export type DockTab = 'consumos' | 'produccion' | 'rendimientos' | 'salidas' | 'saldos';

export interface FilterState {
    filtrosAnio: string[]; setFiltrosAnio: (v: string[]) => void;
    filtrosLote: string[]; setFiltrosLote: (v: string[]) => void;
    filtrosEspecie: string[]; setFiltrosEspecie: (v: string[]) => void;
    filtrosLinea: string[]; setFiltrosLinea: (v: string[]) => void;
    aniosDisp: string[]; lotesDisp: string[]; especiesDisp: string[]; lineasDisp: string[];
    onLimpiar: () => void;
}

interface AppShellProps {
    children: ReactNode;
    activeTab: DockTab;
    onTabChange: (tab: DockTab) => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    importRef: React.RefObject<HTMLInputElement>;
    hasData: boolean;
    periodoLabel?: string;
    filters: FilterState;
    unitMode: 'm3' | 'pt';
    onUnitModeChange: (m: 'm3' | 'pt') => void;
}

const TABS: { id: DockTab; label: string; icon: ReactNode }[] = [
    { id: 'consumos', label: 'Consumos', icon: <TreePine size={22} /> },
    { id: 'produccion', label: 'Producción', icon: <BarChart2 size={22} /> },
    { id: 'rendimientos', label: 'Rendimiento', icon: <TrendingUp size={22} /> },
    { id: 'salidas', label: 'Salidas', icon: <ArrowUpFromLine size={22} /> },
    { id: 'saldos', label: 'Saldos', icon: <Archive size={22} /> },
];

const TITLES: Record<DockTab, { title: string; sub: string }> = {
    consumos: { title: 'Consumos', sub: 'Madera en trozas ingresada al proceso' },
    produccion: { title: 'Producción por Línea', sub: 'LP · LRE por lote de corte' },
    rendimientos: { title: 'Rendimientos', sub: 'Eficiencia de conversión por lote' },
    salidas: { title: 'Salidas', sub: 'Madera despachada (columna D)' },
    saldos: { title: 'Saldos — Stock', sub: 'Producción pendiente de despacho' },
};

// ── Compact Dropdown (desktop topbar) ────────────────────
function CompactSelect({ label, opciones, seleccionados, setSeleccionados }: {
    label: string; opciones: string[]; seleccionados: string[]; setSeleccionados: (v: string[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const active = seleccionados.length > 0;
    const toggle = (o: string) => seleccionados.includes(o)
        ? setSeleccionados(seleccionados.filter(x => x !== o))
        : setSeleccionados([...seleccionados, o]);
    const text = !active ? label
        : seleccionados.length === 1
            ? (seleccionados[0].length > 12 ? seleccionados[0].slice(0, 12) + '…' : seleccionados[0])
            : `${label}: ${seleccionados.length}`;
    return (
        <div className="relative">
            <button onClick={() => setOpen(!open)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-all"
                style={{
                    background: active ? '#e8f5e9' : 'white',
                    borderColor: active ? '#057b57' : '#e2e8f0',
                    color: active ? '#057b57' : '#64748b',
                }}>
                {text}
                <ChevronDown size={10} className={`transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (<>
                <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                <div className="absolute right-0 top-full z-40 mt-1 min-w-[168px] bg-white border border-gray-100 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                    <div onClick={() => { setSeleccionados([]); setOpen(false); }}
                        className="p-2.5 border-b border-gray-50 hover:bg-[#e8f5e9] cursor-pointer font-bold text-[11px] flex justify-between items-center"
                        style={{ color: '#057b57' }}>
                        <span>Todos</span>{!active && <Check size={12} />}
                    </div>
                    {opciones.map(op => (
                        <div key={op} onClick={() => toggle(op)}
                            className="p-2.5 flex items-center gap-2 hover:bg-gray-50 cursor-pointer text-[11px] font-medium border-b border-gray-50 last:border-0">
                            <div className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-colors"
                                style={{ background: seleccionados.includes(op) ? '#057b57' : 'white', borderColor: seleccionados.includes(op) ? '#057b57' : '#d1d5db' }}>
                                {seleccionados.includes(op) && <Check size={10} className="text-white" />}
                            </div>
                            <span className="truncate" title={op}>{op}</span>
                        </div>
                    ))}
                </div>
            </>)}
        </div>
    );
}

// ── Full MultiSelect (bottom sheet mobile) ────────────────
function SheetSelect({ titulo, opciones, seleccionados, setSeleccionados }: {
    titulo: string; opciones: string[]; seleccionados: string[]; setSeleccionados: (v: string[]) => void;
}) {
    const toggle = (o: string) => seleccionados.includes(o)
        ? setSeleccionados(seleccionados.filter(x => x !== o))
        : setSeleccionados([...seleccionados, o]);
    const active = seleccionados.length > 0;
    return (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#86868b' }}>{titulo}</label>
                {active && <button onClick={() => setSeleccionados([])} className="text-[10px] font-bold cursor-pointer border-none bg-transparent" style={{ color: '#057b57' }}>Limpiar</button>}
            </div>
            <div className="flex flex-wrap gap-2">
                <button onClick={() => setSeleccionados([])}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border cursor-pointer transition-all"
                    style={{ background: !active ? '#e8f5e9' : 'white', borderColor: !active ? '#057b57' : '#e2e8f0', color: !active ? '#057b57' : '#64748b' }}>
                    Todos
                </button>
                {opciones.map(op => {
                    const sel = seleccionados.includes(op);
                    return (
                        <button key={op} onClick={() => toggle(op)}
                            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border cursor-pointer transition-all"
                            style={{ background: sel ? '#057b57' : 'white', borderColor: sel ? '#057b57' : '#e2e8f0', color: sel ? 'white' : '#1d1d1f' }}>
                            {op}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── AppShell ───────────────────────────────────────────────
export function AppShell({ children, activeTab, onTabChange, onImport, importRef, hasData, periodoLabel, filters, unitMode, onUnitModeChange }: AppShellProps) {
    const [sheetOpen, setSheetOpen] = useState(false);
    const showUnitToggle = ['produccion', 'salidas', 'saldos'].includes(activeTab);

    const { filtrosAnio, filtrosLote, filtrosEspecie, filtrosLinea } = filters;
    const totalFiltros = filtrosAnio.length + filtrosLote.length + filtrosEspecie.length + filtrosLinea.length;

    // Chips for mobile
    const chips: { label: string; remove: () => void }[] = [
        ...filtrosAnio.map(v => ({ label: `Año: ${v}`, remove: () => filters.setFiltrosAnio(filtrosAnio.filter(x => x !== v)) })),
        ...filtrosLote.map(v => ({ label: v, remove: () => filters.setFiltrosLote(filtrosLote.filter(x => x !== v)) })),
        ...filtrosEspecie.map(v => ({ label: v.length > 14 ? v.slice(0, 14) + '…' : v, remove: () => filters.setFiltrosEspecie(filtrosEspecie.filter(x => x !== v)) })),
        ...filtrosLinea.map(v => ({ label: `Línea: ${v}`, remove: () => filters.setFiltrosLinea(filtrosLinea.filter(x => x !== v)) })),
    ];

    return (
        <div className="flex h-dvh w-full overflow-hidden" style={{ background: 'var(--color-surface-app)' }}>

            {/* ── SIDEBAR desktop ── */}
            <aside className="hidden md:flex flex-col w-[220px] shrink-0 bg-white border-r border-gray-100"
                style={{ boxShadow: 'var(--shadow-sidebar)' }}>
                <div className="px-5 py-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <img src="/images/logo-fq.png" alt="FQ Logo" className="w-10 h-10 rounded-full object-contain" style={{ background: 'transparent' }} />
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest leading-none" style={{ color: 'var(--color-brand)' }}>TID - Auditor SNIFFS</p>
                            <p className="text-[13px] font-bold leading-tight" style={{ color: 'var(--color-timber-dark)' }}>Balance de Transformación Primaria</p>
                        </div>
                    </div>
                    {periodoLabel && (
                        <div className="mt-2.5 flex items-center justify-center gap-1.5 px-3 py-1 rounded-full border text-[10.5px] font-semibold whitespace-nowrap" style={{ borderColor: 'var(--color-brand)', color: 'var(--color-brand)', background: 'white' }}>
                            📅 {periodoLabel}
                        </div>
                    )}
                </div>
                <nav className="flex-1 py-3 px-2 overflow-y-auto">
                    <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-2" style={{ color: 'var(--color-timber-grey)' }}>Secciones</p>
                    {TABS.map(tab => {
                        const active = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => onTabChange(tab.id)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5 cursor-pointer border-none"
                                style={{ background: active ? 'var(--color-brand-light)' : 'transparent', color: active ? 'var(--color-brand)' : 'var(--color-timber-dark)', fontWeight: active ? 700 : 500 }}>
                                <span style={{ color: active ? 'var(--color-brand)' : 'var(--color-timber-grey)' }}>{tab.icon}</span>
                                <span className="text-[13px]">{tab.label}</span>
                                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-brand)' }} />}
                            </button>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-gray-100">
                    <input type="file" ref={importRef} accept=".xlsx,.xls" onChange={onImport} className="hidden" />
                    <button onClick={() => importRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 text-white text-[13px] font-bold py-3 rounded-xl transition-all cursor-pointer border-none"
                        style={{ background: 'var(--color-brand)', boxShadow: 'var(--shadow-fab)' }}>
                        <UploadCloud size={16} />{hasData ? 'Reimportar Excel' : 'Importar Excel'}
                    </button>
                </div>
            </aside>

            {/* ── MAIN COLUMN ── */}
            <div className="flex flex-col flex-1 min-w-0">

                {/* Mobile header */}
                <header className="md:hidden text-white px-4 py-3 flex items-center gap-3 shrink-0"
                    style={{ background: 'var(--color-brand)', boxShadow: 'var(--shadow-header)' }}>
                    <img src="/images/logo-fq.png" alt="FQ" className="w-8 h-8 rounded-full object-contain shrink-0" style={{ background: 'white' }} />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest leading-none">TID - Auditor SNIFFS</p>
                        <p className="text-[14px] font-bold leading-tight truncate">{TITLES[activeTab].title}</p>
                    </div>
                    {/* Unit toggle mobile — solo en Producción/Salidas/Saldos */}
                    {showUnitToggle && (
                        <div className="flex items-center rounded-lg overflow-hidden text-[11px] font-bold shrink-0 border border-white/30">
                            <button onClick={() => onUnitModeChange('m3')}
                                className="px-2.5 py-1.5 cursor-pointer border-none transition-all"
                                style={{ background: unitMode === 'm3' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)', color: unitMode === 'm3' ? '#057b57' : 'white' }}>
                                m³
                            </button>
                            <button onClick={() => onUnitModeChange('pt')}
                                className="px-2.5 py-1.5 cursor-pointer border-none transition-all border-l border-white/30"
                                style={{ background: unitMode === 'pt' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)', color: unitMode === 'pt' ? '#057b57' : 'white' }}>
                                PT
                            </button>
                        </div>
                    )}
                    {/* Filter button mobile */}
                    {hasData && (
                        <button onClick={() => setSheetOpen(true)}
                            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 text-white text-[12px] font-bold border-none cursor-pointer active:bg-white/30 transition-all">
                            <SlidersHorizontal size={14} />
                            <span>Filtrar</span>
                            {totalFiltros > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full text-[9px] font-black flex items-center justify-center"
                                    style={{ background: '#fff', color: 'var(--color-brand)', minWidth: 18, height: 18 }}>
                                    {totalFiltros}
                                </span>
                            )}
                        </button>
                    )}
                    <input type="file" ref={importRef} accept=".xlsx,.xls" onChange={onImport} className="hidden" />
                </header>

                {/* Mobile chips row — siempre visible si hay período importado o filtros activos */}
                {(chips.length > 0 || periodoLabel) && (
                    <div className="md:hidden flex gap-2 px-3 py-2 overflow-x-auto bg-white border-b border-gray-100 shrink-0 items-center" style={{ scrollbarWidth: 'none' }}>
                        {/* Chips de filtros activos */}
                        {chips.map((chip, i) => (
                            <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0"
                                style={{ background: '#e8f5e9', color: '#057b57' }}>
                                {chip.label}
                                <button onClick={chip.remove} className="ml-0.5 bg-transparent border-none cursor-pointer p-0 text-[#057b57]">
                                    <X size={11} />
                                </button>
                            </span>
                        ))}
                        {/* Botón Limpiar (solo si hay más de 1 filtro) */}
                        {totalFiltros > 1 && (
                            <button onClick={filters.onLimpiar}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 border-none cursor-pointer"
                                style={{ background: '#fee2e2', color: '#dc2626' }}>
                                <RefreshCcw size={10} /> Limpiar
                            </button>
                        )}
                        {/* Separador visual si hay filtros y período */}
                        {chips.length > 0 && periodoLabel && (
                            <div className="w-px h-4 bg-gray-200 shrink-0 mx-0.5" />
                        )}
                        {/* Chip de período — siempre al final, informativo (sin ×) */}
                        {periodoLabel && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 border"
                                style={{ background: 'white', borderColor: '#057b57', color: '#057b57' }}>
                                📅 {periodoLabel}
                            </span>
                        )}
                    </div>
                )}


                {/* Desktop topbar */}
                <div className="hidden md:flex items-center px-6 py-3.5 border-b border-gray-100 bg-white gap-4 shrink-0 min-h-[64px]">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-[18px] font-extrabold tracking-tight truncate" style={{ color: 'var(--color-timber-dark)' }}>
                            {TITLES[activeTab].title}
                        </h1>
                        <p className="text-[11px] font-medium" style={{ color: 'var(--color-timber-grey)' }}>{TITLES[activeTab].sub}</p>
                    </div>
                    {/* Inline filters desktop */}
                    {hasData && (
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                            {/* Unit toggle — solo en vistas con PT */}
                            {showUnitToggle && (
                                <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-[11px] font-bold shrink-0">
                                    <button onClick={() => onUnitModeChange('m3')}
                                        className="px-2.5 py-1.5 cursor-pointer border-none transition-all"
                                        style={{ background: unitMode === 'm3' ? '#057b57' : 'white', color: unitMode === 'm3' ? 'white' : '#6b7280' }}>
                                        m³
                                    </button>
                                    <button onClick={() => onUnitModeChange('pt')}
                                        className="px-2.5 py-1.5 cursor-pointer border-none transition-all border-l border-gray-200"
                                        style={{ background: unitMode === 'pt' ? '#057b57' : 'white', color: unitMode === 'pt' ? 'white' : '#6b7280' }}>
                                        PT
                                    </button>
                                </div>
                            )}
                            <span className="text-[11px] font-bold flex items-center gap-1 mr-0.5" style={{ color: '#94a3b8' }}>
                                <Filter size={12} /> Filtrar:
                            </span>
                            <CompactSelect label="Año" opciones={filters.aniosDisp} seleccionados={filtrosAnio} setSeleccionados={filters.setFiltrosAnio} />
                            <CompactSelect label="Lote" opciones={filters.lotesDisp} seleccionados={filtrosLote} setSeleccionados={filters.setFiltrosLote} />
                            <CompactSelect label="Especie" opciones={filters.especiesDisp} seleccionados={filtrosEspecie} setSeleccionados={filters.setFiltrosEspecie} />
                            <CompactSelect label="Línea" opciones={filters.lineasDisp} seleccionados={filtrosLinea} setSeleccionados={filters.setFiltrosLinea} />
                            {totalFiltros > 0 && (
                                <button onClick={filters.onLimpiar}
                                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer transition-all border-red-200 text-red-500 hover:bg-red-50 bg-white">
                                    <RefreshCcw size={10} /> Limpiar
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {children}
                </div>

                {/* Bottom dock mobile */}
                <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 px-1 pt-1.5 flex items-end justify-around shrink-0"
                    style={{ boxShadow: 'var(--shadow-dock)', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
                    {TABS.slice(0, 2).map(tab => {
                        const active = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => onTabChange(tab.id)}
                                className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl min-w-[52px] border-none cursor-pointer transition-all bg-transparent"
                                style={{ color: active ? 'var(--color-brand)' : '#9ca3af' }}>
                                <span className={`transition-transform ${active ? 'scale-110' : ''}`}>{tab.icon}</span>
                                <span className="text-[9.5px] font-semibold leading-tight">{tab.label}</span>
                                {active && <div className="w-4 h-0.5 rounded-full" style={{ background: 'var(--color-brand)' }} />}
                            </button>
                        );
                    })}
                    {/* FAB — Importar */}
                    <div className="flex flex-col items-center -mt-5">
                        <button onClick={() => importRef.current?.click()}
                            className="w-[54px] h-[54px] rounded-full text-white flex items-center justify-center border-none cursor-pointer active:scale-95 transition-all"
                            style={{ background: 'var(--color-brand)', boxShadow: 'var(--shadow-fab)' }}
                            aria-label="Importar Excel">
                            <UploadCloud size={22} />
                        </button>
                        <span className="text-[9px] font-bold mt-0.5" style={{ color: 'var(--color-brand)' }}>Importar</span>
                    </div>
                    {TABS.slice(2).map(tab => {
                        const active = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => onTabChange(tab.id)}
                                className="flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl min-w-[44px] border-none cursor-pointer transition-all bg-transparent"
                                style={{ color: active ? 'var(--color-brand)' : '#9ca3af' }}>
                                <span className={`transition-transform ${active ? 'scale-110' : ''}`}>{tab.icon}</span>
                                <span className="text-[9px] font-semibold leading-tight">{tab.label}</span>
                                {active && <div className="w-3.5 h-0.5 rounded-full" style={{ background: 'var(--color-brand)' }} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── FILTER BOTTOM SHEET (mobile) ── */}
            {sheetOpen && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setSheetOpen(false)} />
                    <div className="fixed bottom-0 left-0 right-0 z-60 md:hidden bg-white rounded-t-3xl shadow-2xl max-h-[80dvh] overflow-y-auto"
                        style={{ animation: 'slide-up 0.3s cubic-bezier(0.2,0.8,0.2,1)' }}>
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-gray-200" />
                        </div>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                            <span className="text-[15px] font-extrabold" style={{ color: 'var(--color-timber-dark)' }}>Filtrar datos</span>
                            <button onClick={() => setSheetOpen(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border-none cursor-pointer">
                                <X size={16} style={{ color: 'var(--color-timber-grey)' }} />
                            </button>
                        </div>
                        {/* Filters */}
                        <div className="px-5 pt-4 pb-6">
                            <SheetSelect titulo="Año" opciones={filters.aniosDisp} seleccionados={filtrosAnio} setSeleccionados={filters.setFiltrosAnio} />
                            <SheetSelect titulo="Especie" opciones={filters.especiesDisp} seleccionados={filtrosEspecie} setSeleccionados={filters.setFiltrosEspecie} />
                            <SheetSelect titulo="Línea de Producción" opciones={filters.lineasDisp} seleccionados={filtrosLinea} setSeleccionados={filters.setFiltrosLinea} />
                            <SheetSelect titulo="Lote" opciones={filters.lotesDisp} seleccionados={filtrosLote} setSeleccionados={filters.setFiltrosLote} />
                        </div>
                        {/* Actions */}
                        <div className="px-5 pb-8 flex gap-3">
                            <button onClick={() => { filters.onLimpiar(); }}
                                className="flex-1 py-3 rounded-xl text-[13px] font-bold border border-gray-200 bg-white cursor-pointer"
                                style={{ color: 'var(--color-timber-grey)' }}>
                                Limpiar todo
                            </button>
                            <button onClick={() => setSheetOpen(false)}
                                className="flex-1 py-3 rounded-xl text-[13px] font-bold text-white border-none cursor-pointer"
                                style={{ background: 'var(--color-brand)' }}>
                                Aplicar filtros
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
