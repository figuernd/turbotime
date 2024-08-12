import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Grid } from '@mui/material';
import { useVSCodeApi } from './common/useVSCodeApi';

interface ConfigState {
  apiEndpoint: string;
  apiKey: string;
  systemMessage: string;
  userMessageTemplate: string;
  assistantMessageTemplate: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences: string;
  modelName: string;
  responseFormat: string;
}

export const Config: React.FC = () => {
  const vscode = useVSCodeApi();
  const [config, setConfig] = useState<ConfigState>({
    apiEndpoint: '',
    apiKey: '',
    systemMessage: '',
    userMessageTemplate: '{message}',
    assistantMessageTemplate: '{message}',
    maxTokens: 150,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: '',
    modelName: '',
    responseFormat: 'text',
  });

  useEffect(() => {
    if (vscode) {
      const storedConfig = vscode.getState();
      if (storedConfig) {
        setConfig(storedConfig);
      }
    }
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
      vscode.setState(config);
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
          <TextField
            fullWidth
            label="System Message"
            name="systemMessage"
            value={config.systemMessage}
            onChange={handleChange}
            multiline
            rows={4}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="User Message Template"
            name="userMessageTemplate"
            value={config.userMessageTemplate}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Assistant Message Template"
            name="assistantMessageTemplate"
            value={config.assistantMessageTemplate}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Max Tokens"
            name="maxTokens"
            value={config.maxTokens}
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