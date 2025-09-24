// import { AudioManager } from '../features/media/AudioManager';
// import { ScreenShareManager } from '../features/media/ScreenShareManager';
// import { VideoManager } from '../features/media/VideoManager';
// import { ParticipantManager } from '../features/participants/ParticipantManager';
// @ts-ignore
import { Publisher } from '../../public/publisher';
import type { GetRoomByIdResponse, RoomInfo, RoomMember } from '../types/RoomTypes';
// import { Connection } from './Connection';
import { EventEmitter } from './EventEmitter';

export class MeetingClient extends EventEmitter {
  token: string;

  baseUrl: string;

  baseUrlWebTP?: string;

  currentRoom: RoomInfo | null = null;

  membersRoom: RoomMember[] = [];

  publisher?: Publisher;

  // private connection: Connection;

  // public participants: ParticipantManager;

  // public audio: AudioManager;

  // public video: VideoManager;

  // public screen: ScreenShareManager;

  constructor(token: string, baseUrl: string) {
    super();
    this.token = token;
    this.baseUrl = baseUrl;
    this.baseUrlWebTP = 'https://hoangbim.bandia.vn:4433/stream-gate/meeting/wt';
    // this.connection = new Connection(token);
    // this.participants = new ParticipantManager();
    // this.audio = new AudioManager();
    // this.video = new VideoManager();
    // this.screen = new ScreenShareManager();
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
    // this.emit('roomCreated', room);
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
    const data = await response.json();

    this.setupMeeting(data.room_id, data.stream_id);

    // Optionally handle response data if needed
    // await this.connection.connect();
    // this.emit('joined', { room_code: code });
    return data;
  }

  async leaveRoom() {
    // await this.connection.disconnect();
    // this.emit('left', { roomId: this.currentRoom?.id });
  }

  /**
   * Lấy thông tin phòng và thành viên theo id
   */
  async getRoomById(roomId: string): Promise<GetRoomByIdResponse> {
    const url = `${this.baseUrl}/stream-gate/rooms/${roomId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to get room info');
    }
    const data = await response.json();
    this.membersRoom = data.members || [];
    this.currentRoom = data.room || null;
    return {
      room: data.room,
      members: data.members || [],
    };
  }

  private async setupMeeting(roomId: string, streamId: string): Promise<void> {
    const localVideoElement = document.createElement('video');
    localVideoElement.autoplay = true;
    localVideoElement.playsInline = true;

    try {
      this.publisher = new Publisher({
        publishUrl: `${this.baseUrlWebTP}/${roomId}/${streamId}`,
        streamType: 'camera',
        videoElement: localVideoElement,
        streamId: 'camera_stream',
        width: 1280,
        height: 720,
        framerate: 60,
        bitrate: 1_500_000,
        onStatus: (msg: any, isError: boolean) => {
          console.log('------Publisher status:------', msg, isError);
        },
        onServerEvent: async (event: any) => {
          console.log('------Publisher server event:------', event);
        },
      });
      await this.publisher.startPublishing();
    } catch (error) {
      console.error('---------Failed to start publisher:----------', error);
    }
  }
}
