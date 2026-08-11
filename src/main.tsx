import React from 'react';
import ReactDOM from 'react-dom/client';
import 'material-icons/iconfont/filled.css';
import 'material-icons/iconfont/outlined.css';
import { App } from './App';
import './index.css';
import { initWebVitals } from './utils/webVitals';

initWebVitals();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
