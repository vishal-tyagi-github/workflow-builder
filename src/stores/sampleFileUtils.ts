// Browser-friendly sample loader: use Vite's import.meta.glob to bundle JSON samples.
// Put sample files in src/samples/*.json and load by name (without .json).
const samples = import.meta.glob('../samples/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, any>;

export const loadWorkflow = (workflowName: string) => {
  const match = Object.keys(samples).find((k) => k.endsWith(`${workflowName}.json`));
  if (!match) {
    throw new Error(`Sample workflow not found: ${workflowName}`);
  }
  // return a shallow copy to avoid accidental mutation of the bundled object
  const data = samples[match];
  return typeof structuredClone === 'function' ? structuredClone(data) : JSON.parse(JSON.stringify(data));
};
