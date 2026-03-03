import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Attachment } from '@shared/models';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-input-container">
      <!-- Attachments preview -->
      @if (attachments.length > 0) {
        <div class="attachments-area">
          @for (file of attachments; track file.name) {
            <div class="attachment-chip">
              <span>{{ file.name }}</span>
              <button (click)="attachmentRemoved.emit(file)">×</button>
            </div>
          }
        </div>
      }

      <form (submit)="submit.emit($event)">
        <div class="input-wrapper">
          <!-- Attach button -->
          <button 
            type="button"
            class="attach-btn"
            (click)="fileInput.click()">
            📎
          </button>

          <input
            #fileInput
            type="file"
            hidden
            multiple
            accept="image/*,.pdf"
            (change)="onFilesSelected($event)">

          <!-- Textarea -->
          <textarea
            [value]="input"
            (input)="inputChange.emit($event)"
            [placeholder]="isLoading ? 'AI is responding...' : 'Type your message...'"
            [disabled]="isLoading"
            (keydown.enter)="onKeyDown($event)">
          </textarea>

          <!-- Submit/Stop button -->
          @if (isLoading) {
            <button 
              type="button"
              class="stop-button"
              (click)="stop.emit()">
              ⬛ Stop
            </button>
          } @else {
            <button 
              type="submit"
              class="send-button"
              [disabled]="!input.trim() && attachments.length === 0">
              ➤ Send
            </button>
          }
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./chat-input.component.scss']
})
export class ChatInputComponent {
  @Input() input = '';
  @Input() isLoading = false;
  @Input() attachments: Attachment[] = [];
  
  @Output() inputChange = new EventEmitter<Event>();
  @Output() submit = new EventEmitter<Event>();
  @Output() stop = new EventEmitter<void>();
  @Output() attachmentAdded = new EventEmitter<Attachment>();
  @Output() attachmentRemoved = new EventEmitter<Attachment>();

  onKeyDown(event: Event) {
    const ke = event as KeyboardEvent;
    if (ke.key === 'Enter' && !ke.shiftKey) {
      ke.preventDefault();
      this.submit.emit(ke as any);
    }
  }

  async onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await this.fileToBase64(file);
      
      this.attachmentAdded.emit({
        name: file.name,
        contentType: file.type,
        url: base64,
        size: file.size,
      });
    }

    input.value = '';
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
