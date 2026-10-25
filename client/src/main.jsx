import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './art.css';
import './loading.css';
import './mobile.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
