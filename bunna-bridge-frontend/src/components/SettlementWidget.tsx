import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { calculateSettlement } from '../api/settlement';
import type { SettlementResult } from '../api/settlement';
import { DollarSign, ArrowRightLeft, Landmark, RefreshCw, AlertCircle } from 'lucide-react';
import { AT } from '../styles/adminTokens';
import { AC } from '../styles/adminComponents';

interface Props {
  lotId: string;
  lotRef: string;
  defaultUsd?: number;
}

export default function SettlementWidget({ lotId, lotRef, defaultUsd }: Props) {
  const [inputUsd, setInputUsd] = useState(defaultUsd ? defaultUsd.toFixed(2) : '');
  const [result, setResult] = useState<SettlementResult | null>(null);
  const [nbeRate, setNbeRate] = useState('59.85');

  const mutation = useMutation({
    mutationFn: () => calculateSettlement(lotId, parseFloat(inputUsd)),
    onSuccess: (data) => setResult(data),
    onError: (err) => console.error("Settlement error:", err),
  });

  const handleCalculate = () => {
    const val = parseFloat(inputUsd);
    if (!inputUsd || isNaN(val) || val <= 0) return;
    setResult(null);
    mutation.mutate();
  };

  const fmt = (n: number, decimals = 2) =>
    n?.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) ?? '—';

  const isDisabled = mutation.isPending || !inputUsd || isNaN(parseFloat(inputUsd));

  return (
    <div style={{ background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.md, padding: '20px', fontFamily: AT.font.sans }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: AT.radius.sm,
          background: AT.color.primaryLight, border: `1px solid ${AT.color.primary}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Landmark size={15} color={AT.color.primaryDark} />
        </div>
        <div>
          <p style={{ color: AT.color.text, fontWeight: 600, fontSize: '14px', margin: 0 }}>NBE Settlement Calculator</p>
          <p style={{ color: AT.color.textDisabled, fontSize: '11px', fontFamily: AT.font.mono, letterSpacing: '0.05em', margin: '2px 0 0' }}>
            LOT {lotRef} · 50/50 USD/ETB SPLIT
          </p>
        </div>
      </div>

      <div className="sw-row" style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '160px' }}>
          <span style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            color: AT.color.primaryDark, fontFamily: AT.font.mono, fontSize: '13px',
          }}>$</span>
          <input
            type="number"
            placeholder="Enter total contract value (USD)"
            value={inputUsd}
            onChange={(e) => { setInputUsd(e.target.value); setResult(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
            style={{ ...AC.input, padding: '9px 10px 9px 24px', fontFamily: AT.font.mono }}
          />
        </div>
        <button onClick={handleCalculate} disabled={isDisabled} style={{ ...AC.btnPrimary, opacity: isDisabled ? 0.5 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
          {mutation.isPending
            ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Calculating</>
            : <><ArrowRightLeft size={13} /> Calculate</>}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: AT.font.sans, fontSize: '0.68rem', color: AT.color.textDisabled, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          NBE Rate (ETB/USD)
        </span>
        <input
          type="number"
          value={nbeRate}
          onChange={(e) => setNbeRate(e.target.value)}
          style={{ ...AC.input, width: '90px', color: AT.color.primaryDark, fontFamily: AT.font.mono, fontSize: '12px', padding: '4px 8px' }}
        />
        <span style={{ fontFamily: AT.font.sans, fontSize: '0.68rem', color: AT.color.textDisabled }}>
          Default: 59.85
        </span>
      </div>

      {mutation.isError && (
        <div style={{
          background: AT.color.redLight, border: `1px solid ${AT.color.red}33`,
          borderRadius: AT.radius.sm, padding: '10px 12px', color: AT.color.red,
          fontSize: '12px', marginBottom: '12px',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontFamily: AT.font.sans,
        }}>
          <AlertCircle size={14} /> Failed to calculate. Check connection and try again.
        </div>
      )}

      {result && (
        <>
          <div style={{ borderTop: `1px solid ${AT.color.border}`, margin: '4px 0 12px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${AT.color.borderLight}` }}>
            <span style={{ fontFamily: AT.font.sans, fontSize: '0.72rem', color: AT.color.textDisabled }}>Gross Contract Value</span>
            <span style={{ fontFamily: AT.font.mono, fontSize: '0.72rem', color: AT.color.textSecondary }}>${fmt(result.total_usd)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${AT.color.borderLight}`, marginBottom: '12px' }}>
            <span style={{ fontFamily: AT.font.sans, fontSize: '0.72rem', color: AT.color.textDisabled }}>Platform Fee (2.5%)</span>
            <span style={{ fontFamily: AT.font.mono, fontSize: '0.72rem', color: AT.color.red }}>− ${fmt((result as any).platform_fee ?? result.total_usd * 0.025)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ color: AT.color.textMuted, fontSize: '0.78rem', fontFamily: AT.font.sans }}>Net Export Value</span>
            <span style={{ color: AT.color.text, fontFamily: AT.font.mono, fontSize: '0.82rem' }}>${fmt((result as any).net_usd ?? result.total_usd * 0.975)}</span>
          </div>

          <div style={{
            background: AT.color.primaryLight, border: `1px solid ${AT.color.primary}33`,
            borderRadius: AT.radius.sm, padding: '12px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={14} color={AT.color.primaryDark} />
              <div>
                <p style={{ color: AT.color.primaryDark, fontSize: '0.78rem', fontWeight: 600, margin: 0 }}>USD Retained (50%)</p>
                <p style={{ color: AT.color.primaryDark, opacity: 0.7, fontSize: '0.68rem', margin: '2px 0 0' }}>Stays in your CBE forex account</p>
              </div>
            </div>
            <span style={{ color: AT.color.primaryDark, fontFamily: AT.font.mono, fontSize: '1.1rem', fontWeight: 700 }}>
              ${fmt(result.usd_retained)}
            </span>
          </div>

          <div style={{
            background: AT.color.yellowLight, border: `1px solid ${AT.color.yellow}33`,
            borderRadius: AT.radius.sm, padding: '12px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowRightLeft size={14} color="#b45309" />
              <div>
                <p style={{ color: '#b45309', fontSize: '0.78rem', fontWeight: 600, margin: 0 }}>ETB Converted (50%)</p>
                <p style={{ color: '#b45309', opacity: 0.7, fontSize: '0.68rem', margin: '2px 0 0' }}>@ {result.nbe_rate} ETB/USD · NBE official rate</p>
              </div>
            </div>
            <span style={{ color: '#b45309', fontFamily: AT.font.mono, fontSize: '1.1rem', fontWeight: 700 }}>
              {fmt(result.etb_converted, 0)} ETB
            </span>
          </div>

          <p style={{ textAlign: 'center', color: AT.color.textDisabled, fontSize: '0.62rem', fontFamily: AT.font.sans, marginTop: '10px' }}>
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
