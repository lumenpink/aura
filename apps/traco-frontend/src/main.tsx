import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class AuraTracoAppElement extends HTMLElement {
  private root: ReactDOM.Root | null = null;

  static get observedAttributes() {
    return ['tenant-id', 'doctor-cpf', 'doctor-crm', 'doctor-crm-uf', 'document-hash', 'access-token'];
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    container.id = 'traco-root';
    container.style.width = '100%';

    // Custom internal styles inside shadow DOM
    const style = document.createElement('style');
    style.textContent = `
      #traco-root {
        font-family: sans-serif;
        width: 100%;
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
    const doctorCpf = this.getAttribute('doctor-cpf') || '';
    const doctorCrm = this.getAttribute('doctor-crm') || '';
    const doctorCrmUf = this.getAttribute('doctor-crm-uf') || '';
    const documentHash = this.getAttribute('document-hash') || '';
    const accessToken = this.getAttribute('access-token') || '';

    this.root?.render(
      <React.StrictMode>
        <App
          tenantId={tenantId}
          doctorCpf={doctorCpf}
          doctorCrm={doctorCrm}
          doctorCrmUf={doctorCrmUf}
          documentHash={documentHash}
          accessToken={accessToken}
          onSuccess={(signature) => {
            this.dispatchEvent(new CustomEvent('signature-success', {
              detail: { signature },
              bubbles: true,
              composed: true
            }));
          }}
          onError={(error) => {
            this.dispatchEvent(new CustomEvent('signature-failed', {
              detail: { error },
              bubbles: true,
              composed: true
            }));
          }}
        />
      </React.StrictMode>
    );
  }
}

if (!customElements.get('aura-traco-app')) {
  customElements.define('aura-traco-app', AuraTracoAppElement);
}

// Standalone mode support for dev
const devRoot = document.getElementById('root');
if (devRoot) {
  const root = ReactDOM.createRoot(devRoot);
  root.render(
    <React.StrictMode>
      <App
        tenantId="dev-silo"
        doctorCpf="123.456.789-00"
        doctorCrm="123456"
        doctorCrmUf="SP"
        documentHash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        accessToken="dummy-token"
      />
    </React.StrictMode>
  );
}
export {};
