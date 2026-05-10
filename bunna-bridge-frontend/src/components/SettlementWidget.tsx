import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { calculateSettlement } from '../api/settlement';
import type { SettlementResult } from '../api/settlement';
import { DollarSign, ArrowRightLeft, Landmark, RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  lotId: string;
  lotRef: string;
  defaultUsd?: number;  // pre-fill from lot price * volume
}

export default function SettlementWidget({ lotId, lotRef, defaultUsd }: Props) {
  const [inputUsd, setInputUsd] = useState(defaultUsd ? defaultUsd.toFixed(2) : '');
  const [result, setResult]     = useState<SettlementResult | null>(null);
  const [nbeRate, setNbeRate]   = useState('59.85');

  const mutation = useMutation({
    mutationFn: () => calculateSettlement(lotId, parseFloat(inputUsd)),
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err) => {
      console.error("Settlement error:", err);
    },
  });

  const handleCalculate = () => {
    const val = parseFloat(inputUsd);
    if (!inputUsd || isNaN(val) || val <= 0) return;
    setResult(null);
    mutation.mutate();
  };

  const fmt = (n: number, decimals = 2) =>
    n?.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) ?? '—';

  const S = {
    wrap: {
      background: '#2C1810',
      border: '1px solid rgba(201,149,42,0.2)',
      borderRadius: '4px',
      padding: '20px',
      fontFamily: 'Instrument Sans, sans-serif',
    },
    header: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
    iconBox: {
      width: '32px', height: '32px', borderRadius: '2px',
      background: 'rgba(201,149,42,0.12)', border: '1px solid rgba(201,149,42,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    title: { color: '#F5EDD8', fontWeight: 600, fontSize: '14px', margin: 0 },
    subtitle: { color: 'rgba(245,237,216,0.4)', fontSize: '11px', fontFamily: 'DM Mono, monospace', letterSpacing: '0.05em', margin: '2px 0 0' },
    row: { display: 'flex', gap: '8px', marginBottom: '12px' },
    inputWrap: { flex: 1, position: 'relative' as const },
    prefix: {
      position: 'absolute' as const, left: '10px', top: '50%',
      transform: 'translateY(-50%)',
      color: '#C9952A', fontFamily: 'DM Mono, monospace', fontSize: '13px',
    },
    input: {
      width: '100%', background: '#1A0F07',
      border: '1px solid rgba(245,237,216,0.12)',
      borderRadius: '2px', padding: '9px 10px 9px 24px',
      color: '#F5EDD8', fontSize: '13px',
      fontFamily: 'DM Mono, monospace', outline: 'none',
      boxSizing: 'border-box' as const,
    },
    calcBtn: (disabled: boolean) => ({
      background: disabled ? 'rgba(245,237,216,0.06)' : '#C9952A',
      color: disabled ? 'rgba(245,237,216,0.3)' : '#1A0F07',
      border: 'none', borderRadius: '2px', padding: '9px 16px',
      fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: '12px',
      letterSpacing: '0.08em', cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' as const,
      transition: 'all 0.2s',
    }),
    rateRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' },
    rateLabel: { fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'rgba(245,237,216,0.35)', letterSpacing: '0.08em' },
    rateInput: {
      width: '90px', background: '#1A0F07',
      border: '1px solid rgba(245,237,216,0.08)',
      borderRadius: '2px', padding: '4px 8px',
      color: '#C9952A', fontFamily: 'DM Mono, monospace', fontSize: '12px', outline: 'none',
    },
    err: {
      background: 'rgba(193,68,14,0.12)', border: '1px solid rgba(193,68,14,0.3)',
      borderRadius: '2px', padding: '10px 12px',
      color: '#C1440E', fontSize: '12px', marginBottom: '12px',
      display: 'flex', alignItems: 'center', gap: '8px',
      fontFamily: 'DM Mono, monospace',
    },
    divider: { borderTop: '1px solid rgba(245,237,216,0.06)', margin: '4px 0 12px' },
    totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    totalLabel: { color: 'rgba(245,237,216,0.45)', fontSize: '12px' },
    totalVal: { color: '#F5EDD8', fontFamily: 'DM Mono, monospace', fontSize: '13px' },
    splitBox: (bg: string, border: string) => ({
      background: bg, border: `1px solid ${border}`,
      borderRadius: '2px', padding: '12px 14px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '8px',
    }),
    splitLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
    splitLabel: (color: string) => ({ color, fontSize: '12px', fontWeight: 600, margin: 0 }),
    splitDesc: { color: 'rgba(245,237,216,0.4)', fontSize: '11px', margin: '2px 0 0' },
    splitVal: (color: string) => ({
      color, fontFamily: 'DM Mono, monospace', fontSize: '18px', fontWeight: 700,
    }),
    feeRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(245,237,216,0.05)' },
    feeLabel: { color: 'rgba(245,237,216,0.35)', fontSize: '11px', fontFamily: 'DM Mono, monospace' },
    feeVal: { color: 'rgba(245,237,216,0.5)', fontSize: '11px', fontFamily: 'DM Mono, monospace' },
    footer: { textAlign: 'center' as const, color: 'rgba(245,237,216,0.25)', fontSize: '10px', fontFamily: 'DM Mono, monospace', marginTop: '10px' },
  };

  const isDisabled = mutation.isPending || !inputUsd || isNaN(parseFloat(inputUsd));

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.iconBox}><Landmark size={15} color="#C9952A" /></div>
        <div>
          <p style={S.title}>NBE Settlement Calculator</p>
          <p style={S.subtitle}>LOT {lotRef} · 50/50 USD/ETB SPLIT</p>
        </div>
      </div>

      {/* USD Input */}
      <div style={S.row}>
        <div style={S.inputWrap}>
          <span style={S.prefix}>$</span>
          <input
            type="number"
            placeholder="Enter total contract value (USD)"
            value={inputUsd}
            onChange={e => { setInputUsd(e.target.value); setResult(null); }}
            onKeyDown={e => e.key === 'Enter' && handleCalculate()}
            style={S.input}
          />
        </div>
        <button onClick={handleCalculate} disabled={isDisabled} style={S.calcBtn(isDisabled)}>
          {mutation.isPending
            ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Calculating</>
            : <><ArrowRightLeft size={13} /> Calculate</>}
        </button>
      </div>

      {/* NBE Rate override */}
      <div style={S.rateRow}>
        <span style={S.rateLabel}>NBE RATE (ETB/USD)</span>
        <input
          type="number"
          value={nbeRate}
          onChange={e => setNbeRate(e.target.value)}
          style={S.rateInput}
        />
        <span style={{ ...S.rateLabel, opacity: 0.4 }}>Default: 59.85</span>
      </div>

      {/* Error */}
      {mutation.isError && (
        <div style={S.err}>
          <AlertCircle size={14} />
          Failed to calculate. Check connection and try again.
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <div style={S.divider} />

          {/* Fee breakdown */}
          <div style={S.feeRow}>
            <span style={S.feeLabel}>Gross Contract Value</span>
            <span style={S.feeVal}>${fmt(result.total_usd)}</span>
          </div>
          <div style={{ ...S.feeRow, marginBottom: '12px' }}>
            <span style={S.feeLabel}>Platform Fee (2.5%)</span>
            <span style={{ ...S.feeVal, color: '#C1440E' }}>− ${fmt((result as any).platform_fee ?? result.total_usd * 0.025)}</span>
          </div>

          <div style={S.totalRow}>
            <span style={S.totalLabel}>Net Export Value</span>
            <span style={S.totalVal}>${fmt((result as any).net_usd ?? result.total_usd * 0.975)}</span>
          </div>

          {/* USD Retained */}
          <div style={S.splitBox('rgba(30,58,47,0.3)', 'rgba(74,124,89,0.3)')}>
            <div style={S.splitLeft}>
              <DollarSign size={14} color="#4A7C59" />
              <div>
                <p style={S.splitLabel('#A8C5A0')}>USD Retained (50%)</p>
                <p style={S.splitDesc}>Stays in your CBE forex account</p>
              </div>
            </div>
            <span style={S.splitVal('#A8C5A0')}>${fmt(result.usd_retained)}</span>
          </div>

          {/* ETB Converted */}
          <div style={S.splitBox('rgba(201,149,42,0.08)', 'rgba(201,149,42,0.2)')}>
            <div style={S.splitLeft}>
              <ArrowRightLeft size={14} color="#C9952A" />
              <div>
                <p style={S.splitLabel('#C9952A')}>ETB Converted (50%)</p>
                <p style={S.splitDesc}>@ {result.nbe_rate} ETB/USD · NBE official rate</p>
              </div>
            </div>
            <span style={S.splitVal('#C9952A')}>{fmt(result.etb_converted, 0)} ETB</span>
          </div>

          <p style={S.footer}>
            NBE Directive FXD/53/2021 · Calculated {new Date(result.calculated_at).toLocaleString()}
          </p>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  );
}
