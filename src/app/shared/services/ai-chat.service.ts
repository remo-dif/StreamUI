import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ChatService } from '../../chat/services/chat.service';
import { Attachment, Message } from '@shared/models';

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private chatService = inject(ChatService);

  // Core state signals
  messages = signal<Message[]>([]);
  input = signal('');
  isLoading = signal(false);
  isStreaming = signal(false);
  error = signal<string | null>(null);

  // computed helper for convenient consumption
  hasMessages = computed(() => this.messages().length > 0);

  constructor() {
    // example side effect which might log errors or similar
    effect(() => {
      if (this.error()) {
        console.error('AI chat error:', this.error());
      }
    });
  }

  send(conversationId: string, content: string, attachments?: Attachment[]) {
    if (!conversationId) {
      throw new Error('conversationId is required');
    }
    if (!content && !attachments?.length) {
      return;
    }

    const optimistic = this.chatService.createOptimisticMessage(conversationId, content, attachments);
    this.messages.update(msgs => [...msgs, optimistic]);

    const placeholder = this.chatService.createAssistantMessagePlaceholder(conversationId);
    this.messages.update(msgs => [...msgs, placeholder]);

    this.isStreaming.set(true);
    this.chatService.sendMessageStream(conversationId, { content, attachments })
      .subscribe({
        next: (ev) => {
          if (ev.type === 'delta' && ev.content) {
            this.messages.update(msgs =>
              msgs.map(m => m.id === placeholder.id
                ? { ...m, content: m.content + ev.content }
                : m
              )
            );
          } else if (ev.type === 'done') {
            this.isStreaming.set(false);
            if (ev.usage) {
              this.messages.update(msgs =>
                msgs.map(m =>
                  m.id === placeholder.id
                    ? { ...m, tokens: ev.usage!.totalTokens }
                    : m
                )
              );
            }
          } else if (ev.type === 'error') {
            this.error.set(ev.error || 'Failed to send');
            this.isStreaming.set(false);
          }
        },
        error: (err) => {
          console.error(err);
          this.error.set('Streaming failed');
          this.isStreaming.set(false);
        }
      });
  }

  reload() {
    // simply rerun the last message by re-sending the content of the last user message
    const last = this.messages().filter(m => m.role === 'user').slice(-1)[0];
    if (last) {
      this.send(last.conversationId, last.content, last.attachments);
    }
  }

  stop() {
    this.chatService.stopStreaming();
    this.isStreaming.set(false);
  }

  append(msg: Message) {
    this.messages.update(msgs => [...msgs, msg]);
  }

  setMessages(msgs: Message[]) {
    this.messages.set(msgs);
  }

  clearError() {
    this.error.set(null);
  }
}
