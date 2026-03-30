import React from 'react';
import logoUni from '../assets/logo-uni.png';
import logoUniBranco from '../assets/logo-uni-branco.png';

export default function LogoImage({ contraste = 'claro' }) {
  const src = contraste === 'escuro' ? logoUniBranco : logoUni;

  return (
    <div className={`logo-section ${contraste === 'escuro' ? 'logo-section-escuro' : ''}`}>
      <div className="logo-image">
        <img src={src} alt="UNI Internet" />
      </div>
      <div className="logo-text">
        <h2>UNI Cockpit Comercial</h2>
        <p>Comissao, Metas e Retencao</p>
      </div>
    </div>
  );
}
