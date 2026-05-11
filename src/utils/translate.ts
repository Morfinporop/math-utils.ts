// Google Cloud Translation API
const API_KEY = ''; // Add your API key here
const PROJECT_ID = ''; // Add your project ID here
const LOCATION = 'global';

export async function translateText(text: string, targetLang: string = 'en'): Promise<string> {
  if (!API_KEY || !PROJECT_ID) {
    // Fallback: just add [EN] prefix if no API key
    return `[EN] ${text}`;
  }

  try {
    const res = await fetch(
      `https://translate.googleapis.com/v3beta1/projects/${PROJECT_ID}/locations/${LOCATION}:translateText?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [text],
          mimeType: 'text/plain',
          targetLanguageCode: targetLang
        })
      }
    );

    if (!res.ok) throw new Error('Translation failed');
    const data = await res.json();
    return data.translations?.[0]?.translatedText || text;
  } catch {
    return `[EN] ${text}`;
  }
}
