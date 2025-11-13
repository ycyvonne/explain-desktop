type AskArgs = {
  question: string;
  screenshotDataUrl?: string;
  text?: string;
  history: { role: 'user' | 'assistant'; content: string }[];
};

export default async function askLLM({
  question,
  screenshotDataUrl,
  text,
  history,
}: AskArgs): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_OPENAI_API_KEY. Add it to your environment before running the app.');
  }

  const hasQuestion = question && question.trim().length > 0;
  
  let systemPrompt: string;
  if (screenshotDataUrl) {
    systemPrompt = hasQuestion
      ? 'You are a concise on-screen assistant. Answer the user\'s question in context of the screenshot and answer precisely.'
      : 'You are a concise on-screen assistant. Explain what is in the screenshot and answer precisely.';
  } else {
    systemPrompt = hasQuestion
      ? 'You are a concise on-screen assistant. Answer the user\'s question in context of the selected text and answer precisely.'
      : 'You are a concise on-screen assistant. Explain the selected text and answer precisely.';
  }
  
  systemPrompt += " If the context is code, explain what it does. Do not repeat the question or context in your answer.";

  let userContent: any;
  if (screenshotDataUrl) {
    userContent = [
      { type: 'text', text: question },
      { type: 'image_url', image_url: { url: screenshotDataUrl } },
    ];
  } else if (text) {
    userContent = `${question}\n\nSelected text:\n${text}`;
  } else {
    throw new Error('Either screenshotDataUrl or text must be provided');
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((message) => ({ role: message.role, content: message.content })),
    {
      role: 'user',
      content: userContent,
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
