import { AudioManager } from '../features/media/AudioManager';
import { ScreenShareManager } from '../features/media/ScreenShareManager';
import { VideoManager } from '../features/media/VideoManager';
import { ParticipantManager } from '../features/participants/ParticipantManager';
import { Connection } from './Connection';
import { EventEmitter } from './EventEmitter';

interface RoomInfo {
  roomId: string;
  createdAt: Date;
  createdBy: string;
}

export class MeetingClient extends EventEmitter {
  private connection: Connection;

  private token: string;

  private currentRoom: RoomInfo | null = null;

  public participants: ParticipantManager;

  public audio: AudioManager;

  public video: VideoManager;

  public screen: ScreenShareManager;

  constructor(token: string) {
    super();
    this.token = token;
    this.connection = new Connection(token);
    this.participants = new ParticipantManager();
    this.audio = new AudioManager();
    this.video = new VideoManager();
    this.screen = new ScreenShareManager();
  }

  /**
   * Tạo phòng meeting mới
   */
  async createRoom(): Promise<RoomInfo> {
    console.log('Creating room with token:', this.token);

    // giả lập gọi API backend
    const room: RoomInfo = {
      roomId: 'room-' + Math.random().toString(36).substring(2, 10),
      createdAt: new Date(),
      createdBy: 'user-from-token', // sau này decode token để lấy userId
    };
    this.currentRoom = room;
    this.emit('roomCreated', room);
    return room;
  }

  /**
   * Join vào phòng (cần phòng đã được tạo hoặc có sẵn)
   */
  async joinRoom(roomId?: string) {
    if (!this.currentRoom && !roomId) {
      throw new Error('No room specified. Please call createRoom() or pass roomId.');
    }

    await this.connection.connect();
    this.emit('joined', { roomId: roomId || this.currentRoom?.roomId });
  }

  async leaveRoom() {
    await this.connection.disconnect();
    this.emit('left', { roomId: this.currentRoom?.roomId });
  }
}
