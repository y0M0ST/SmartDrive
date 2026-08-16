import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // Lược bỏ .tsx để đồng nhất với cấu trúc của nhánh dev
import './index.css'
import 'react-day-picker/style.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)