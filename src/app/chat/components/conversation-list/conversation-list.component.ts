import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Conversation } from '@shared/models';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss']
})
export class ConversationListComponent {
  @Input({ required: true }) conversations: Conversation[] = [];
  @Input() activeConversationId: string | null = null;
  @Input() isLoading = false;

  @Output() conversationSelected = new EventEmitter<string>();
  @Output() conversationDeleted = new EventEmitter<string>();

  selectConversation(conversationId: string) {
    this.conversationSelected.emit(conversationId);
  }

  onDelete(event: Event, conversationId: string) {
    event.stopPropagation(); // Prevent selecting conversation when deleting
    this.conversationDeleted.emit(conversationId);
  }

  formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    // More than a week, show date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}
