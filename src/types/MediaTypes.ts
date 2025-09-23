export interface MediaStreamInfo {
  stream: MediaStream;
  type: 'audio' | 'video' | 'screen';
  enabled: boolean;
}

export enum MediaState {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}
