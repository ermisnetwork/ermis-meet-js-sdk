export interface RoomInfo {
  roomId: string;
  name?: string;
  createdAt: Date;
  createdBy: string;
}

export interface MeetingConfig {
  token: string;
}

export interface JoinOptions {
  roomId: string;
  audio?: boolean;
  video?: boolean;
}
