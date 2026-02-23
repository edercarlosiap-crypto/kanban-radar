import React, { useEffect, useState } from 'react';
import { configAPI } from '../services/api';

const defaultLogoSvg = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>" +
  "<rect width='120' height='120' rx='24' fill='#0f172a'/>" +
  "<text x='50%' y='54%' text-anchor='middle' font-family='Arial' font-size='44' fill='#93c5fd'>R</text>" +
  '</svg>'
);

const defaultLogo = `data:image/svg+xml;utf8,${defaultLogoSvg}`;

export default function LogoImage({ size = 36, style = {} }) {
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    let ativo = true;
    configAPI.obterLogo()
      .then((response) => {
        if (!ativo) return;
        setLogoUrl(response.data?.logoUrl || null);
      })
      .catch(() => {
        if (!ativo) return;
        setLogoUrl(null);
      });

    return () => {
      ativo = false;
    };
  }, []);

  return (
    <img
      src={logoUrl || defaultLogo}
      alt="Logo"
      style={{ width: size, height: size, borderRadius: 10, objectFit: 'cover', ...style }}
    />
  );
}
