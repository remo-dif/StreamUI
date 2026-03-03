import { Component, EventEmitter, Output, Input, ViewChild, ElementRef, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Attachment } from '@shared/models';

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
  @Input() isStreaming = false; // show stop button when true

  @Output() messageSent = new EventEmitter<{ content: string; attachments?: Attachment[] }>();
  @Output() stopStreaming = new EventEmitter<void>();

  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

  messageText = '';
  attachments = signal<Attachment[]>([]);

  // reference to hidden file input
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

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
      if (!this.isStreaming) {
        this.sendMessage();
      }
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

    this.messageSent.emit({
      content: text,
      attachments: this.attachments()
    });
    this.messageText = '';
    this.attachments.set([]);
    
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

  onAttachClick() {
    this.fileInput?.nativeElement?.click();
  }

  async onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);
    const attachments: Attachment[] = [];

    for (const file of files) {
      const dataUrl = await this.toDataUrl(file);
      attachments.push({
        name: file.name,
        contentType: file.type,
        url: dataUrl,
        size: file.size
      });
    }

    // append new attachments
    this.attachments.update(curr => [...curr, ...attachments]);

    // reset input so same file can be selected again if needed
    input.value = '';
  }

  removeAttachment(file: Attachment) {
    this.attachments.update(curr => curr.filter(f => f !== file));
  }

  private toDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    });
  }

  private resetHeight() {
    const textarea = this.messageInput?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
    }
  }
}
