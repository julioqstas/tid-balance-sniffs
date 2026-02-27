'use client';

import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { AppShell, DockTab } from './components/AppShell';
import {
  FilaProduccion, LoteAgrupado, ViewProps,
  ConsumoView, ProduccionView, RendimientosView, SalidasView, SaldosView,
} from './components/Views';

// ── Helpers ───────────────────────────────────────────────
const limpiarNum = (v: any): number => parseFloat(String(v || '').replace(/,/g, '').trim()) || 0;

export const ordenarLotes = (a: string, b: string): number => {
  const [pa, pb] = [a.split('-'), b.split('-')];
  if (pa.length === 2 && pb.length === 2) {
    const ya = parseInt(pa[1]), yb = parseInt(pb[1]);
    const na = parseInt(pa[0]), nb = parseInt(pb[0]);
    return ya !== yb ? ya - yb : na - nb;
  }
  return a.localeCompare(b);
};

// ── Dashboard ─────────────────────────────────────────────
export default function SniffsDashboard() {
  const [datosCrudos, setDatosCrudos] = useState<FilaProduccion[]>([]);
  const [filtrosAnio, setFiltrosAnio] = useState<string[]>([]);
  const [filtrosLote, setFiltrosLote] = useState<string[]>([]);
  const [filtrosEspecie, setFiltrosEspecie] = useState<string[]>([]);
  const [filtrosLinea, setFiltrosLinea] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<DockTab>('consumos');
  const [periodoLabel, setPeriodoLabel] = useState('');
  const [unitMode, setUnitMode] = useState<'m3' | 'pt'>('m3');
  const importRef = useRef<HTMLInputElement>(null as unknown as HTMLInputElement);

  // ── File parsing ──────────────────────────────────────── 
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

      // Extrae período real del encabezado (fila 4, índice 3)
      // Busca patrón de fecha "dd/mm/aaaa - dd/mm/aaaa", no la etiqueta PERIODO(DIA/MES/AÑO)
      try {
        const rowPeriodo = raw[3] as any[];
        if (rowPeriodo) {
          const txt = rowPeriodo.find(
            (c: any) => typeof c === 'string' && /\d{2}\/\d{2}\/\d{4}/.test(c)
          );
          if (txt) setPeriodoLabel(String(txt).trim());
        }
      } catch { /* silencioso */ }

      const rows = raw.slice(7); // Filas de datos empiezan en fila 8 (índice 7)

      const filasLimpias: FilaProduccion[] = rows.map((fila: any[]) => {
        if (!fila || fila.length === 0) return null;
        const loteRaw = String(fila[0] || '').trim();
        if (!loteRaw) return null;
        const partes = loteRaw.split('-');
        let anio = '', loteEstandarizado = loteRaw;
        if (partes.length === 2) {
          anio = partes[1];
          loteEstandarizado = `${partes[0].padStart(3, '0')}-${anio}`;
        }
        return {
          loteOriginal: loteRaw,
          loteEstandarizado,
          anio,
          especie: String(fila[2] || 'Desconocida').trim(),        // Col C: Nombre común
          especieCientifica: String(fila[3] || '').trim(),          // Col D: Nombre científico
          consumoM3: limpiarNum(fila[5]),                           // Col F: Consumo (A)
          lineaProduccion: String(fila[6] || 'N/A').toUpperCase().trim(), // Col G: LP / LRE
          produccionM3: limpiarNum(fila[8]),                        // Col I: Producción (B)
          reprocesoM3: limpiarNum(fila[9]),                         // Col J: Reproceso (C)
          salidasM3: limpiarNum(fila[10]),                          // Col K: Salidas (D)
          saldoM3: limpiarNum(fila[11]),                            // Col L: Saldo (B-C-D)
          rendimiento: limpiarNum(String(fila[12] || '0').replace('%', '')), // Col M: Rendimiento %
        };
      }).filter(Boolean) as FilaProduccion[];

      setDatosCrudos(filasLimpias);
      // Reset input para permitir reimportar el mismo archivo
      if (importRef.current) importRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Filtrado ──────────────────────────────────────────────
  const datosFiltrados = useMemo(() =>
    datosCrudos.filter(d =>
      (filtrosAnio.length === 0 || filtrosAnio.includes(d.anio)) &&
      (filtrosLote.length === 0 || filtrosLote.includes(d.loteEstandarizado)) &&
      (filtrosEspecie.length === 0 || filtrosEspecie.includes(d.especie)) &&
      (filtrosLinea.length === 0 || filtrosLinea.includes(d.lineaProduccion))
    ).sort((a, b) => ordenarLotes(a.loteEstandarizado, b.loteEstandarizado)),
    [datosCrudos, filtrosAnio, filtrosLote, filtrosEspecie, filtrosLinea]
  );

  // ── Agrupación por lote ────────────────────────────────── 
  const datosAgrupados = useMemo<LoteAgrupado[]>(() => {
    const map = new Map<string, LoteAgrupado>();

    datosFiltrados.forEach(f => {
      if (!map.has(f.loteEstandarizado)) {
        map.set(f.loteEstandarizado, {
          loteEstandarizado: f.loteEstandarizado, anio: f.anio, especie: f.especie,
          consumoTotalM3: 0, produccionTotalM3: 0, produccionLP: 0, produccionLRE: 0,
          reprocesoTotal: 0, salidasTotal: 0, saldoTotal: 0,
          rendimientoGlobal: 0, rendimientoLP: 0, rendimientoLRE: 0,
          consumosUnicos: new Set<number>(), estadoLote: 'en_proceso',
        });
      }
      const lote = map.get(f.loteEstandarizado)!;
      // Consumo: deduplicar por línea (mismo tronco para LP y LRE)
      if (!lote.consumosUnicos.has(f.consumoM3)) {
        lote.consumoTotalM3 += f.consumoM3;
        lote.consumosUnicos.add(f.consumoM3);
      }
      lote.produccionTotalM3 += f.produccionM3;
      lote.reprocesoTotal += f.reprocesoM3;
      lote.salidasTotal += f.salidasM3;
      lote.saldoTotal += f.saldoM3;
      if (f.lineaProduccion === 'LP') lote.produccionLP += f.produccionM3;
      if (f.lineaProduccion === 'LRE') lote.produccionLRE += f.produccionM3;
    });

    return Array.from(map.values()).map(l => {
      const c = l.consumoTotalM3;
      const estado: LoteAgrupado['estadoLote'] =
        l.saldoTotal < -0.001 ? 'deficit' : l.saldoTotal < 0.001 ? 'cerrado' : 'en_proceso';
      return {
        ...l,
        rendimientoGlobal: c > 0 ? (l.produccionTotalM3 / c) * 100 : 0,
        rendimientoLP: c > 0 ? (l.produccionLP / c) * 100 : 0,
        rendimientoLRE: c > 0 ? (l.produccionLRE / c) * 100 : 0,
        estadoLote: estado,
      };
    }).sort((a, b) => ordenarLotes(a.loteEstandarizado, b.loteEstandarizado));
  }, [datosFiltrados]);

  // ── Opciones de filtros (interdependientes) ───────────────
  const aniosDisp = useMemo(() =>
    [...new Set(datosCrudos.filter(d =>
      (filtrosLote.length === 0 || filtrosLote.includes(d.loteEstandarizado)) &&
      (filtrosEspecie.length === 0 || filtrosEspecie.includes(d.especie)) &&
      (filtrosLinea.length === 0 || filtrosLinea.includes(d.lineaProduccion))
    ).map(d => d.anio))].sort(),
    [datosCrudos, filtrosLote, filtrosEspecie, filtrosLinea]);

  const lotesDisp = useMemo(() =>
    [...new Set(datosCrudos.filter(d =>
      (filtrosAnio.length === 0 || filtrosAnio.includes(d.anio)) &&
      (filtrosEspecie.length === 0 || filtrosEspecie.includes(d.especie)) &&
      (filtrosLinea.length === 0 || filtrosLinea.includes(d.lineaProduccion))
    ).map(d => d.loteEstandarizado))].sort(ordenarLotes),
    [datosCrudos, filtrosAnio, filtrosEspecie, filtrosLinea]);

  const especiesDisp = useMemo(() =>
    [...new Set(datosCrudos.filter(d =>
      (filtrosAnio.length === 0 || filtrosAnio.includes(d.anio)) &&
      (filtrosLote.length === 0 || filtrosLote.includes(d.loteEstandarizado)) &&
      (filtrosLinea.length === 0 || filtrosLinea.includes(d.lineaProduccion))
    ).map(d => d.especie))].sort(),
    [datosCrudos, filtrosAnio, filtrosLote, filtrosLinea]);

  const lineasDisp = useMemo(() =>
    [...new Set(datosCrudos.filter(d =>
      (filtrosAnio.length === 0 || filtrosAnio.includes(d.anio)) &&
      (filtrosLote.length === 0 || filtrosLote.includes(d.loteEstandarizado)) &&
      (filtrosEspecie.length === 0 || filtrosEspecie.includes(d.especie))
    ).map(d => d.lineaProduccion))].sort(),
    [datosCrudos, filtrosAnio, filtrosLote, filtrosEspecie]);

  const filterState = {
    filtrosAnio, setFiltrosAnio,
    filtrosLote, setFiltrosLote,
    filtrosEspecie, setFiltrosEspecie,
    filtrosLinea, setFiltrosLinea,
    aniosDisp, lotesDisp, especiesDisp, lineasDisp,
    onLimpiar: () => { setFiltrosAnio([]); setFiltrosLote([]); setFiltrosEspecie([]); setFiltrosLinea([]); },
  };

  const viewProps: ViewProps = {
    datos: datosFiltrados,
    agrupados: datosAgrupados,
    hasData: datosCrudos.length > 0,
    unitMode,
  };

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onImport={handleFileUpload}
      importRef={importRef}
      hasData={datosCrudos.length > 0}
      periodoLabel={periodoLabel}
      filters={filterState}
      unitMode={unitMode}
      onUnitModeChange={setUnitMode}
    >
      {activeTab === 'consumos' && <ConsumoView     {...viewProps} />}
      {activeTab === 'produccion' && <ProduccionView   {...viewProps} />}
      {activeTab === 'rendimientos' && <RendimientosView {...viewProps} />}
      {activeTab === 'salidas' && <SalidasView      {...viewProps} />}
      {activeTab === 'saldos' && <SaldosView       {...viewProps} />}
    </AppShell>
  );
}