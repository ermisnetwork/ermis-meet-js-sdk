export class AudioManager {
  private stream: MediaStream | null = null;

  async enableMic() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('Mic enabled');
    return this.stream;
  }

  disableMic() {
    if (this.stream) {
      this.stream.getAudioTracks().forEach((track) => track.stop());
      console.log('Mic disabled');
      this.stream = null;
    }
  }
}
