import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import DriverManagement from './pages/DriverManagement';
import VehicleManagement from './pages/VehicleManagement';
// Import các trang khác của bạn vào đây

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <Router>
      <div className={isDarkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
          <Routes>
            {/* Tự động chuyển từ localhost:5173/ sang /driver */}
            <Route path="/" element={<Navigate to="/driver" />} />
            
            {/* Router cho trang quản lý tài xế */}
            <Route 
              path="/driver" 
              element={<DriverManagement isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />} 
            />
            
            {/* Router cho trang quản lý xe (nếu có) */}
            <Route path="/vehicle" 
            element={<VehicleManagement isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}/>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;