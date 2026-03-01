import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '@shared/models';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.scss']
})
export class ChatMessageComponent {
  @Input({ required: true }) message!: Message;
  @Input() isStreaming = false;

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  formatContent(content: string): string {
    // Basic markdown-like formatting
    // For production, use a library like 'marked' or 'ngx-markdown'
    
    if (!content) return '';

    // Escape HTML
    let formatted = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks ```code```
    formatted = formatted.replace(
      /```([\s\S]*?)```/g, 
      '<pre><code>$1</code></pre>'
    );

    // Inline code `code`
    formatted = formatted.replace(
      /`([^`]+)`/g, 
      '<code>$1</code>'
    );

    // Bold **text**
    formatted = formatted.replace(
      /\*\*([^*]+)\*\*/g, 
      '<strong>$1</strong>'
    );

    // Italic *text*
    formatted = formatted.replace(
      /\*([^*]+)\*/g, 
      '<em>$1</em>'
    );

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  }
}
