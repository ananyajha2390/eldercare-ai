import { ExtractedHealthData, SmartAlert } from '../types';
import { getHonorificName } from '../lib/nameUtils';

export type LiveConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type LiveVoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface HealthEventData {
  type: 'blood_pressure' | 'blood_glucose' | 'medication_confirmation' | 'mood' | 'general';
  systolic?: number;
  diastolic?: number;
  glucose?: number;
  medicationStatus?: 'taken' | 'missed';
  medicineName?: string;
  mood?: string;
  symptoms?: string[];
  isUnusual?: boolean;
  alertSeverity?: 'normal' | 'attention' | 'urgent';
  safeNote?: string;
}

export interface LiveClientCallbacks {
  onStatusChange?: (status: LiveConnectionStatus) => void;
  onVoiceStateChange?: (state: LiveVoiceState) => void;
  onMicStateChange?: (active: boolean) => void;
  onHealthEvent?: (event: HealthEventData) => void;
  onUserTranscript?: (text: string, isFinal: boolean) => void;
  onGeminiTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private status: LiveConnectionStatus = 'disconnected';
  private voiceState: LiveVoiceState = 'idle';
  private micActive: boolean = false;
  private lastError: string | null = null;
  private lastUserTranscript: string = '';
  private lastGeminiTranscript: string = '';

  private audioInputContext: AudioContext | null = null;
  private audioOutputContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;

  private activeSourceNodes: AudioBufferSourceNode[] = [];
  private nextPlaybackTime: number = 0;
  private callbacks: LiveClientCallbacks = {};

  private currentInputTranscriptAccumulator: string = '';
  private currentOutputTranscriptAccumulator: string = '';
  private userName?: string;

