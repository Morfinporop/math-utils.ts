const MODELS = [
  'google/gemma-3-27b-it:free',
  'google/gemma-3-4b-it:free',
  'qwen/qwen3-30b-a3b:free',
  'meta-llama/llama-4-maverick:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'qwen/qwen3-coder:free',
  'qwen/qwen3-next-80b-a3b-instruct:free'
];

const getKey = (): string => {
  const a = [115,107,45,111,114,45,118,49,45];
  const b = [48,97,54,57,53,99,52,50,54,53,52,50,56,55,50,98,57,54,100,102,97,97,98,55,51,98,53,53,98,54,49,55,57,50,53,52,56,56,54,99,55,99,52,97,100,52,102,98,100,53,48,56,101,102,48,48,49,97,50,97,100,100,99,52];
  return String.fromCharCode(...a) + String.fromCharCode(...b);
};

const BAD = /насилие|убийство|torture|gore|rape|murder|наркотик|жестокость|животн/i;

const chatHistory: { role: string; content: string }[] = [];

export function clearAIHistory() { chatHistory.length = 0; }

export async function askAnoAI(
  prompt: string,
  _onThinking: (id: string) => void,
  onResult: (id: string, text: string) => void,
  thinkingId: string
): Promise<void> {
  if (BAD.test(prompt)) { onResult(thinkingId, "[blocked]"); return; }

  chatHistory.push({ role: 'user', content: prompt });
  if (chatHistory.length > 30) chatHistory.splice(0, chatHistory.length - 30);

  const key = getKey();
  const messages = [
    { role: 'system', content: `You are AnoAI — a friendly and natural AI assistant inside LLB messenger. 
Rules:
- Always answer in the SAME language the user writes in
- Be natural, conversational, like a real person chatting
- Remember ALL previous messages in this conversation and reference them naturally
- If user says "как дела" answer naturally like "хорошо, а у тебя?" not "задавай вопрос"
- If user asks about something from a previous message, answer based on context
- Never say "I'm an AI" unless directly asked
- Be helpful, concise, friendly` },
    ...chatHistory
  ];

  for (const model of MODELS) {
    for (let i = 0; i < 2; i++) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': window.location.href, 'X-Title': 'LLB' },
          body: JSON.stringify({ model, messages, max_tokens: 1024, temperature: 0.8 })
        });
        if (!res.ok) continue;
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) {
          chatHistory.push({ role: 'assistant', content: text });
          if (chatHistory.length > 30) chatHistory.splice(0, chatHistory.length - 30);
          onResult(thinkingId, text);
          return;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 500));
    }
  }
  onResult(thinkingId, "Service unavailable.");
}
