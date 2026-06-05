import React, { useState } from 'react';
import { Logo } from '@aura/ui';

interface AppProps {
  tenantId?: string;
  doctorCpf?: string;
  doctorCrm?: string;
  doctorCrmUf?: string;
  documentHash?: string;
  accessToken?: string;
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
}

export const App: React.FC<AppProps> = ({
  tenantId = 'dev-silo',
  doctorCpf = '123.456.789-00',
  doctorCrm = '123456',
  doctorCrmUf = 'SP',
  documentHash = '',
  accessToken = '',
  onSuccess,
  onError,
}) => {
  const [selectedCert, setSelectedCert] = useState('a1');
  const [signingStatus, setSigningStatus] = useState<'idle' | 'signing' | 'success' | 'failed'>('idle');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const certificates = [
    { id: 'a1', name: 'Certificado Digital A1 (Nuvem / Arquivo)', details: `CFM / ICP-Brasil • CPF: ${doctorCpf} • CRM-${doctorCrmUf}: ${doctorCrm}`, status: 'valid' },
    { id: 'a3', name: 'Token/Smartcard A3 (USB)', details: 'Aguardando inserção do dispositivo físico...', status: 'disconnected' }
  ];

  const handleSign = () => {
    if (selectedCert === 'a3') {
      alert('Por favor, insira o Token USB para prosseguir com a assinatura A3.');
      return;
    }
    
    // Simulate PIN authorization if using A1 (optional simulation for realism)
    setSigningStatus('signing');
    setPinError(false);

    // Simulate cryptographic processing time
    setTimeout(() => {
      // Generate a mock SHA-256 PKCS#7 envelope signature
      const randomHex = Array.from({ length: 32 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      const mockSignature = `CMS_PKCS7_ICP_BRASIL_SIGNATURE_${randomHex.toUpperCase()}`;

      setSigningStatus('success');
      
      if (onSuccess) {
        onSuccess(mockSignature);
      }
    }, 1800);
  };

  return (
    <div style={{
      padding: '24px',
      background: '#18181b', // sleek dark theme
      color: '#f4f4f5',
      borderRadius: '16px',
      border: '1px solid #27272a',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      maxWidth: '480px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Logo size="small" />
        <div>
          <h3 style={{ margin: 0, fontWeight: 500, fontSize: '15px', color: '#a78bfa' }}>Aura Traço</h3>
          <p style={{ margin: 0, fontSize: '11px', color: '#a1a1aa' }}>Assinatura Digital de Prontuários (ICP-Brasil)</p>
        </div>
      </div>

      {/* Document details box */}
      <div style={{
        background: '#27272a',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '12px',
        lineHeight: '1.6',
        marginBottom: '20px',
        borderLeft: '4px solid #8b5cf6'
      }}>
        <div style={{ fontWeight: '600', color: '#e4e4e7', marginBottom: '4px' }}>Especificações da Transação:</div>
        <div><strong>Clínica/Silo:</strong> {tenantId}</div>
        <div><strong>Médico Prescritor:</strong> CRM-{doctorCrmUf} {doctorCrm}</div>
        <div style={{
          display: 'block',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          fontFamily: 'monospace',
          color: '#a1a1aa',
          marginTop: '4px'
        }}>
          <strong>Hash MD5/SHA256:</strong> {documentHash || 'Aguardando hash de documento...'}
        </div>
      </div>

      {signingStatus === 'idle' && (
        <>
          {/* Certificate Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#a1a1aa', marginBottom: '8px' }}>
              Selecione o Certificado Digital:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {certificates.map(cert => (
                <div
                  key={cert.id}
                  onClick={() => cert.status === 'valid' && setSelectedCert(cert.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: selectedCert === cert.id ? '#312e81' : '#27272a',
                    border: selectedCert === cert.id ? '1px solid #6366f1' : '1px solid #3f3f46',
                    cursor: cert.status === 'valid' ? 'pointer' : 'not-allowed',
                    opacity: cert.status === 'valid' ? 1 : 0.55,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{cert.name}</span>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: cert.status === 'valid' ? '#10b981' : '#f59e0b'
                    }} />
                  </div>
                  <div style={{ fontSize: '11px', color: '#a1a1aa' }}>{cert.details}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handleSign}
            disabled={!documentHash}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: documentHash ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' : '#3f3f46',
              color: '#fff',
              fontWeight: '600',
              fontSize: '13px',
              cursor: documentHash ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              boxShadow: documentHash ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none'
            }}
          >
            {documentHash ? 'Assinar Digitalmente' : 'Aguardando Documento...'}
          </button>
        </>
      )}

      {signingStatus === 'signing' && (
        <div style={{
          textAlign: 'center',
          padding: '30px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* Pulsing indicator */}
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid #8b5cf6',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <div>
            <h4 style={{ margin: '0 0 6px 0', fontWeight: '500' }}>Conectando à autoridade de registro...</h4>
            <p style={{ margin: 0, fontSize: '11px', color: '#a1a1aa' }}>Criptografando payload e assinando hash privado...</p>
          </div>
        </div>
      )}

      {signingStatus === 'success' && (
        <div style={{
          textAlign: 'center',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '2px solid #10b981',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            ✓
          </div>
          <div>
            <h4 style={{ margin: '0 0 6px 0', fontWeight: '600', color: '#34d399' }}>Assinatura Efetuada!</h4>
            <p style={{ margin: 0, fontSize: '11px', color: '#a1a1aa' }}>O documento foi selado digitalmente nos padrões ICP-Brasil com sucesso.</p>
          </div>
          <button
            onClick={() => setSigningStatus('idle')}
            style={{
              marginTop: '12px',
              padding: '6px 16px',
              background: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: '6px',
              color: '#e4e4e7',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Assinar outro
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