  constructor(callbacks: LiveClientCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public setUserName(name?: string) {
    this.userName = name;
  }

  public getUserName(): string | undefined {
    return this.userName;
  }

  public setCallbacks(callbacks: LiveClientCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public getStatus(): LiveConnectionStatus {
    return this.status;
  }

  public getVoiceState(): LiveVoiceState {
    return this.voiceState;
  }

  public isMicActive(): boolean {
    return this.micActive;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public getLastUserTranscript(): string {
    return this.lastUserTranscript;
  }

  public getLastGeminiTranscript(): string {
    return this.lastGeminiTranscript;
  }

  private setStatus(newStatus: LiveConnectionStatus) {
    this.status = newStatus;
    this.callbacks.onStatusChange?.(newStatus);
  }

  private setVoiceState(newState: LiveVoiceState) {
    this.voiceState = newState;
    this.callbacks.onVoiceStateChange?.(newState);
  }

  private setMicActive(active: boolean) {
    this.micActive = active;
    this.callbacks.onMicStateChange?.(active);
  }

  /**
   * Connect to the Gemini Live session over WebSocket
   */
  public async connect(options?: { userName?: string }): Promise<boolean> {
    if (options?.userName) {
      this.userName = options.userName;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return true;
    }

    this.setStatus('connecting');
    this.lastError = null;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const query = new URLSearchParams();
      if (this.userName && this.userName.trim()) {
        query.set('userName', this.userName.trim());
      }
      const queryString = query.toString() ? `?${query.toString()}` : '';
      const wsUrl = `${protocol}//${host}/live${queryString}`;

      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      return new Promise<boolean>((resolve) => {
        const connectionTimeout = setTimeout(() => {
          if (this.status === 'connecting') {
            this.handleError('Connection to Gemini timed out. Please check your network and API configuration.');
            ws.close();
            resolve(false);
          }
        }, 12000);

        ws.onopen = () => {
          // Handshake initiated
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            await this.handleServerMessage(data, resolve, connectionTimeout);
          } catch (err) {
            console.error('Error parsing live server message:', err);
          }
        };

        ws.onerror = (evt) => {
          console.error('Live WebSocket error:', evt);
          clearTimeout(connectionTimeout);
          this.handleError('Unable to connect to Gemini. Verify that GEMINI_API_KEY is configured on the server.');
          resolve(false);
        };

        ws.onclose = (evt) => {
          clearTimeout(connectionTimeout);
          this.setStatus('disconnected');
          this.setVoiceState('idle');
          this.stopMicrophone();
          if (evt.code !== 1000 && !this.lastError) {
            this.handleError(`Live session closed (${evt.reason || 'code ' + evt.code})`);
          }
        };
      });
    } catch (err: any) {
      this.handleError(err.message || 'Unable to establish WebSocket connection');
      return false;
    }
  }

  /**
   * Disconnect from Gemini Live
   */
  public disconnect() {
    this.stopMicrophone();
    this.stopAudioPlayback();
    if (this.ws) {
      this.ws.close(1000, 'User initiated disconnect');
      this.ws = null;
    }
    this.setStatus('disconnected');
    this.setVoiceState('idle');
  }

  /**
   * Handle server messages from the backend Live bridge
   */
  private async handleServerMessage(
    data: any,
    resolveConnect?: (val: boolean) => void,
    timeoutId?: NodeJS.Timeout
  ) {
    switch (data.type) {
      case 'connected':
        if (timeoutId) clearTimeout(timeoutId);
        this.setStatus('connected');
        this.setVoiceState('idle');
        resolveConnect?.(true);
        // Start microphone capture once connected
        await this.startMicrophone();
        // If userName is present, send context to Gemini Live
        if (this.userName && this.userName.trim()) {
          const honorific = getHonorificName(this.userName);
          setTimeout(() => {
            this.sendTextMessage(
              `System: The user has connected. The user's name is ${this.userName?.trim()}. Address the user naturally as ${honorific}. Never address the user as Sharma ji unless their actual surname is Sharma.`
            );
          }, 300);
        }
        break;

      case 'audio':
        // Native PCM audio chunk from Gemini (24kHz)
        if (data.audio) {
          this.setVoiceState('speaking');
          await this.queueAudioChunk(data.audio);
        }
        break;

      case 'transcript_input':
        // User speech transcribed by Gemini
        if (data.text) {
          this.currentInputTranscriptAccumulator = data.finished
            ? `${this.currentInputTranscriptAccumulator} ${data.text}`.trim()
            : data.text;
          this.lastUserTranscript = data.text;
          this.callbacks.onUserTranscript?.(data.text, Boolean(data.finished));
          if (data.finished) {
            this.setVoiceState('thinking');
          }
        }
        break;

      case 'transcript_output':
        // Assistant speech transcribed by Gemini
        if (data.text) {
          this.currentOutputTranscriptAccumulator = data.finished
            ? `${this.currentOutputTranscriptAccumulator} ${data.text}`.trim()
            : `${this.currentOutputTranscriptAccumulator}${data.text}`;
          this.lastGeminiTranscript = data.text;
          this.callbacks.onGeminiTranscript?.(data.text, Boolean(data.finished));
        }
        break;

      case 'interrupted':
        // User interrupted Gemini speaking
        this.stopAudioPlayback();
        this.setVoiceState('listening');
        break;

      case 'turn_complete':
        this.currentOutputTranscriptAccumulator = '';
        if (this.activeSourceNodes.length === 0) {
          this.setVoiceState(this.micActive ? 'listening' : 'idle');
        }
        break;

      case 'health_event':
        // Structured health event extracted by Gemini tool calling
        if (data.data) {
          this.callbacks.onHealthEvent?.(data.data);
        }
        break;

      case 'error':
        this.handleError(data.error || 'Gemini Live error received');
        break;

      default:
        break;
    }
  }

  private handleError(errorMsg: string) {
    this.lastError = errorMsg;
    this.setStatus('error');
    this.setVoiceState('idle');
    this.callbacks.onError?.(errorMsg);
  }

  /**
   * Start microphone capture and PCM stream
   */
  public async startMicrophone(): Promise<boolean> {
    try {
      if (this.mediaStream) {
        this.setMicActive(true);
        this.setVoiceState('listening');
        return true;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      this.audioInputContext = audioCtx;

      const sourceNode = audioCtx.createMediaStreamSource(stream);
      this.micSourceNode = sourceNode;

      // Use ScriptProcessorNode for wide browser support
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      this.processorNode = processor;

      processor.onaudioprocess = (e) => {
        if (!this.micActive || this.status !== 'connected' || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
          return;
        }

        // If Gemini is currently speaking, mute/ignore mic to avoid feedback unless user speaks loudly
        if (this.voiceState === 'speaking') {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32Array to 16-bit PCM little-endian
        const pcm16 = this.floatTo16BitPCM(inputData);
        const base64Audio = this.arrayBufferToBase64(pcm16.buffer);

        this.ws.send(
          JSON.stringify({
            type: 'audio',
            audio: base64Audio,
          })
        );
      };

      sourceNode.connect(processor);
      processor.connect(audioCtx.destination);

      this.setMicActive(true);
      this.setVoiceState('listening');
      return true;
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      let message = 'Microphone permission denied or device not found.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Microphone permission denied. Please grant microphone access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        message = 'No microphone device was detected on your system.';
      }
      this.handleError(message);
      this.setMicActive(false);
      return false;
    }
  }

  /**
   * Stop microphone stream
   */
  public stopMicrophone() {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.micSourceNode) {
      this.micSourceNode.disconnect();
      this.micSourceNode = null;
    }
    if (this.audioInputContext) {
      this.audioInputContext.close().catch(() => {});
      this.audioInputContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    this.setMicActive(false);
    if (this.voiceState === 'listening') {
      this.setVoiceState('idle');
    }
  }

  /**
   * Send text message to the live session
   */
  public sendTextMessage(text: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.handleError('Gemini is not connected. Please click "Talk to ElderCare" to connect.');
      return false;
    }

    this.setVoiceState('thinking');
    this.ws.send(
      JSON.stringify({
        type: 'text',
        text,
      })
    );
    return true;
  }

  /**
   * Decode base64 24kHz 16-bit PCM and schedule playback
   */
  private async queueAudioChunk(base64Audio: string) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioOutputContext || this.audioOutputContext.state === 'closed') {
        this.audioOutputContext = new AudioCtx({ sampleRate: 24000 });
      }

