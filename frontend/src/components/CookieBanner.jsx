import { useState } from 'react';

const CookieBanner = () => {
  const [mostrarBanner, setMostrarBanner] = useState(() => localStorage.getItem('cookiesAceptadas') === null);

  const aceptarCookies = () => {
    localStorage.setItem('cookiesAceptadas', 'true');
    window.dispatchEvent(new Event('cookiesActualizadas'));
    setMostrarBanner(false);
  };

  const rechazarCookies = () => {
    localStorage.setItem('cookiesAceptadas', 'false');
    window.dispatchEvent(new Event('cookiesActualizadas'));
    
    // Si rechaza, limpia cualquier progreso guardado
    Object.keys(localStorage).forEach(key => {
      if (key.includes('digcomp_progreso_')) localStorage.removeItem(key);
    });
    setMostrarBanner(false);
  };

  if (!mostrarBanner) return null;

  return (
    <>
      <style>
        {`
          /* OVERLAY BLOQUEANTE (Ocupa el 100% de la pantalla) */
          .cookie-banner-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.4); /* Fondo oscurecido para enfocar la atención */
            z-index: 9999; 
            display: flex; 
            align-items: flex-end; /* Empuja el banner hacia abajo del todo */
            animation: fadeInOverlay 0.3s ease-out forwards;
          }
          @keyframes fadeInOverlay {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          /* BANNER ESTILO FOOTER (Ocupa todo el ancho abajo) */
          .cookie-banner-bottom {
            width: 100%;
            background-color: #ffffff;
            border-top: 2px solid #e2e8f0;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
            padding: 1.5rem;
            display: flex;
            justify-content: center;
            animation: slideUpCookie 0.4s ease-out forwards;
          }
          @keyframes slideUpCookie {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }

          /* CONTENIDO DEL BANNER */
          .cookie-banner-content {
            max-width: 1200px; 
            width: 100%; 
            display: flex;
            flex-direction: column; 
            gap: 1rem; 
            align-items: center; 
            text-align: center;
          }

          .cookie-banner-content p {
            margin: 0; color: #334155; font-size: 0.95rem; line-height: 1.5;
          }
          
          .cookie-banner-actions {
            display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;
          }
          
          .btn-cookie {
            padding: 0.6rem 1.5rem; border-radius: 6px; font-weight: 600;
            cursor: pointer; transition: all 0.2s; border: none;
          }
          .btn-cookie-rechazar { background-color: transparent; color: #64748b; border: 1px solid #cbd5e1; }
          .btn-cookie-rechazar:hover { background-color: #f1f5f9; color: #334155; }
          .btn-cookie-aceptar { background-color: #f56a6a; color: white; }
          .btn-cookie-aceptar:hover { background-color: #d65d5d; }
          
          /* MODO OSCURO GENERAL */
          body.dark-mode-body .cookie-banner-bottom { background-color: #282c31; border-color: #464b50; }
          body.dark-mode-body .cookie-banner-content p { color: #e2e8f0; }
          body.dark-mode-body .btn-cookie-rechazar { color: #cbd5e1; border-color: #464b50; }
          body.dark-mode-body .btn-cookie-rechazar:hover { background-color: #383e44; color: #fff; }
        `}
      </style>
      <div className="cookie-banner-overlay">
        <div className="cookie-banner-bottom">
          <div className="cookie-banner-content">
            <p>
              <strong>Utilizamos cookies:</strong> Este sitio web utiliza cookies con fines técnicos y de 
              personalización, pero no recaba ni cede datos de carácter personal de los usuarios. 
              Debes aceptar o rechazar para poder continuar.
            </p>
            <div className="cookie-banner-actions">
              <button className="btn-cookie btn-cookie-rechazar" onClick={rechazarCookies}>
                Rechazar
              </button>
              <button className="btn-cookie btn-cookie-aceptar" onClick={aceptarCookies}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CookieBanner;