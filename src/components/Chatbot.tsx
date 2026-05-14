import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { sendMessageToAPI } from '../api/chat';
import type { ChatMessage } from '../api/chat';
import { SYSTEM_PROMPT } from '../constants/prompts';

export const Chatbot = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat with system prompt and first assistant greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { role: 'system', content: SYSTEM_PROMPT },
      ]);
      // Trigger the first message by simulating an empty user message, or just let the user say hello first.
      // But the prompt says "가장 먼저 "안녕!..." 이라고 물어보세요."
      // Let's add a manual first assistant message to start the conversation perfectly.
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '안녕! 우리 반 1인 1역할 배정을 도와줄 AI 조수야. 너는 몇 학년이니? 만나서 반가워! 👋' }
        ]);
      }, 500);
    }
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsg = inputValue.trim();
    setInputValue('');
    
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userMsg }
    ];
    
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const responseContent = await sendMessageToAPI(newMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: responseContent }]);
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `오류가 발생했어: ${error.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const visibleMessages = messages.filter(msg => msg.role !== 'system');

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <div className="header-icon-wrapper">
          <Sparkles className="header-icon" size={24} />
        </div>
        <div className="header-titles">
          <h1>학급 역할 배정 도우미</h1>
          <p>나에게 꼭 맞는 1인 1역할을 찾아보자!</p>
        </div>
      </div>

      <div className="chatbot-messages">
        {visibleMessages.map((msg, idx) => (
          <div key={idx} className={`message-wrapper ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}>
            {msg.role === 'assistant' && (
              <div className="avatar assistant-avatar">
                <Bot size={20} />
              </div>
            )}
            
            <div className="message-content">
              {msg.content.split('\n').map((line: string, i: number) => (
                <p key={i}>{line}</p>
              ))}
            </div>

            {msg.role === 'user' && (
              <div className="avatar user-avatar">
                <User size={20} />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="message-wrapper message-assistant">
             <div className="avatar assistant-avatar">
                <Bot size={20} />
              </div>
              <div className="message-content loading-content">
                <Loader2 className="spinning-icon" size={20} />
                <span>AI 조수가 생각하는 중...</span>
              </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chatbot-input-area" onSubmit={handleSendMessage}>
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="여기에 대답을 입력해봐! (Enter키로 전송)"
          rows={1}
          disabled={isLoading}
        />
        <button type="submit" disabled={!inputValue.trim() || isLoading} className="send-button">
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};
