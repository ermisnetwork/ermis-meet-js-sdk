export class VideoManager {
  private stream: MediaStream | null = null;

  async enableCamera() {
    this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
    console.log('Camera enabled');
    return this.stream;
  }

  disableCamera() {
    if (this.stream) {
      this.stream.getVideoTracks().forEach((track) => track.stop());
      console.log('Camera disabled');
      this.stream = null;
    }
  }
}
