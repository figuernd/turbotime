import React, { useEffect, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useVSCodeApi } from './useVSCodeApi';

interface VSCodeWrapperProps {
  children: React.ReactNode;
}

export const VSCodeWrapper: React.FC<VSCodeWrapperProps> = ({ children }) => {
  const [theme, setTheme] = useState(createTheme());
  const vscode = useVSCodeApi();

  useEffect(() => {
    const updateTheme = () => {
      const vscodeTheme = getComputedStyle(document.body);
      setTheme(createTheme({
        palette: {
          mode: 'dark',
          primary: {
            main: vscodeTheme.getPropertyValue('--vscode-button-background').trim(),
          },
          secondary: {
            main: vscodeTheme.getPropertyValue('--vscode-button-secondaryBackground').trim(),
          },
          background: {
            default: vscodeTheme.getPropertyValue('--vscode-editor-background').trim(),
            paper: vscodeTheme.getPropertyValue('--vscode-editor-background').trim(),
          },
          text: {
            primary: vscodeTheme.getPropertyValue('--vscode-editor-foreground').trim(),
            secondary: vscodeTheme.getPropertyValue('--vscode-descriptionForeground').trim(),
          },
        },
        typography: {
          fontFamily: vscodeTheme.getPropertyValue('--vscode-font-family'),
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: vscodeTheme.getPropertyValue('--vscode-input-border'),
                  },
                  '&:hover fieldset': {
                    borderColor: vscodeTheme.getPropertyValue('--vscode-input-border'),
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: vscodeTheme.getPropertyValue('--vscode-focusBorder'),
                  },
                },
              },
            },
          },
        },
      }));
    };

    updateTheme();

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'updateTheme') {
        updateTheme();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};