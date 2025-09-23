export class ScreenShareManager {
  private stream: MediaStream | null = null;

  async startShare() {
    this.stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
    console.log('Screen sharing started');
    return this.stream;
  }

  stopShare() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      console.log('Screen sharing stopped');
      this.stream = null;
    }
  }
}
