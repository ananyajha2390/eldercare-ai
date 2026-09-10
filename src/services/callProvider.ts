/**
 * CallProvider abstraction for ElderCare AI
 * Prepares the architectural foundation for actual telephone calling (Twilio, Exotel, Plivo)
 * while operating seamlessly in Demo Mode with browser microphone and audio.
 */

export interface CallStatus {
  callId: string;
  status: 'idle' | 'initiating' | 'ringing' | 'connected' | 'ended' | 'failed';
  durationSeconds: number;
  provider: 'browser_demo' | 'telephony';
  targetNumber?: string;
  error?: string;
}

export interface CallProvider {
  startCall(targetPhone?: string, options?: { promptIntro?: string; language?: string }): Promise<{ callId: string; status: string }>;
  endCall(callId: string): Promise<void>;
  getCallStatus(callId: string): Promise<CallStatus>;
  sendAudio(data: ArrayBuffer): void;
  receiveAudio(callback: (data: ArrayBuffer) => void): void;
}

export class BrowserCallProvider implements CallProvider {
  private currentCallId: string | null = null;
  private status: CallStatus['status'] = 'idle';
  private duration = 0;
  private durationTimer: any = null;
  private audioCallback: ((data: ArrayBuffer) => void) | null = null;

  async startCall(targetPhone = '+91 98110 43210'): Promise<{ callId: string; status: string }> {
    this.currentCallId = `demo-call-${Date.now()}`;
    this.status = 'ringing';
    this.duration = 0;

    if (this.durationTimer) clearInterval(this.durationTimer);
    this.durationTimer = setInterval(() => {
      if (this.status === 'connected') {
        this.duration += 1;
      }
    }, 1000);

    return { callId: this.currentCallId, status: 'ringing' };
  }

  setConnected() {
    this.status = 'connected';
  }

  async endCall(callId: string): Promise<void> {
    this.status = 'ended';
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  async getCallStatus(callId: string): Promise<CallStatus> {
    return {
      callId: this.currentCallId || callId,
      status: this.status,
      durationSeconds: this.duration,
      provider: 'browser_demo',
      targetNumber: '+91 98110 43210 (Sharma ji)',
    };
  }

  sendAudio(data: ArrayBuffer): void {
    // In demo mode, sent to WebSocket Live bridge
  }

  receiveAudio(callback: (data: ArrayBuffer) => void): void {
    this.audioCallback = callback;
  }
}

export class TelephonyCallProvider implements CallProvider {
  private serverEndpoint = '/api/telephony';

  async startCall(targetPhone: string): Promise<{ callId: string; status: string }> {
    const res = await fetch(`${this.serverEndpoint}/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPhone }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Telephony provider not configured on server');
    }
    return res.json();
  }

  async endCall(callId: string): Promise<void> {
    await fetch(`${this.serverEndpoint}/hangup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId }),
    });
  }

  async getCallStatus(callId: string): Promise<CallStatus> {
    const res = await fetch(`${this.serverEndpoint}/status?callId=${encodeURIComponent(callId)}`);
    return res.json();
  }

  sendAudio(data: ArrayBuffer): void {
    // Streams binary audio packets to telephony bridge
  }

  receiveAudio(callback: (data: ArrayBuffer) => void): void {
    // Telephony inbound media webhook receiver
  }
}

export const defaultBrowserCallProvider = new BrowserCallProvider();
