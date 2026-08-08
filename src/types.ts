export interface AssetRow {
  label: string;
  value: string;
}

export interface AssetInfo {
  code: string;
  name: string;
  rows: [string, string][];
  note: string;
}

export type LayerKey = 'hvac' | 'solar' | 'struct' | 'util' | 'context' | 'dims';

export interface LayerConfig {
  key: LayerKey;
  label: string;
  color: string;
  keyShortcut: string;
}

export type ViewPreset = 'iso' | 'plan' | 'entry';
