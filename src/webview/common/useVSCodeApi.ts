import { useEffect, useState } from 'react';

interface VSCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

declare global {
  interface Window {
    vscode: VSCodeApi | undefined;
  }
}

export function useVSCodeApi() {
  const [vscode, setVSCode] = useState<VSCodeApi | undefined>(undefined);

  useEffect(() => {
    if (window.vscode) {
      setVSCode(window.vscode);
    }
  }, []);

  return vscode;
}