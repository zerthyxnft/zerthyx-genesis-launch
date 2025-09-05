import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Request notification permission
        if ('Notification' in window && 'PushManager' in window) {
          if (Notification.permission === 'default') {
            Notification.requestPermission().then((permission) => {
              if (permission === 'granted') {
                console.log('Notification permission granted.');
              }
            });
          }
        }
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
