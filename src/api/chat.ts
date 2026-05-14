export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const sendMessageToAPI = async (messages: ChatMessage[]): Promise<string> => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.message.content;
  } catch (error) {
    console.error('Error in sendMessageToAPI:', error);
    throw error;
  }
};
