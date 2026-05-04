import { invoke } from '@tauri-apps/api/core';

/**
 * The ONLY place in the frontend that touches the Anthropic API.
 * The Rust `call_anthropic` command reads the key from plugin-store and injects it.
 * This function never sees the API key.
 *
 * Per the established fire-and-forget contract: returns null on error, never throws.
 */
export async function callAnthropic(body: {
  model: string;
  max_tokens: number;
  system: string;
  messages: Array<{ role: string; content: unknown }>;
}): Promise<{ content: Array<{ text: string }> } | null> {
  try {
    const result = await invoke<{ content: Array<{ text: string }> }>('call_anthropic', { body });
    return result;
  } catch (err) {
    console.warn('[AiBridge] call_anthropic failed:', err);
    return null;
  }
}
