import { Component, EventEmitter, Output, Input, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-input.component.html',
  styleUrls: ['./chat-input.component.scss']
})
export class ChatInputComponent implements AfterViewInit {
  @Input() disabled = false;
  @Input() placeholder = 'Type your message...';
  @Output() messageSent = new EventEmitter<string>();

  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

  messageText = '';

  get characterCount(): number {
    return this.messageText.length;
  }

  ngAfterViewInit() {
    // Focus on input after view init
    setTimeout(() => {
      this.messageInput?.nativeElement?.focus();
    }, 100);
  }

  onKeyDown(event: KeyboardEvent) {
    // Send on Enter (without Shift)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage() {
    const text = this.messageText.trim();
    
    if (!text || this.disabled) {
      return;
    }

    // Check character limit
    if (text.length > 32000) {
      alert('Message is too long. Maximum 32,000 characters allowed.');
      return;
    }

    this.messageSent.emit(text);
    this.messageText = '';
    
    // Reset textarea height
    this.resetHeight();
    
    // Focus back on input
    setTimeout(() => {
      this.messageInput?.nativeElement?.focus();
    }, 0);
  }

  autoResize() {
    const textarea = this.messageInput?.nativeElement;
    if (!textarea) return;

    // Reset height to calculate new height
    textarea.style.height = 'auto';
    
    // Set new height based on content
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = newHeight + 'px';
  }

  private resetHeight() {
    const textarea = this.messageInput?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
    }
  }
}
