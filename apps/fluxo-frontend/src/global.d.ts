import React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'aura-caso-app': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'tenant-id'?: string;
        'patient-cpf'?: string;
        'access-token'?: string;
      };
      'aura-pulso-app': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'tenant-id'?: string;
        'patient-cpf'?: string;
        'access-token'?: string;
      };
      'aura-traco-app': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'tenant-id'?: string;
        'doctor-cpf'?: string;
        'doctor-crm'?: string;
        'doctor-crm-uf'?: string;
        'document-hash'?: string;
        'access-token'?: string;
      };
    }
  }
}
