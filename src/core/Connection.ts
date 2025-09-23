export class Connection {
  private token: string;

  private connected = false;

  constructor(token: string) {
    this.token = token;
  }

  async connect() {
    // Ở đây bạn sẽ decode/verify token hoặc gọi API để lấy thông tin meeting
    console.log('Connecting with token:', this.token);
    this.connected = true;
  }

  async disconnect() {
    console.log('Disconnecting...');
    this.connected = false;
  }

  isConnected() {
    return this.connected;
  }
}
