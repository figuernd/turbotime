import React, { useState, useEffect, useCallback } from 'react';
import { Box, TextField, Button, Typography, Paper, Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress, Select, MenuItem, InputLabel, FormControl, CircularProgress } from '@mui/material';
import { useVSCodeApi } from './common/useVSCodeApi';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ProjectFileList } from './ProjectFileList';
import debounce from 'lodash/debounce';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CodeBlockProps {
  code: string;
  language: string;
  filePath?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, filePath }) => {
  const vscode = useVSCodeApi();

  const handleWriteToFile = () => {
    if (filePath) {
      vscode?.postMessage({ command: 'writeToFile', filePath, code });
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(code).then(() => {
      console.log('Code copied to clipboard!');
    }, (err) => {
      console.error('Failed to copy: ', err);
    });
  };

  const customStyle = {
    ...vscDarkPlus,
    'pre[class*="language-"]': {
      ...vscDarkPlus['pre[class*="language-"]'],
      background: 'var(--vscode-editor-background)',
    },
    'code[class*="language-"]': {
      ...vscDarkPlus['code[class*="language-"]'],
      color: 'var(--vscode-editor-foreground)',
      backgroundColor: 'var(--vscode-editor-background)'
    },
  };

  return (
    <Box>
      <SyntaxHighlighter
        language={language}
        style={customStyle}
        customStyle={{
          margin: 0,
          padding: '16px',
          borderRadius: '4px',
        }}
      >
        {code}
      </SyntaxHighlighter>
      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
        {filePath && (
          <Button
            variant="outlined"
            size="small"
            onClick={handleWriteToFile}
            sx={{
              color: 'var(--vscode-button-foreground)',
              backgroundColor: 'var(--vscode-button-background)',
              '&:hover': {
                backgroundColor: 'var(--vscode-button-hoverBackground)',
              },
            }}
          >
            Save to {filePath}
          </Button>
        )}
        <Button
          variant="outlined"
          size="small"
          onClick={handleCopyToClipboard}
          sx={{
            color: 'var(--vscode-button-foreground)',
            backgroundColor: 'var(--vscode-button-background)',
            '&:hover': {
              backgroundColor: 'var(--vscode-button-hoverBackground)',
            },
          }}
        >
          Copy
        </Button>
      </Box>
    </Box>
  );
};

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
  const [conversations, setConversations] = useState<string[]>(['default']);
  const [currentConversation, setCurrentConversation] = useState<string>('default');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const updateTokenCount = useCallback(
    (currentInput: string, currentSelectedFiles: string[]) => {
      vscode?.postMessage({
        command: 'updateTokenCount',
        input: currentInput,
        selectedFiles: currentSelectedFiles
      });
    }, [vscode]);

  const debouncedUpdateTokenCount = useCallback(
    debounce((currentInput: string, currentSelectedFiles: string[]) => {
      updateTokenCount(currentInput, currentSelectedFiles);
    }, 500),
    [updateTokenCount]
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'receiveMessage':
          setMessages((prevMessages) => [
            ...prevMessages,
            { role: 'assistant', content: message.message },
          ]);
          setIsLoading(false);
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
        case 'switchConversation':
          setMessages(message.messages);
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    vscode?.postMessage({ command: 'getProjectFiles' });
    vscode?.postMessage({ command: 'getContextLimit' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [vscode]);

  useEffect(() => {
    debouncedUpdateTokenCount(input, selectedFiles);
  }, [input, selectedFiles, debouncedUpdateTokenCount]);

  const sendMessage = () => {
    if (input.trim() && vscode) {
      const userMessage: Message = { role: 'user', content: input };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setIsLoading(true);
      vscode.postMessage({ command: 'sendMessage', text: input });
      setInput('');
    }
  };

  const cancelRequest = () => {
    if (isLoading && vscode) {
      // Implement the logic to cancel the request here
      setIsLoading(false);
    }
  };

  const renderMessage = (message: Message) => {
    const tokens = marked.lexer(message.content);
    let currentFilePath: string | undefined;

    const renderedContent = tokens.map((token, index) => {
      if (token.type === 'paragraph'
        && (token.text.startsWith('FILE:`') || token.text.startsWith('FILE: `'))
        && token.text.endsWith('`')) {
        const filePath = token.text.slice(6, -1).trim();
        if (!filePath.startsWith('/')) {
          currentFilePath = filePath;
          return null;
        }
      }

      if (token.type === 'code') {
        const codeBlock = (
          <CodeBlock
            key={index}
            code={token.text}
            language={token.lang || ''}
            filePath={currentFilePath}
          />
        );
        currentFilePath = undefined;
        return codeBlock;
      }

      const html = marked.parser([token]);
      return (
        <div key={index} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
      );
    });

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
              : 'var(--vscode-editorInlayHint-background)',
          color: 'var(--vscode-editor-foreground)',
        }}
      >
        {renderedContent}
      </Box>
    );
  };

  const handleFileSelection = (files: string[]) => {
    setSelectedFiles(files);
  };

  const handleShowFullContext = () => {
    vscode?.postMessage({ command: 'getFullContext' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleConversationChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    const newConversation = e.target.value as string;
    setCurrentConversation(newConversation);
    vscode?.postMessage({ command: 'switchConversation', conversation: newConversation });
  };

  const handleNewConversation = () => {
    const newConversation = `conversation-${conversations.length + 1}`;
    setConversations([...conversations, newConversation]);
    setCurrentConversation(newConversation);
    vscode?.postMessage({ command: 'switchConversation', conversation: newConversation });
  };

  return (
    <Box sx={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--vscode-editor-background)',
      color: 'var(--vscode-editor-foreground)',
    }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControl sx={{ mr: 2, minWidth: 200 }}>
            <InputLabel>Conversation</InputLabel>
            <Select
              value={currentConversation}
              onChange={handleConversationChange as any}
              label="Conversation"
            >
              {conversations.map((conversation) => (
                <MenuItem key={conversation} value={conversation}>
                  {conversation}
                </MenuItem>
              ))}
              <MenuItem value="" onClick={handleNewConversation}>
                <em>New Conversation</em>
              </MenuItem>
            </Select>
          </FormControl>
          <Button
            sx={{ mr: 2 }}
            onClick={() => setShowFileList(!showFileList)}
            variant="outlined"
            size="small"
          >
            {showFileList ? 'Hide Files' : 'Select Files'}
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
            onClick={handleShowFullContext}
            variant="outlined"
            size="small"
          >
            Show Payload
          </Button>
          <CircularProgress size={24} sx={{ ml: 2, visibility: isLoading ? "visible" : "hidden" }} />
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
          multiline
          value={input}
          onChange={handleInputChange}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
          sx={{ mr: 1 }}
        />
        {isLoading ? (
          <Button variant="contained" onClick={cancelRequest}>
            Stop
          </Button>
        ) : (
          <Button variant="contained" onClick={sendMessage}>
            Send
          </Button>
        )}
      </Box>
      <Dialog open={showFullContext} onClose={() => setShowFullContext(false)} maxWidth="md" fullWidth>
        <DialogTitle>Full Context</DialogTitle>
        <DialogContent>
          <CodeBlock code={fullContext} language='JavaScript' />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFullContext(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};