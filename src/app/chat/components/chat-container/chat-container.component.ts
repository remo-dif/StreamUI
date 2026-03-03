import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Conversation } from '@shared/models';
import { UseChatService } from '@shared/services/use-chat.service';
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
    ConversationListComponent,
  ],
  providers: [UseChatService],
  templateUrl: './chat-container.component.html',
  styleUrls: ['./chat-container.component.scss']
})
export class ChatContainerComponent implements OnInit {
  chat = inject(UseChatService);
  private chatService: ChatService = inject(ChatService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  conversations = signal<Conversation[]>([]);
  activeConversationId = signal<string | null>(null);
  activeConversation = computed(() =>
    this.conversations().find(c => c.id === this.activeConversationId())
  );

  ngOnInit() {
    this.loadConversations();
    
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.selectConversation(params['id']);
      }
    });
  }

  loadConversations() {
    this.chatService.getConversations().subscribe({
      next: (response) => {
        this.conversations.set(response.data);
      }
    });
  }

  selectConversation(conversationId: string) {
    this.activeConversationId.set(conversationId);
    
    // Initialize chat service with conversation id
    this.chat.init({
      id: conversationId,
      onFinish: (message) => {
        console.log('Message completed:', message);
      },
      onError: (error) => {
        console.error('Chat error:', error);
      }
    });

    // load message history
    this.chatService.getMessages(conversationId).subscribe({
      next: (messages) => {
        this.chat.setMessages(messages as any);
      }
    });
  }

  createNewConversation() {
    this.chatService.createConversation('New Conversation').subscribe({
      next: (conversation) => {
        this.conversations.update(convs => [conversation, ...convs]);
        this.router.navigate(['/chat', conversation.id]);
      }
    });
  }
}
