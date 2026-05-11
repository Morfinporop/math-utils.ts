const MODELS = [
  'inclusionai/ring-2.6-1t:free',
  'baidu/cobuddy:free',
  'poolside/laguna-xs.2:free'
];

const getKey = (): string => {
  const a = [115,107,45,111,114,45,118,49,45];
  const b = [48,97,54,57,53,99,52,50,54,53,52,50,56,55,50,98,57,54,100,102,97,97,98,55,51,98,53,53,98,54,49,55,57,50,53,52,56,56,54,99,55,99,52,97,100,52,102,98,100,53,48,56,101,102,48,48,49,97,50,97,100,100,99,52];
  return String.fromCharCode(...a) + String.fromCharCode(...b);
};

const BAD = /насилие|убийство|torture|gore|rape|murder|наркотик|жестокость|животн/i;
const SPAM = /(.)\1{10,}/;
const chatHistory: { role: string; content: string }[] = [];

export function clearAIHistory() { 
  chatHistory.length = 0; 
}

export async function askAnoAI(
  prompt: string,
  _onThinking: (id: string) => void,
  onResult: (id: string, text: string) => void,
  thinkingId: string
): Promise<void> {

  if (BAD.test(prompt)) { 
    onResult(thinkingId, "[blocked]"); 
    return; 
  }

  if (SPAM.test(prompt)) { 
    onResult(thinkingId, "Спам"); 
    return; 
  }

  chatHistory.push({ role: 'user', content: prompt });
  if (chatHistory.length > 20) {
    chatHistory.splice(0, chatHistory.length - 20);
  }

  const key = getKey();

  const msgs = [
    { 
      role: 'system', 
      content: 'Answer in the same language as the user. No emoji. No errors. Be concise, smart, helpful. Remember previous messages.' 
    },
    ...chatHistory
  ];

  for (const model of MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.href
        },
        body: JSON.stringify({
          model,
          messages: msgs,
          max_tokens: 512
        })
      });

      if (!res.ok) continue;

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;

      if (text && text.length < 3000) {
        chatHistory.push({ role: 'assistant', content: text });
        onResult(thinkingId, text);
        return;
      }

    } catch {}
  }

  onResult(thinkingId, "Ошибка сети");
}
