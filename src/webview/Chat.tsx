import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';
import { useVSCodeApi } from './common/useVSCodeApi';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ProjectFileList } from './ProjectFileList';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const Chat: React.FC = () => {
  const vscode = useVSCodeApi();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showFileList, setShowFileList] = useState(false);
  const [projectFiles, setProjectFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'receiveMessage') {
        setMessages((prevMessages) => [
          ...prevMessages,
          { role: 'assistant', content: message.message },
        ]);
      } else if (message.command === 'updateProjectFiles') {
        setProjectFiles(message.files);
      }
    };

    window.addEventListener('message', handleMessage);

    // Request project files
    vscode?.postMessage({ command: 'getProjectFiles' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [vscode]);

  const sendMessage = () => {
    if (input.trim() && vscode) {
      const userMessage: Message = { role: 'user', content: input };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      vscode.postMessage({ command: 'sendMessage', text: input });
      setInput('');
    }
  };

  const renderMessage = (message: Message) => {
    const sanitizedHtml = DOMPurify.sanitize(marked(message.content) as string);
    return (
      <Box
        component={Paper}
        elevation={1}
        sx={{
          p: 2,
          my: 1,
          backgroundColor:
            message.role === 'user'
              ? 'var(--vscode-editor-background)'
              : 'var(--vscode-editor-inactiveSelectionBackground)',
        }}
      >
        <Typography
          variant="body1"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </Box>
    );
  };

  const handleFileSelection = (files: string[]) => {
    setSelectedFiles(files);
    vscode?.postMessage({ command: 'updateSelectedFiles', files });
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">TurboTime Chat</Typography>
        <button
          onClick={() => setShowFileList(!showFileList)}
          style={{
            background: 'none',
            border: '1px solid var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            padding: '4px 8px',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
        >
          {showFileList ? 'Hide Files' : 'Show Files'}
        </button>
      </Box>
      {showFileList && (
        <ProjectFileList
          files={projectFiles}
          selectedFiles={selectedFiles}
          onSelectionChange={handleFileSelection}
        />
      )}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        {messages.map((message, index) => (
          <Box key={index}>{renderMessage(message)}</Box>
        ))}
      </Box>
      <Box sx={{ p: 2, display: 'flex' }}>
        <TextField
          fullWidth
          variant="outlined"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
          sx={{ mr: 1 }}
        />
        <Button variant="contained" onClick={sendMessage}>
          Send
        </Button>
      </Box>
    </Box>
  );
};