import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Envoie un message à Claude avec streaming.
 * @param {string} systemPrompt - Le prompt système
 * @param {Array} messages - Les messages de la conversation
 * @param {object} options - Options supplémentaires
 * @returns {ReadableStream} Stream de la réponse
 */
export async function streamClaude(systemPrompt, messages, options = {}) {
  const stream = await anthropic.messages.stream({
    model: options.model || 'claude-sonnet-4-6',
    max_tokens: options.maxTokens || 2048,
    system: systemPrompt,
    messages,
  });

  return stream;
}

/**
 * Envoie un message à Claude sans streaming.
 */
export async function askClaude(systemPrompt, messages, options = {}) {
  const response = await anthropic.messages.create({
    model: options.model || 'claude-sonnet-4-6',
    max_tokens: options.maxTokens || 2048,
    system: systemPrompt,
    messages,
  });

  // Robuste aux modèles à "thinking" (ex. Opus 4.8) : la réponse peut
  // commencer par un bloc thinking → on concatène uniquement les blocs texte
  // (content[0] n'est pas toujours le texte).
  return (response.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

export default anthropic;
