import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Conversation, Message } from '@shared/models';
import { Subject, finalize, takeUntil } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { ConversationListComponent } from '../conversation-list/conversation-list.component';

@Component({
  selector: 'app-chat-container',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChatMessageComponent,
    ChatInputComponent,
    ConversationListComponent
  ],
  templateUrl: './chat-container.component.html',
  styleUrls: ['./chat-container.component.scss']
})
export class ChatContainerComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // Signals for reactive state
  conversations = signal<Conversation[]>([]);
  activeConversationId = signal<string | null>(null);
  activeConversation = computed(() => 
    this.conversations().find(c => c.id === this.activeConversationId()) || null
  );
  
  messages = signal<Message[]>([]);
  isLoadingConversations = signal(false);
  isLoadingMessages = signal(false);
  isStreaming = signal(false);
  isCreatingConversation = signal(false);
  streamingMessageId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadConversations();
    
    // Watch for route changes
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      if (params['id']) {
        this.selectConversation(params['id']);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────────────────
  // Conversation Management
  // ──────────────────────────────────────────────────────────

  loadConversations() {
    this.isLoadingConversations.set(true);
    
    this.chatService.getConversations().pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoadingConversations.set(false))
    ).subscribe({
      next: (response) => {
        this.conversations.set(response.data);
      },
      error: (error) => {
        console.error('Failed to load conversations:', error);
        this.errorMessage.set('Failed to load conversations');
      }
    });
  }

  createNewConversation() {
    this.isCreatingConversation.set(true);
    
    this.chatService.createConversation('New Conversation').pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isCreatingConversation.set(false))
    ).subscribe({
      next: (conversation) => {
        this.conversations.update(convs => [conversation, ...convs]);
        this.router.navigate(['/chat', conversation.id]);
      },
      error: (error) => {
        console.error('Failed to create conversation:', error);
        this.errorMessage.set('Failed to create conversation');
      }
    });
  }

  selectConversation(conversationId: string) {
    this.activeConversationId.set(conversationId);
    this.loadMessages(conversationId);
  }

  deleteConversation(conversationId: string) {
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    this.chatService.deleteConversation(conversationId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.conversations.update(convs => convs.filter(c => c.id !== conversationId));
        
        if (this.activeConversationId() === conversationId) {
          this.activeConversationId.set(null);
          this.messages.set([]);
          this.router.navigate(['/chat']);
        }
      },
      error: (error) => {
        console.error('Failed to delete conversation:', error);
        this.errorMessage.set('Failed to delete conversation');
      }
    });
  }

  // ──────────────────────────────────────────────────────────
  // Message Management
  // ──────────────────────────────────────────────────────────

  loadMessages(conversationId: string) {
    this.isLoadingMessages.set(true);
    
    this.chatService.getMessages(conversationId).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoadingMessages.set(false))
    ).subscribe({
      next: (messages) => {
        this.messages.set(messages);
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (error) => {
        console.error('Failed to load messages:', error);
        this.errorMessage.set('Failed to load messages');
      }
    });
  }

  sendMessage(content: string) {
    const conversationId = this.activeConversationId();
    if (!conversationId) return;

    // Optimistic UI update - add user message immediately
    const userMessage = this.chatService.createOptimisticMessage(conversationId, content);
    this.messages.update(msgs => [...msgs, userMessage]);
    this.scrollToBottom();

    // Create placeholder for assistant response
    const assistantPlaceholder = this.chatService.createAssistantMessagePlaceholder(conversationId);
    this.messages.update(msgs => [...msgs, assistantPlaceholder]);
    
    this.isStreaming.set(true);
    this.streamingMessageId.set(assistantPlaceholder.id);

    // Send message with streaming
    this.chatService.sendMessageStream(conversationId, { content }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (event) => {
        if (event.type === 'delta' && event.content) {
          // Update assistant message content
          this.messages.update(msgs => 
            msgs.map(msg => 
              msg.id === assistantPlaceholder.id
                ? { ...msg, content: msg.content + event.content }
                : msg
            )
          );
          this.scrollToBottom();
        } else if (event.type === 'done') {
          // Finalize message
          this.isStreaming.set(false);
          this.streamingMessageId.set(null);
          
          if (event.usage) {
            this.messages.update(msgs =>
              msgs.map(msg =>
                msg.id === assistantPlaceholder.id
                  ? { ...msg, tokens: event.usage!.totalTokens }
                  : msg
              )
            );
          }
        } else if (event.type === 'error') {
          this.errorMessage.set(event.error || 'Failed to send message');
          this.isStreaming.set(false);
          
          // Remove placeholder on error
          this.messages.update(msgs => 
            msgs.filter(msg => msg.id !== assistantPlaceholder.id)
          );
        }
      },
      error: (error) => {
        console.error('Stream error:', error);
        this.errorMessage.set('Failed to send message');
        this.isStreaming.set(false);
        
        // Remove placeholder on error
        this.messages.update(msgs => 
          msgs.filter(msg => msg.id !== assistantPlaceholder.id)
        );
      }
    });
  }

  // ──────────────────────────────────────────────────────────
  // Helper Methods
  // ──────────────────────────────────────────────────────────

  private scrollToBottom() {
    // Scroll to bottom will be handled by ViewChild in real implementation
    setTimeout(() => {
      const container = document.querySelector('.messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  }

  clearError() {
    this.errorMessage.set(null);
  }
}
