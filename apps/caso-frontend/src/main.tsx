import React from 'react';
import ReactDOM from 'react-dom/client';

// Simple React App wrapper for Caso/Prontuário
function App({ tenantId, patientCpf, accessToken }: { tenantId: string; patientCpf: string; accessToken: string }) {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#333' }}>
      <h2>Aura Caso — Prontuário Médico</h2>
      <p><strong>Clínica (Silo):</strong> {tenantId}</p>
      <p><strong>CPF do Paciente:</strong> {patientCpf || 'Nenhum paciente selecionado'}</p>
      <p><strong>Status de Conexão:</strong> Autenticado via M2M</p>
      
      <div style={{ marginTop: '20px', border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
        <h4>Histórico de Evoluções Clínicas (Ledger Criptográfico)</h4>
        <div style={{ color: '#666', fontSize: '14px' }}>
          [Simulação de Linha do Tempo de Evoluções Clinicas Seguras]
        </div>
      </div>
    </div>
  );
}

class AuraCasoAppElement extends HTMLElement {
  private root: ReactDOM.Root | null = null;

  static get observedAttributes() {
    return ['tenant-id', 'patient-cpf', 'access-token'];
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    container.id = 'caso-root';

    // Stylesheet inclusion
    const style = document.createElement('style');
    style.textContent = `
      #caso-root {
        background: #fdfdfd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        border: 1px solid #eaeaea;
      }
    `;

    shadow.appendChild(style);
    shadow.appendChild(container);

    this.root = ReactDOM.createRoot(container);
    this.renderReact();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue && this.root) {
      this.renderReact();
    }
  }

  disconnectedCallback() {
    if (this.root) {
      this.root.unmount();
    }
  }

  private renderReact() {
    const tenantId = this.getAttribute('tenant-id') || '';
    const patientCpf = this.getAttribute('patient-cpf') || '';
    const accessToken = this.getAttribute('access-token') || '';

    this.root?.render(
      <React.StrictMode>
        <App 
          tenantId={tenantId} 
          patientCpf={patientCpf} 
          accessToken={accessToken} 
        />
      </React.StrictMode>
    );
  }
}

if (!customElements.get('aura-caso-app')) {
  customElements.define('aura-caso-app', AuraCasoAppElement);
}

// Support direct standalone rendering for development
const devRoot = document.getElementById('root');
if (devRoot) {
  const root = ReactDOM.createRoot(devRoot);
  root.render(
    <React.StrictMode>
      <App 
        tenantId="dev-silo" 
        patientCpf="000.000.000-00" 
        accessToken="dummy-token" 
      />
    </React.StrictMode>
  );
}
export {};
