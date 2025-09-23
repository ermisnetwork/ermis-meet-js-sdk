import { AudioManager } from '../features/media/AudioManager';
import { ScreenShareManager } from '../features/media/ScreenShareManager';
import { VideoManager } from '../features/media/VideoManager';
import { ParticipantManager } from '../features/participants/ParticipantManager';
import { Connection } from './Connection';
import { EventEmitter } from './EventEmitter';

interface RoomInfo {
  id: string;
  room_code: string;
  user_id: string;
  room_name: string;
  room_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class MeetingClient extends EventEmitter {
  private connection: Connection;

  private token: string;

  private currentRoom: RoomInfo | null = null;

  public participants: ParticipantManager;

  public audio: AudioManager;

  public video: VideoManager;

  public screen: ScreenShareManager;

  private baseUrl: string;

  constructor(token: string, baseUrl: string) {
    super();
    this.token = token;
    this.baseUrl = baseUrl;
    this.connection = new Connection(token);
    this.participants = new ParticipantManager();
    this.audio = new AudioManager();
    this.video = new VideoManager();
    this.screen = new ScreenShareManager();
  }

  /**
   * Tạo phòng meeting mới
   */
  async createRoom(roomName: string): Promise<RoomInfo> {
    const url = this.baseUrl + '/stream-gate/rooms';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ room_name: roomName, room_type: 'main' }),
    });

    if (!response.ok) {
      throw new Error('Failed to create room');
    }

    const data = await response.json();
    // Map response fields to RoomInfo
    const room: RoomInfo = {
      id: data.id || '',
      room_code: data.room_code || '',
      user_id: data.user_id || '',
      room_name: data.room_name || '',
      room_type: data.room_type || '',
      is_active: data.is_active ?? true,
      created_at: data.created_at || '',
      updated_at: data.updated_at || '',
    };
    this.currentRoom = room;
    this.emit('roomCreated', room);
    return room;
  }

  /**
   * Join vào phòng (cần phòng đã được tạo hoặc có sẵn)
   */
  async joinRoom(room_code?: string) {
    const code = room_code || this.currentRoom?.room_code;
    if (!code) {
      throw new Error('No room_code specified. Please call createRoom() or pass room_code.');
    }

    const url = this.baseUrl + '/stream-gate/rooms/join';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ app_name: 'Ermis-Meeting', room_code: code }),
    });

    if (!response.ok) {
      throw new Error('Failed to join room');
    }

    // Optionally handle response data if needed
    await this.connection.connect();
    this.emit('joined', { room_code: code });
  }

  async leaveRoom() {
    // await this.connection.disconnect();
    // this.emit('left', { roomId: this.currentRoom?.id });
  }
}
