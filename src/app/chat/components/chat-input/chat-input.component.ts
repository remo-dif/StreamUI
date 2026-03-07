import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Attachment } from "@shared/models";

@Component({
  selector: "app-chat-input",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./chat-input.component.html",
  styleUrls: ["./chat-input.component.scss"],
})
export class ChatInputComponent {
  @Input() input = "";
  @Input() isLoading = false;
  @Input() attachments: Attachment[] = [];

  @Output() inputChange = new EventEmitter<Event>();
  @Output() submitMessage = new EventEmitter<Event>();
  @Output() stop = new EventEmitter<void>();
  @Output() attachmentAdded = new EventEmitter<Attachment>();
  @Output() attachmentRemoved = new EventEmitter<Attachment>();

  onKeyDown(event: Event) {
    const ke = event as KeyboardEvent;
    if (ke.key === "Enter" && !ke.shiftKey) {
      ke.preventDefault();
      this.submitMessage.emit(ke);
    }
  }

  async onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files) return;

    for (const file of files) {
      const base64 = await this.fileToBase64(file);

      this.attachmentAdded.emit({
        name: file.name,
        contentType: file.type,
        url: base64,
        size: file.size,
      });
    }

    input.value = "";
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
