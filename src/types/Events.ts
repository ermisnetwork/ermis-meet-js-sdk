// Danh sách event mà SDK có thể emit
export enum MeetingEvents {
  ROOM_CREATED = 'roomCreated',
  JOINED = 'joined',
  LEFT = 'left',
  PARTICIPANT_JOINED = 'participantJoined',
  PARTICIPANT_LEFT = 'participantLeft',
  AUDIO_ENABLED = 'audioEnabled',
  AUDIO_DISABLED = 'audioDisabled',
  VIDEO_ENABLED = 'videoEnabled',
  VIDEO_DISABLED = 'videoDisabled',
  SCREEN_SHARE_STARTED = 'screenShareStarted',
  SCREEN_SHARE_STOPPED = 'screenShareStopped',
}

// payload cho từng event
export interface EventPayloads {
  [MeetingEvents.ROOM_CREATED]: { roomId: string; createdAt: Date; createdBy: string };
  [MeetingEvents.JOINED]: { roomId: string };
  [MeetingEvents.LEFT]: { roomId?: string };
  [MeetingEvents.PARTICIPANT_JOINED]: { participantId: string; name?: string };
  [MeetingEvents.PARTICIPANT_LEFT]: { participantId: string };
  [MeetingEvents.AUDIO_ENABLED]: { participantId: string };
  [MeetingEvents.AUDIO_DISABLED]: { participantId: string };
  [MeetingEvents.VIDEO_ENABLED]: { participantId: string };
  [MeetingEvents.VIDEO_DISABLED]: { participantId: string };
  [MeetingEvents.SCREEN_SHARE_STARTED]: { participantId: string };
  [MeetingEvents.SCREEN_SHARE_STOPPED]: { participantId: string };
}
