import './styles/main.css';
import { initShell } from './shell.js';

initShell();

// The checksum tool (and hash-wasm) is only loaded on pages that contain it.
if (document.getElementById('drop')) import('./checker/index.js');
