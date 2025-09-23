export function validateToken(token: string): boolean {
  return typeof token === 'string' && token.length > 10;
}

export function validateRoomId(roomId: string): boolean {
  return typeof roomId === 'string' && roomId.startsWith('room-');
}

export function validateMediaStream(stream: MediaStream | null): boolean {
  return stream instanceof MediaStream && stream.getTracks().length > 0;
}
