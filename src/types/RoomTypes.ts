export interface RoomInfo {
  id: string;
  room_code: string;
  user_id: string;
  room_name: string;
  room_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  stream_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface GetRoomByIdResponse {
  room: RoomInfo;
  members: RoomMember[];
}
