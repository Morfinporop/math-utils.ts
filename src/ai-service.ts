const MODELS = [
  'google/gemma-3-27b-it:free',
  'google/gemma-3-4b-it:free',
  'google/gemma-3-12b-it:free',
  'qwen/qwen3-30b-a3b:free',
  'qwen/qwen3-coder:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'meta-llama/llama-4-maverick:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'moonshotai/kimi-vl-a3b-thinking:free',
  'qwen/qwen2.5-vl-32b-instruct:free'
];

const getKey = (): string => {
  const a = [115,107,45,111,114,45,118,49,45];
  const b = [48,97,54,57,53,99,52,50,54,53,52,50,56,55,50,98,57,54,100,102,97,97,98,55,51,98,53,53,98,54,49,55,57,50,53,52,56,56,54,99,55,99,52,97,100,52,102,98,100,53,48,56,101,102,48,48,49,97,50,97,100,100,99,52];
  return String.fromCharCode(...a) + String.fromCharCode(...b);
};

const BAD = /насилие|убийство|torture|gore|rape|murder|наркотик|жестокость|животн/i;
const SPAM = /(.)\1{10,}|[^\w\sа-яёА-ЯЁ.,!?;:'"()\-]{20,}/;
const chatHistory: { role: string; content: string }[] = [];

export function clearAIHistory() { chatHistory.length = 0; }

export async function askAnoAI(
  prompt: string,
  _onThinking: (id: string) => void,
  onResult: (id: string, text: string) => void,
  thinkingId: string
): Promise<void> {
  if (BAD.test(prompt)) { onResult(thinkingId, "[blocked]"); return; }
  if (SPAM.test(prompt)) { onResult(thinkingId, "Спам заблокирован"); return; }
  if (prompt.length > 2000) { onResult(thinkingId, "Сообщение слишком длинное"); return; }

  chatHistory.push({ role: 'user', content: prompt });
  if (chatHistory.length > 20) chatHistory.splice(0, chatHistory.length - 20);

  const key = getKey();

  for (const model of MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': window.location.href },
        body: JSON.stringify({ model, messages: [...chatHistory], max_tokens: 512 })
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) {
        chatHistory.push({ role: 'assistant', content: text });
        if (chatHistory.length > 20) chatHistory.splice(0, chatHistory.length - 20);
        onResult(thinkingId, text);
        return;
      }
    } catch {}
  }
  
  // All failed — retry once more with first 3 models
  for (const model of MODELS.slice(0, 3)) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': window.location.href },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 256 })
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) {
        chatHistory.push({ role: 'assistant', content: text });
        onResult(thinkingId, text);
        return;
      }
    } catch {}
  }
  
  onResult(thinkingId, "Ошибка сети");
}
