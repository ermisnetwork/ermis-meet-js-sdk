// import { MeetingClient } from '../dist/ermmis-meet-js-sdk.js';
import { MeetingClient } from '../../src/index';

// SDK đã build

// Token giả định từ server
const token: string =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ0dWFubnQyMDU5MUBnbWFpbC5jb20iLCJleHAiOjE4NTg1OTg3OTI1Mzd9.k2cnhjC7TpZms9pJA0Nv2FGXrh1uV-avTSzGK3SpcpGcDrHVna8ytXINtA2cJ2cwMfuyqjwEuG91V_h3GwXldoFsvDqNGLWKwF6-gaGznV75vufrt-1VdhoUu4GvEiPFHU9dYrIlwYZpcFaa38AVIPb9mPX44do702e3Ni64xCZB-2d4JMQRRD0xsL9NWy3akkdX2POzyE_NW8ulAmsjLY_Nph0BPf2bl-XAOCC-azZET2lQ9ejb8MyMbFBz9QYR9PeilNBcBP_uWeq8DauqcSmvgYqjXhD44d55vY6IuRZm1qMRIvCDc8nHFvIsaKAVpGNr6D6n_6EnByyheWueRQ';

const baseUrl = 'https://stream-gate.bandia.vn'; // URL API của Ermis

// Init client
const client = new MeetingClient(token, baseUrl);

const localVideoContainer = document.getElementById('local-video') as HTMLDivElement;
const remoteVideosContainer = document.getElementById('remote-videos') as HTMLDivElement;

document.getElementById('createRoom')!.onclick = async () => {
  const input = document.getElementById('roomNameInput') as HTMLInputElement;
  const roomName = input?.value?.trim() || 'Demo Room';
  const room = await client.createRoom(roomName);
  console.log('MeetingClient initialized:', client);
  console.log('Room created:', room);
};

document.getElementById('joinRoom')!.onclick = async () => {
  // const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

  // // Hiển thị video local
  // const localVideo = document.createElement('video');
  // localVideo.srcObject = stream;
  // localVideo.autoplay = true;
  // localVideo.muted = true;
  // localVideoContainer.appendChild(localVideo);

  const input = document.getElementById('roomCodeInput') as HTMLInputElement;
  const roomCode = input?.value?.trim();

  if (!roomCode) {
    alert('Please enter a room code to join.');
    return;
  }

  await client.joinRoom(roomCode);

  // Lắng nghe participant mới
  // client.on('participant-joined', (participant: any) => {
  //   const remoteVideo = document.createElement('video');
  //   remoteVideo.id = `participant-${participant.id}`;
  //   remoteVideo.srcObject = participant.stream;
  //   remoteVideo.autoplay = true;
  //   remoteVideosContainer.appendChild(remoteVideo);
  // });

  // Lắng nghe participant rời phòng
  // client.on('participant-left', (participant: any) => {
  //   const el = document.getElementById(`participant-${participant.id}`);
  //   if (el) el.remove();
  // });
};

document.getElementById('leaveRoom')!.onclick = async () => {
  await client.leaveRoom();
  localVideoContainer.innerHTML = '';
  remoteVideosContainer.innerHTML = '';
};
