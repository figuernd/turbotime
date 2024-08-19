import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper, Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress } from '@mui/material';
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
  const [showFullContext, setShowFullContext] = useState(false);
  const [fullContext, setFullContext] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const [contextLimit, setContextLimit] = useState(1000);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'receiveMessage':
          setMessages((prevMessages) => [
            ...prevMessages,
            { role: 'assistant', content: message.message },
          ]);
          break;
        case 'updateProjectFiles':
          setProjectFiles(message.files);
          break;
        case 'updateTokenCount':
          setTokenCount(message.tokenCount);
          break;
        case 'updateContextLimit':
          setContextLimit(message.contextLimit);
          break;
        case 'fullContext':
          setFullContext(message.context);
          setShowFullContext(true);
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Request project files and context limit
    vscode?.postMessage({ command: 'getProjectFiles' });
    vscode?.postMessage({ command: 'getContextLimit' });

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

  const handleShowFullContext = () => {
    vscode?.postMessage({ command: 'getFullContext' });
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">TurboTime Chat</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            onClick={handleShowFullContext}
            variant="outlined"
            size="small"
            sx={{ mr: 2 }}
          >
            Show Message
          </Button>
          <Box sx={{ width: 200, mr: 2 }}>
            <LinearProgress
              variant="determinate"
              value={(tokenCount / contextLimit) * 100}
            />
            <Typography variant="caption">
              {tokenCount}/{contextLimit}
            </Typography>
          </Box>
          <Button
            onClick={() => setShowFileList(!showFileList)}
            variant="outlined"
            size="small"
          >
            {showFileList ? 'Hide Files' : 'Show Files'}
          </Button>
        </Box>
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
      <Dialog open={showFullContext} onClose={() => setShowFullContext(false)} maxWidth="md" fullWidth>
        <DialogTitle>Full Context</DialogTitle>
        <DialogContent>
          <Typography variant="body1" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {fullContext}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFullContext(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};