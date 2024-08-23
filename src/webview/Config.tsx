import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Grid } from '@mui/material';
import { useVSCodeApi } from './common/useVSCodeApi';

interface ConfigState {
  apiEndpoint: string;
  apiKey: string;
  systemMessage: string;
  userMessageTemplate: string;
  assistantMessageTemplate: string;
  maxResponseTokens: number;
  contextLimit: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences: string;
  modelName: string;
  responseFormat: string;
}

const defaultConfig: ConfigState = {
  "apiEndpoint": "https://api.openai.com/v1/chat/completions",
  "apiKey": "",
  "systemMessage": "You are an eager senior developer who gets straight to the point in getting this codebase to work. Here are the relevant project files:\n{project-files}\nWhen coding up solutions, write files in their entirety, not just snippets. Precede each file's contents with the filename, like so:\nFILE:`relative/path/to/file.ext`\n```language\nfile contents\n```\nStay friendly but concise and to the point.",
  "userMessageTemplate": "{message}",
  "assistantMessageTemplate": "{message}",
  "maxResponseTokens": 8192,
  "contextLimit": 32768,
  "temperature": 0.7,
  "topP": 1,
  "frequencyPenalty": 0,
  "presencePenalty": 0,
  "stopSequences": "",
  "modelName": "gpt-4o-mini",
  "responseFormat": "text"
};

export const Config: React.FC = () => {
  const vscode = useVSCodeApi();
  const [config, setConfig] = useState<ConfigState>(defaultConfig);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'initializeData') {
        setConfig(prevConfig => ({
          ...defaultConfig,
          ...message.data,
        }));
      }
    };

    window.addEventListener('message', handleMessage);

    // Request initial data
    vscode?.postMessage({ command: 'loadConfig' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [vscode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prevConfig) => ({
      ...prevConfig,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (vscode) {
      vscode.postMessage({ command: 'saveConfig', config });
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        TurboTime Configuration
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="API Endpoint URL"
            name="apiEndpoint"
            value={config.apiEndpoint}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="API Key"
            name="apiKey"
            value={config.apiKey}
            onChange={handleChange}
            type="password"
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="body2" marginBottom="10px">
            System template should include &#123;project-files&#125;, which will be replaced by system project file list and select contents.
          </Typography>
          <TextField
            fullWidth
            label="System Template"
            name="systemMessage"
            value={config.systemMessage}
            onChange={handleChange}
            multiline
            rows={4}
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="body2" marginBottom="10px">
            User template should include &#123;message&#125;, which will be replaced by your message.
          </Typography>
          <TextField
            fullWidth
            label="User Template"
            name="userMessageTemplate"
            value={config.userMessageTemplate}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="body2" marginBottom="10px">
            Assistant template should include &#123;message&#125;, which will be replaced by response.
          </Typography>
          <TextField
            fullWidth
            label="Assistant Template"
            name="assistantMessageTemplate"
            value={config.assistantMessageTemplate}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Max Response Tokens"
            name="maxResponseTokens"
            value={config.maxResponseTokens}
            onChange={handleChange}
            type="number"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Context Limit"
            name="contextLimit"
            value={config.contextLimit}
            onChange={handleChange}
            type="number"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Temperature"
            name="temperature"
            value={config.temperature}
            onChange={handleChange}
            type="number"
            inputProps={{ step: 0.1, min: 0, max: 1 }}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Top P"
            name="topP"
            value={config.topP}
            onChange={handleChange}
            type="number"
            inputProps={{ step: 0.1, min: 0, max: 1 }}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Frequency Penalty"
            name="frequencyPenalty"
            value={config.frequencyPenalty}
            onChange={handleChange}
            type="number"
            inputProps={{ step: 0.1, min: 0, max: 2 }}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Presence Penalty"
            name="presencePenalty"
            value={config.presencePenalty}
            onChange={handleChange}
            type="number"
            inputProps={{ step: 0.1, min: 0, max: 2 }}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Stop Sequences"
            name="stopSequences"
            value={config.stopSequences}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Model Name"
            name="modelName"
            value={config.modelName}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Response Format"
            name="responseFormat"
            value={config.responseFormat}
            onChange={handleChange}
          />
        </Grid>
      </Grid>
      <Box sx={{ mt: 2 }}>
        <Button type="submit" variant="contained">
          Save Configuration
        </Button>
      </Box>
    </Box>
  );
};