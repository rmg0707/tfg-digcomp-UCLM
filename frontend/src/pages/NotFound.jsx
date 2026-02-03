// src/pages/NotFound.jsx
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="not-found-page">
      
      <style>{`
        @import url("https://fonts.googleapis.com/css?family=Open+Sans:400,600,400italic,600italic|Roboto+Slab:400,700");

        :root {
          /* Paleta Editorial */
          --nf-primary: #f56a6a; 
          --nf-primary-hover: #f67878;
          --nf-dark: #3d4449;
          --nf-text: #7f888f;
          --nf-bg: #ffffff;
          --nf-border: rgba(210, 215, 217, 0.75);
        }

        /* --- LAYOUT & TYPOGRAPHY --- */
        .not-found-page {
          height: 100vh;
          width: 100%;
          background: var(--nf-bg);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          font-family: 'Open Sans', sans-serif;
          text-align: center; padding: 2rem;
          overflow: hidden;
        }

        .main-404 {
          font-family: 'Roboto Slab', serif;
          font-size: clamp(6rem, 15vw, 10rem); 
          font-weight: 700;
          color: var(--nf-primary); 
          line-height: 1; 
          margin-bottom: 1rem;
          /* Sin text-shadow pesado, estilo más plano */
          animation: scaleDown 0.4s ease-out;
        }

        .content {
          max-width: 500px; display: flex; flex-direction: column; align-items: center;
          animation: fadeUp 0.5s ease-out 0.1s backwards;
        }

        .title {
          font-family: 'Roboto Slab', serif;
          font-size: clamp(1.5rem, 4vw, 2.2rem); 
          font-weight: 700;
          color: var(--nf-dark); 
          margin-bottom: 1rem;
        }

        .description {
          font-size: 1.1rem; 
          color: var(--nf-text);
          line-height: 1.7; 
          margin-bottom: 3rem; 
          font-weight: 400;
          max-width: 90%;
        }

        /* --- BUTTON STYLES (Editorial) --- */
        .btn-home {
          display: inline-flex; justify-content: center; align-items: center;
          background-color: var(--nf-primary); 
          color: white;
          border: none; 
          padding: 0 2.5rem;
          height: 3.5rem;
          border-radius: 0.375em;
          font-family: 'Roboto Slab', serif;
          font-weight: 700; 
          font-size: 0.9rem; 
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.075em;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          transition: all 0.2s ease-in-out; 
          cursor: pointer;
        }

        .btn-home:hover {
          background-color: var(--nf-primary-hover);
          transform: translateY(-3px); /* Animación de elevación */
          box-shadow: 0 10px 20px rgba(245, 106, 106, 0.25);
        }

        @keyframes scaleDown {
          from { transform: scale(1.1); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div className="main-404">404</div>

      <div className="content">
        <h1 className="title">Página no encontrada</h1>
        
        <p className="description">
          No podemos mostrar esta página. Es posible que el enlace esté incompleto o que la ruta ya no exista.
        </p>

        <Link to="/" className="btn-home">
          Volver al Inicio
        </Link>
      </div>

    </div>
  );
};

export default NotFound;