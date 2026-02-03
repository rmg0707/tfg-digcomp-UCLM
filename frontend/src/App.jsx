// src/App.jsx
import { Routes, Route } from 'react-router-dom';
//import Navbar from './components/Navbar';
import Home from './pages/Home';
import Cuestionario from './pages/Cuestionario';
import Informe from './pages/Informe';
import DescargaEnvio from './pages/DescargaEnvio';
import NotFound from './pages/NotFound';
import RequireId from './components/RequireId';

function App() {
  return (
    <div className="app-layout">
      {/* <Navbar /> */}
      <div className="page-content">
        <Routes>
          <Route path="/" element={<Home />} />
          
          {/* Rutas protegidas que mostrarán 404 si falta el ID */}
          <Route 
            path="/cuestionario" 
            element={
              <RequireId>
                <Cuestionario />
              </RequireId>
            } 
          />
          <Route 
            path="/informe" 
            element={
              <RequireId validarResultados={true}>
                <Informe />
              </RequireId>
            } 
          />
          <Route 
            path="/descarga-envio" 
            element={
              <RequireId>
                <DescargaEnvio />
              </RequireId>
            } 
          />

          {/*Captura rutas que no sean ninguna de las anteriores */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;