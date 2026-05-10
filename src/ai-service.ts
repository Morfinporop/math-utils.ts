/* 
 * ╔══════════════════════════════════════════╗
 * ║ AnoAI :: Smart Neural Bridge             ║
 * ║ 5 Multi-Model Redundancy                ║
 * ╚══════════════════════════════════════════╝
 */

const AI_MODELS = [
  'stepfun/step-3.5-flash:free',
  'google/gemini-pro-1.5-exp:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2-7b-instruct:free',
  'meta-llama/llama-3-8b-instruct:free'
];

const KEY = () => atob('bGstb3ItdjEtNDhhNjk1YzQyNjUzNDI4NzJiOTZkZmFhYjc3YmI1NWVjNjFhNzc5MjU0ODg2YzU3YzRhZDQyZmJkNTA4OGVmMDA0MWExMmFkZGM0');

export async function askAnoAI(prompt: string, onUpdate: (s: string) => void) {
  // Check for forbidden content
  if (prompt.match(/насилие|жесткость|убийство|torture|gore/i)) {
    onUpdate("[BLURRED: Content violates safety protocols]");
    return;
  }

  onUpdate("думает...");

  for (const model of AI_MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KEY()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      const text = data.choices[0].message.content;
      onUpdate(text);
      return;
    } catch (e) {
      continue; // Try next model
    }
  }
  onUpdate("Ошибка: Все нейросети недоступны.");
}
