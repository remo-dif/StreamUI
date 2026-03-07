import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import {
  Conversation,
  Message,
  MessageRole,
  SendMessageRequest,
  StreamEvent,
  PaginatedResponse,
  Attachment
} from '@shared/models';

@Injectable({
  providedIn: 'root'
})
// Implementation follows patterns described in the AI SDK chat UI docs:
// https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
export class ChatService {
  private http = inject(HttpClient);

  // controller used for streaming requests so that we can cancel them
  private abortController: AbortController | null = null;

  // ──────────────────────────────────────────────────────────
  // Conversation Management
  // ──────────────────────────────────────────────────────────

  createConversation(title?: string): Observable<Conversation> {
    return this.http.post<Conversation>(
      `${environment.apiUrl}/chat/conversations`,
      { title }
    );
  }

  getConversations(page = 1, limit = 20): Observable<PaginatedResponse<Conversation>> {
    return this.http.get<PaginatedResponse<Conversation>>(
      `${environment.apiUrl}/chat/conversations`,
      { params: { page: page.toString(), limit: limit.toString() } }
    ).pipe(
      map(response => ({
        ...response,
        data: response.data || (response as any).conversations || []
      }))
    );
  }

  getMessages(conversationId: string): Observable<Message[]> {
    return this.http.get<{ messages: Message[] }>(
      `${environment.apiUrl}/chat/conversations/${conversationId}/messages`
    ).pipe(
      map(response => response.messages)
    );
  }

  deleteConversation(conversationId: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/chat/conversations/${conversationId}`
    );
  }

  // ──────────────────────────────────────────────────────────
  // Message Sending (Non-Streaming)
  // ──────────────────────────────────────────────────────────

  sendMessage(conversationId: string, request: SendMessageRequest): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/chat/conversations/${conversationId}/messages`,
      request
    );
  }

  // ──────────────────────────────────────────────────────────
  // SSE Streaming (Server-Sent Events)
  // ──────────────────────────────────────────────────────────

  sendMessageStream(
    conversationId: string,
    request: SendMessageRequest
  ): Observable<StreamEvent> {
    const subject = new Subject<StreamEvent>();
    
    // cancel any existing streaming call first
    this.abortController?.abort();

    // create new controller for this stream
    this.abortController = new AbortController();

    const url = `${environment.apiUrl}/chat/conversations/${conversationId}/messages`;
    this.streamWithFetch(url, request, subject, this.abortController);

    return subject.asObservable();
  }

  private async streamWithFetch(
    url: string,
    body: any,
    subject: Subject<StreamEvent>,
    controller: AbortController
  ): Promise<void> {
    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
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

        if (done) {
          subject.complete();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              subject.next(data as StreamEvent);

              // Complete stream when done
              if (data.type === 'done' || data.type === 'error') {
                subject.complete();
                reader.cancel();
                return;
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error);
            }
          }
        }
      }
    } catch (error: any) {
      // if the fetch was aborted, we treat it as a controlled stop
      if (error.name === 'AbortError') {
        console.log('Stream aborted by user');
        subject.complete();
      } else {
        console.error('Stream error:', error);
        subject.error(error);
      }
    } finally {
      // clear controller when done
      if (this.abortController === controller) {
        this.abortController = null;
      }
    }
  }

  /**
   * Stops the current streaming request (if any).
   * The EventSource Observable will complete internally.
   */
  stopStreaming(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  // ──────────────────────────────────────────────────────────
  // Helper: Optimistic Message Update
  // ──────────────────────────────────────────────────────────

  createOptimisticMessage(conversationId: string, content: string, attachments?: Attachment[]): Message {
    return {
      id: `temp-${Date.now()}`,
      conversationId,
      role: MessageRole.USER,
      content,
      tokens: null,
      createdAt: new Date().toISOString(),
      ...(attachments ? { attachments } : {})
    } as Message;
  }

  createAssistantMessagePlaceholder(conversationId: string): Message {
    return {
      id: `temp-assistant-${Date.now()}`,
      conversationId,
      role: MessageRole.ASSISTANT,
      content: '',
      tokens: null,
      createdAt: new Date().toISOString()
    };
  }
}
