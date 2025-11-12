type AskArgs = {
  question: string;
  screenshotDataUrl: string;
  history: { role: 'user' | 'assistant'; content: string }[];
};

const SYSTEM_PROMPT =
  'You are a concise on-screen assistant. Explain what is in the screenshot and answer precisely.';

export default async function askLLM({
  question,
  screenshotDataUrl,
  history,
}: AskArgs): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_OPENAI_API_KEY. Add it to your environment before running the app.');
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((message) => ({ role: message.role, content: message.content })),
    {
      role: 'user',
      content: [
        { type: 'text', text: question },
        { type: 'image_url', image_url: { url: screenshotDataUrl } },
      ],
    } as any,
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM error: ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  return content ?? '(no response)';
}
