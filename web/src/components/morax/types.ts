export interface DecryptStats {
  mode: 'metadata' | 'proto' | 'dummy' | 'all';
  types: number;
  methods: number;
  fields: number;
  timeSeconds: string;
  outputFiles: string[];
}
