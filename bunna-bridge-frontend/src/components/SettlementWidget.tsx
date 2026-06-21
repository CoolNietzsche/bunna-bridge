import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { calculateSettlement } from '../api/settlement';
import type { SettlementResult } from '../api/settlement';
import { DollarSign, ArrowRightLeft, Landmark, RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  lotId: string;
  lotRef: string;
  defaultUsd?: number;
}

export default function SettlementWidget({ lotId, lotRef, defaultUsd }: Props) {
  const [inputUsd, setInputUsd] = useState(defaultUsd ? defaultUsd.toFixed(2) : '');
  const [result, setResult]     = useState<SettlementResult | null>(null);
  const [nbeRate, setNbeRate]   = useState('59.85');

  const mutation = useMutation({
    mutationFn: () => calculateSettlement(lotId, parseFloat(inputUsd)),
    onSuccess: (data) => setResult(data),
    onError:   (err)  => console.error("Settlement error:", err),
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
    <div style={{
      background: '#FFFFFF', border: '1px solid rgba(28,28,26,0.08)',
      borderRadius: '6px', padding: '20px',
      fontFamily: 'Instrument Sans, sans-serif',
      boxShadow: '0 1px 3px rgba(28,28,26,0.06)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '4px',
          background: '#F5EDE4', border: '1px solid rgba(123,75,42,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Landmark size={15} color="#7B4B2A" />
        </div>
        <div>
          <p style={{ color: '#1C1C1A', fontWeight: 600, fontSize: '14px', margin: 0 }}>NBE Settlement Calculator</p>
          <p style={{ color: 'rgba(28,28,26,0.4)', fontSize: '11px', fontFamily: 'DM Mono, monospace', letterSpacing: '0.05em', margin: '2px 0 0' }}>
            LOT {lotRef} · 50/50 USD/ETB SPLIT
          </p>
        </div>
      </div>

      {/* USD Input */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            color: '#7B4B2A', fontFamily: 'DM Mono, monospace', fontSize: '13px',
          }}>$</span>
          <input
            type="number"
            placeholder="Enter total contract value (USD)"
            value={inputUsd}
            onChange={e => { setInputUsd(e.target.value); setResult(null); }}
            onKeyDown={e => e.key === 'Enter' && handleCalculate()}
            style={{
              width: '100%', background: '#FFFFFF',
              border: '1px solid rgba(28,28,26,0.15)', borderRadius: '4px',
              padding: '9px 10px 9px 24px', color: '#1C1C1A',
              fontSize: '13px', fontFamily: 'DM Mono, monospace', outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = '#1B4D35'; e.target.style.boxShadow = '0 0 0 3px rgba(27,77,53,0.08)'; }}
            onBlur={e  => { e.target.style.borderColor = 'rgba(28,28,26,0.15)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <button
          onClick={handleCalculate}
          disabled={isDisabled}
          style={{
            background: isDisabled ? 'rgba(28,28,26,0.06)' : '#1B4D35',
            color: isDisabled ? 'rgba(28,28,26,0.3)' : '#FFFFFF',
            border: 'none', borderRadius: '4px', padding: '9px 16px',
            fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: '12px',
            letterSpacing: '0.08em', cursor: isDisabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
        >
          {mutation.isPending
            ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Calculating</>
            : <><ArrowRightLeft size={13} /> Calculate</>}
        </button>
      </div>

      {/* NBE Rate */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'rgba(28,28,26,0.4)', letterSpacing: '0.08em' }}>
          NBE RATE (ETB/USD)
        </span>
        <input
          type="number"
          value={nbeRate}
          onChange={e => setNbeRate(e.target.value)}
          style={{
            width: '90px', background: '#FFFFFF',
            border: '1px solid rgba(28,28,26,0.12)', borderRadius: '4px',
            padding: '4px 8px', color: '#7B4B2A',
            fontFamily: 'DM Mono, monospace', fontSize: '12px', outline: 'none',
          }}
        />
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'rgba(28,28,26,0.25)' }}>
          Default: 59.85
        </span>
      </div>

      {/* Error */}
      {mutation.isError && (
        <div style={{
          background: '#FDECEA', border: '1px solid rgba(192,57,43,0.2)',
          borderRadius: '4px', padding: '10px 12px', color: '#C0392B',
          fontSize: '12px', marginBottom: '12px',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontFamily: 'DM Mono, monospace',
        }}>
          <AlertCircle size={14} /> Failed to calculate. Check connection and try again.
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <div style={{ borderTop: '1px solid rgba(28,28,26,0.08)', margin: '4px 0 12px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(28,28,26,0.06)' }}>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'rgba(28,28,26,0.4)' }}>Gross Contract Value</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#4A4A45' }}>${fmt(result.total_usd)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(28,28,26,0.06)', marginBottom: '12px' }}>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'rgba(28,28,26,0.4)' }}>Platform Fee (2.5%)</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#C0392B' }}>− ${fmt((result as any).platform_fee ?? result.total_usd * 0.025)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ color: 'rgba(28,28,26,0.5)', fontSize: '12px' }}>Net Export Value</span>
            <span style={{ color: '#1C1C1A', fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>${fmt((result as any).net_usd ?? result.total_usd * 0.975)}</span>
          </div>

          {/* USD Retained */}
          <div style={{
            background: '#E8F2EC', border: '1px solid rgba(27,77,53,0.2)',
            borderRadius: '4px', padding: '12px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={14} color="#1B4D35" />
              <div>
                <p style={{ color: '#1B4D35', fontSize: '12px', fontWeight: 600, margin: 0 }}>USD Retained (50%)</p>
                <p style={{ color: 'rgba(27,77,53,0.5)', fontSize: '11px', margin: '2px 0 0' }}>Stays in your CBE forex account</p>
              </div>
            </div>
            <span style={{ color: '#1B4D35', fontFamily: 'DM Mono, monospace', fontSize: '18px', fontWeight: 700 }}>
              ${fmt(result.usd_retained)}
            </span>
          </div>

          {/* ETB Converted */}
          <div style={{
            background: '#F5EDE4', border: '1px solid rgba(123,75,42,0.2)',
            borderRadius: '4px', padding: '12px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowRightLeft size={14} color="#7B4B2A" />
              <div>
                <p style={{ color: '#7B4B2A', fontSize: '12px', fontWeight: 600, margin: 0 }}>ETB Converted (50%)</p>
                <p style={{ color: 'rgba(123,75,42,0.5)', fontSize: '11px', margin: '2px 0 0' }}>@ {result.nbe_rate} ETB/USD · NBE official rate</p>
              </div>
            </div>
            <span style={{ color: '#7B4B2A', fontFamily: 'DM Mono, monospace', fontSize: '18px', fontWeight: 700 }}>
              {fmt(result.etb_converted, 0)} ETB
            </span>
          </div>

          <p style={{ textAlign: 'center', color: 'rgba(28,28,26,0.25)', fontSize: '10px', fontFamily: 'DM Mono, monospace', marginTop: '10px' }}>
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
