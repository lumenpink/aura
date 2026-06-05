import React, { useState } from 'react';
import { Logo } from '@aura/ui';

interface AppProps {
  tenantId?: string;
  patientCpf?: string;
  accessToken?: string;
  onSuccess?: (recipeId: string, payloadHash: string) => void;
}

// Helper to canonically sort payload keys recursively
function deepSortObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepSortObject);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: any = {};
  for (const key of sortedKeys) {
    result[key] = deepSortObject(obj[key]);
  }
  return result;
}

// Simple browser-compatible SHA-256 simulation (in real it would use SubtleCrypto)
function simulateSha256(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `SHA256_HASH_${hex.toUpperCase()}_CANONICAL`;
}

export const App: React.FC<AppProps> = ({
  tenantId = 'dev-silo',
  patientCpf = '123.456.789-00',
  accessToken = '',
  onSuccess,
}) => {
  const [medicationName, setMedicationName] = useState('');
  const [concentration, setConcentration] = useState('');
  const [dosageForm, setDosageForm] = useState('comprimido');
  const [quantity, setQuantity] = useState('1 caixa');
  const [instructions, setInstructions] = useState('');
  const [prescriptionType, setPrescriptionType] = useState('comum');
  const [status, setStatus] = useState<'idle' | 'generating' | 'ready_to_sign' | 'signed'>('idle');
  const [lastRecipeId, setLastRecipeId] = useState('');
  const [lastHash, setLastHash] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicationName || !instructions) {
      alert('Por favor, preencha o nome do medicamento e as instruções.');
      return;
    }

    setStatus('generating');

    setTimeout(() => {
      const recipeId = `recipe-${Math.floor(100000 + Math.random() * 900000)}`;
      
      // Construct canonical payload
      const payload = {
        version: "1.0.0",
        prescriptionId: recipeId,
        issuedAt: new Date().toISOString(),
        tenantId,
        patientCpf,
        prescriptionType,
        items: [
          {
            medicationName,
            concentration,
            dosageForm,
            quantity,
            instructions
          }
        ]
      };

      const sortedPayload = deepSortObject(payload);
      const canonicalString = JSON.stringify(sortedPayload);
      const hash = simulateSha256(canonicalString);

      setLastRecipeId(recipeId);
      setLastHash(hash);
      setStatus('ready_to_sign');

      if (onSuccess) {
        onSuccess(recipeId, hash);
      }
    }, 1200);
  };

  const handleReset = () => {
    setMedicationName('');
    setConcentration('');
    setQuantity('1 caixa');
    setInstructions('');
    setStatus('idle');
  };

  return (
    <div style={{
      padding: '24px',
      background: '#ffffff',
      color: '#18181b',
      borderRadius: '16px',
      border: '1px solid #e4e4e7',
      boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
      maxWidth: '520px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #f4f4f5', paddingBottom: '12px' }}>
        <Logo size="small" />
        <div>
          <h3 style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: '#7c3aed' }}>Aura Pulso</h3>
          <p style={{ margin: 0, fontSize: '11px', color: '#71717a' }}>Emissão e Gestão de Prescrições Inteligentes</p>
        </div>
      </div>

      {status === 'idle' && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#71717a', textTransform: 'uppercase', marginBottom: '6px' }}>
              Paciente Vinculado (CPF)
            </label>
            <input
              type="text"
              value={patientCpf}
              disabled
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #e4e4e7',
                background: '#f4f4f5',
                color: '#71717a',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#71717a', textTransform: 'uppercase', marginBottom: '6px' }}>
                Tipo de Receituário
              </label>
              <select
                value={prescriptionType}
                onChange={(e) => setPrescriptionType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e4e4e7',
                  background: '#fff',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="comum">Comum (Simples)</option>
                <option value="controle_especial_branco">Controle Especial (Duas Vias)</option>
                <option value="azul_b1_b2">B1/B2 Notificação (Azul)</option>
                <option value="amarelo_a">A Notificação (Amarela)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#71717a', textTransform: 'uppercase', marginBottom: '6px' }}>
                Quantidade
              </label>
              <input
                type="text"
                placeholder="Ex: 1 caixa, 2 frascos"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e4e4e7',
                  background: '#fff',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#71717a', textTransform: 'uppercase', marginBottom: '6px' }}>
                Medicamento / Princípio Ativo
              </label>
              <input
                type="text"
                placeholder="Ex: Clonazepam, Amoxicilina"
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e4e4e7',
                  background: '#fff',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#71717a', textTransform: 'uppercase', marginBottom: '6px' }}>
                Concentração
              </label>
              <input
                type="text"
                placeholder="Ex: 2mg, 500mg"
                value={concentration}
                onChange={(e) => setConcentration(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e4e4e7',
                  background: '#fff',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#71717a', textTransform: 'uppercase', marginBottom: '6px' }}>
              Posologia & Orientação de Uso
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Tomar 1 comprimido à noite antes de dormir..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #e4e4e7',
                background: '#fff',
                fontSize: '13px',
                fontFamily: 'inherit',
                resize: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              color: '#fff',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              marginTop: '8px',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)'
            }}
          >
            Gerar Rascunho da Receita
          </button>
        </form>
      )}

      {status === 'generating' && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '3px solid #7c3aed',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px auto'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <span style={{ fontSize: '13px', color: '#71717a' }}>Ordenando propriedades e gerando hash canônico do payload...</span>
        </div>
      )}

      {status === 'ready_to_sign' && (
        <div style={{ padding: '16px 8px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#fff7ed',
            border: '2px solid #f97316',
            color: '#f97316',
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '12px'
          }}>
            ✍
          </div>
          <h4 style={{ margin: '0 0 8px 0', color: '#ea580c' }}>Aguardando Assinatura ICP-Brasil</h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#71717a', lineHeight: '1.5' }}>
            O rascunho <strong>{lastRecipeId}</strong> foi criado com sucesso. Por favor, utilize o painel de Assinatura Digital ao lado para selar a receita com o certificado médico.
          </p>
          <div style={{
            background: '#f4f4f5',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#71717a',
            textAlign: 'left',
            marginBottom: '16px',
            wordBreak: 'break-all'
          }}>
            <strong>Hash do Payload:</strong><br />
            {lastHash}
          </div>
          <button
            onClick={handleReset}
            style={{
              padding: '8px 16px',
              background: '#fff',
              border: '1px solid #e4e4e7',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Criar Outra Receita
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