      if (this.audioOutputContext.state === 'suspended') {
        await this.audioOutputContext.resume();
      }

      const pcmBytes = this.base64ToArrayBuffer(base64Audio);
      const float32 = this.pcm16ToFloat32(new Int16Array(pcmBytes));

      const audioBuffer = this.audioOutputContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const sourceNode = this.audioOutputContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.audioOutputContext.destination);

      const now = this.audioOutputContext.currentTime;
      const startTime = Math.max(now, this.nextPlaybackTime);
      sourceNode.start(startTime);
      this.nextPlaybackTime = startTime + audioBuffer.duration;

      this.activeSourceNodes.push(sourceNode);

      sourceNode.onended = () => {
        const idx = this.activeSourceNodes.indexOf(sourceNode);
        if (idx !== -1) {
          this.activeSourceNodes.splice(idx, 1);
        }
        if (this.activeSourceNodes.length === 0) {
          this.setVoiceState(this.micActive ? 'listening' : 'idle');
        }
      };
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  }

  /**
   * Stop currently playing audio and clear scheduled nodes
   */
  public stopAudioPlayback() {
    for (const node of this.activeSourceNodes) {
      try {
        node.stop();
        node.disconnect();
      } catch {}
    }
    this.activeSourceNodes = [];
    if (this.audioOutputContext) {
      this.nextPlaybackTime = this.audioOutputContext.currentTime;
    }
  }

  // --- Audio Conversion Utilities ---

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  private pcm16ToFloat32(input: Int16Array): Float32Array {
    const output = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) {
      output[i] = input[i] / 32768.0;
    }
    return output;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
