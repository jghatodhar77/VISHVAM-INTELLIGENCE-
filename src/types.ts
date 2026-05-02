export interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}
