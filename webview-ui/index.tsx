import React from 'react';
import { createRoot } from 'react-dom/client';
import { VSCodeWrapper } from '../src/webview/common/VSCodeWrapper';
import { Chat } from '../src/webview/Chat';
import { Config } from '../src/webview/Config';

declare global {
  interface Window {
    initialPage: 'chat' | 'config';
    vscode: any;
  }
}

const App: React.FC = () => {
  const page = window.initialPage;

  return (
    <VSCodeWrapper>
      {page === 'chat' ? <Chat /> : <Config />}
    </VSCodeWrapper>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);