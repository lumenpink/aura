import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class AuraPulsoAppElement extends HTMLElement {
  private root: ReactDOM.Root | null = null;

  static get observedAttributes() {
    return ['tenant-id', 'patient-cpf', 'access-token'];
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    container.id = 'pulso-root';
    container.style.width = '100%';

    const style = document.createElement('style');
    style.textContent = `
      #pulso-root {
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
    const patientCpf = this.getAttribute('patient-cpf') || '';
    const accessToken = this.getAttribute('access-token') || '';

    this.root?.render(
      <React.StrictMode>
        <App
          tenantId={tenantId}
          patientCpf={patientCpf}
          accessToken={accessToken}
          onSuccess={(recipeId, payloadHash) => {
            this.dispatchEvent(new CustomEvent('prescription-signed', {
              detail: { recipeId, payloadHash },
              bubbles: true,
              composed: true
            }));
          }}
        />
      </React.StrictMode>
    );
  }
}

if (!customElements.get('aura-pulso-app')) {
  customElements.define('aura-pulso-app', AuraPulsoAppElement);
}

// Standalone mode support for dev
const devRoot = document.getElementById('root');
if (devRoot) {
  const root = ReactDOM.createRoot(devRoot);
  root.render(
    <React.StrictMode>
      <App
        tenantId="dev-silo"
        patientCpf="123.456.789-00"
        accessToken="dummy-token"
      />
    </React.StrictMode>
  );
}
export {};
