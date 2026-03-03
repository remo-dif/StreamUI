// Angular adaptation of Vercel AI SDK `useChat` hook.
// See https://ai-sdk.dev/docs/ai-sdk-ui/use-chat for reference patterns.
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Conversation, Message as ChatMessage, Attachment as ChatAttachment, MessageRole } from '@shared/models';

// reuse shared Message / Attachment types for compatibility
export type Message = ChatMessage;
export type Attachment = ChatAttachment;

export interface UseChatOptions {
  api?: string;
  id?: string;
  initialMessages?: Message[];
  body?: Record<string, any>;
  onFinish?: (message: Message) => void;
  onError?: (error: Error) => void;
}

@Injectable()
export class UseChatService {
  private http = inject(HttpClient);

  // State (like useChat returns)
  messages = signal<Message[]>([]);
  input = signal('');
  isLoading = signal(false);
  error = signal<Error | undefined>(undefined);

  // Internal state
  private conversationId = signal<string | undefined>(undefined);
  private abortController: AbortController | null = null;
  private attachments = signal<Attachment[]>([]);
  private options: UseChatOptions = {};

  // Computed
  lastMessage = computed(() => {
    const msgs = this.messages();
    return msgs[msgs.length - 1];
  });

  // Initialize
  init(options: UseChatOptions = {}) {
    this.options = options;
    
    if (options.id) {
      this.conversationId.set(options.id);
    }
    
    if (options.initialMessages) {
      this.messages.set(options.initialMessages);
    }
  }

  // Handle submit (like useChat's handleSubmit)
  async handleSubmit(event?: Event, chatRequestOptions?: {
    data?: Record<string, any>;
    body?: Record<string, any>;
  }): Promise<void> {
    event?.preventDefault();

    const content = this.input().trim();
    if (!content && this.attachments().length === 0) return;

    this.isLoading.set(true);
    this.error.set(undefined);

    // Create user message
    const userMessage: Message = {
      id: this.generateId(),
      role: MessageRole.USER,
      content,
      conversationId: this.conversationId() || '',
      tokens: null,
      createdAt: new Date().toISOString(),
      attachments: this.attachments().length > 0 ? [...this.attachments()] : undefined,
    };

    // Optimistic update
    this.messages.update(msgs => [...msgs, userMessage]);
    this.input.set('');
    this.attachments.set([]);

    // Create assistant placeholder
    const assistantMessage: Message = {
      id: this.generateId(),
      role: MessageRole.ASSISTANT,
      conversationId: this.conversationId() || '',
      content: '',
      tokens: null,
      createdAt: new Date().toISOString(),
    };

    this.messages.update(msgs => [...msgs, assistantMessage]);

    // Stream response
    await this.streamResponse(assistantMessage.id, {
      messages: this.messages(),
      ...this.options.body,
      ...chatRequestOptions?.body,
      data: chatRequestOptions?.data,
    });
  }

  // Handle input change
  handleInputChange(event: Event | string) {
    const value = typeof event === 'string'
      ? event
      : (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    
    this.input.set(value);
  }

  // Stop generation
  stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      this.isLoading.set(false);
    }
  }

  // Reload last message
  async reload() {
    const msgs = this.messages();
    
    // Find last user message
    let lastUserIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    // Remove messages after last user message
    const lastUserMessage = msgs[lastUserIndex];
    this.messages.set(msgs.slice(0, lastUserIndex + 1));

    // Resend
    this.input.set(lastUserMessage.content);
    if (lastUserMessage.attachments) {
      this.attachments.set([...lastUserMessage.attachments]);
    }
    
    await this.handleSubmit();
  }

  // Append message
  append(message: Message) {
    this.messages.update(msgs => [...msgs, message]);
  }

  // Set messages
  setMessages(messages: Message[]) {
    this.messages.set(messages);
  }

  // Add attachment
  addAttachment(attachment: Attachment) {
    this.attachments.update(atts => [...atts, attachment]);
  }

  // Remove attachment
  removeAttachment(attachment: Attachment) {
    this.attachments.update(atts => atts.filter(a => a !== attachment));
  }

  // Get attachments (for display)
  getAttachments() {
    return this.attachments();
  }

  // Private: Stream response
  private async streamResponse(messageId: string, body: any): Promise<void> {
    this.abortController = new AbortController();

    try {
      const apiUrl = this.options.api || `${environment.apiUrl}/chat/conversations/${this.conversationId()}/messages`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(body),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'delta' && data.content) {
                // Update assistant message
                this.messages.update(msgs =>
                  msgs.map(m =>
                    m.id === messageId
                      ? { ...m, content: m.content + data.content }
                      : m
                  )
                );
              } else if (data.type === 'done') {
                this.isLoading.set(false);
                
                const finalMessage = this.messages().find(m => m.id === messageId);
                if (finalMessage && this.options.onFinish) {
                  this.options.onFinish(finalMessage);
                }
                
                reader.cancel();
                return;
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Stream error');
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }

      this.isLoading.set(false);
    } catch (error: any) {
      console.error('Stream error:', error);
      
      if (error.name === 'AbortError') {
        // User stopped generation
        this.error.set(new Error('Generation stopped'));
      } else {
        this.error.set(error);
        if (this.options.onError) {
          this.options.onError(error);
        }
      }

      this.isLoading.set(false);
      
      // Remove assistant placeholder on error
      this.messages.update(msgs => msgs.filter(m => m.id !== messageId));
    } finally {
      this.abortController = null;
    }
  }

  // Private: Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
