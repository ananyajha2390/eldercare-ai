/**
 * CallProvider abstraction for ElderCare AI
 * Supports both Interactive Browser Audio and Simulated Mobile Phone Call experiences.
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

export interface TelephonyCallOptions {
  memberName?: string;
  elderlyName?: string;
  promptIntro?: string;
  message?: string;
  language?: string;
}

export interface TelephonyCallResult {
  success: boolean;
  callSid: string;
  callId: string;
  status: string;
  to: string;
  from: string;
  dateCreated?: string;
  message: string;
  spokenMessage?: string;
  error?: string;
  code?: string;
  twilioCode?: number;
}

export class TelephonyCallProvider implements CallProvider {
  async startCall(targetPhone: string, options?: TelephonyCallOptions): Promise<{ callId: string; status: string; callSid?: string; message?: string }> {
    const callId = `care-call-${Date.now()}`;
    return {
      callId,
      callSid: callId,
      status: 'ringing',
      message: `Simulated AI call connected to ${targetPhone}`,
    };
  }

  async endCall(callId: string): Promise<void> {
    // End simulated call
  }

  async getCallStatus(callId: string): Promise<CallStatus> {
    return {
      callId,
      status: 'connected',
      durationSeconds: 15,
      provider: 'telephony',
      targetNumber: '+91 98765 43210',
    };
  }

  async getGatewayStatus(): Promise<{
    isConfigured: boolean;
    provider: string;
    phoneNumber: string | null;
    callerNumber: string | null;
    statusText: string;
  }> {
    return {
      isConfigured: true,
      provider: 'demo_voice',
      phoneNumber: '+91 98110 43210',
      callerNumber: '+91 98110 43210',
      statusText: 'ElderCare AI Voice Gateway Ready (Interactive Call Simulation)',
    };
  }

  sendAudio(data: ArrayBuffer): void {
    // Simulated audio stream
  }

  receiveAudio(callback: (data: ArrayBuffer) => void): void {
    // Simulated audio stream receiver
  }
}

export const defaultBrowserCallProvider = new BrowserCallProvider();
export const defaultTelephonyCallProvider = new TelephonyCallProvider();
