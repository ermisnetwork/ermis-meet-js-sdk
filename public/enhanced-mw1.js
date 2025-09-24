// Enhanced Per-Stream Media Worker - each stream has its own decoders
import { OpusAudioDecoder } from './opus_decoder/opusDecoder';
import './polyfills/audioData';
import './polyfills/encodedAudioChunk';

// Per-stream data
let streams = new Map(); // streamId -> stream data
let channelPorts = new Map(); // subscriberId -> MessagePort

// Stream data structure:
// {
//   subscriberId,
//   mediaUrl,
//   websocket,
//   videoConfig,
//   audioConfig,
//   videoFrameRate,
//   audioFrameRate,
//   videoFrameBuffer: [],
//   audioFrameBuffer: [],
//   videoIntervalID,
//   audioIntervalID,
//   videoPlaybackStarted: false,
//   audioPlaybackStarted: false,
//   curVideoInterval,
//   curAudioInterval,
//   videoCodecReceived: false,
//   audioCodecReceived: false,
//   keyFrameReceived: false,
//   videoDecoder: null,      // Per-stream video decoder
//   audioDecoder: null,      // Per-stream audio decoder
//   channelPort: null
// }

// Create video decoder for specific stream
function createVideoDecoderForStream(streamId) {
  const stream = streams.get(streamId);
  if (!stream) return null;

  const videoDecoder = new VideoDecoder({
    output: (frame) => {
      self.postMessage(
        {
          type: 'videoData',
          frame: frame,
          streamId: streamId,
          subscriberId: stream.subscriberId,
        },
        [frame],
      );
    },
    error: (e) => {
      console.error(`Video decoder error for stream ${streamId}:`, e);
      self.postMessage({
        type: 'error',
        message: `Video decoder error for stream ${streamId}: ${e.message}`,
        error: 'video_decoder',
        streamId: streamId,
        subscriberId: stream.subscriberId,
      });
    },
  });

  return videoDecoder;
}

// Create audio decoder for specific stream
function createAudioDecoderForStream(streamId) {
  const stream = streams.get(streamId);
  if (!stream) return null;

  const audioDecoder = new OpusAudioDecoder({
    output: (audioData) => {
      const channelData = [];
      for (let i = 0; i < audioData.numberOfChannels; i++) {
        const channel = new Float32Array(audioData.numberOfFrames);
        audioData.copyTo(channel, { planeIndex: i });
        channelData.push(channel);
      }

      const channelPort = stream.channelPort;

      if (channelPort) {
        channelPort.postMessage(
          {
            type: 'audioData',
            channelData: channelData,
            timestamp: audioData.timestamp,
            sampleRate: audioData.sampleRate,
            numberOfFrames: audioData.numberOfFrames,
            numberOfChannels: audioData.numberOfChannels,
          },
          channelData.map((c) => c.buffer),
        );
      }

      audioData.close();
    },
    error: (e) => {
      console.error(`Audio decoder error for stream ${streamId}:`, e);
      self.postMessage({
        type: 'error',
        message: `Audio decoder error for stream ${streamId}: ${e.message}`,
        error: 'audio_decoder',
        streamId: streamId,
        subscriberId: stream.subscriberId,
      });
    },
  });

  return audioDecoder;
}

// Initialize decoders for specific stream
async function initializeDecodersForStream(streamId) {
  const stream = streams.get(streamId);
  if (!stream) return;

  try {
    self.postMessage({
      type: 'log',
      level: 'info',
      event: 'init-stream-decoders',
      message: `Initializing decoders for stream ${streamId}`,
      streamId: streamId,
      subscriberId: stream.subscriberId,
    });

    // Initialize video decoder for this stream
    stream.videoDecoder = createVideoDecoderForStream(streamId);

    // Initialize audio decoder for this stream
    stream.audioDecoder = createAudioDecoderForStream(streamId);

    self.postMessage({
      type: 'log',
      level: 'info',
      event: 'stream-decoders-init-success',
      message: `Decoders initialized successfully for stream ${streamId}`,
      streamId: streamId,
      subscriberId: stream.subscriberId,
    });
  } catch (error) {
    self.postMessage({
      type: 'log',
      level: 'error',
      event: 'stream-decoders-init-fail',
      message: `Failed to initialize decoders for stream ${streamId}: ${error.message}`,
      streamId: streamId,
      subscriberId: stream.subscriberId,
    });
    console.error(`Failed to initialize decoders for stream ${streamId}:`, error);
    throw error;
  }
}

// Create new stream
function createStream(subscriberId, streamConfig, channelPort) {
  const streamId = extractStreamIdFromUrl(streamConfig.mediaUrl);

  if (streams.has(streamId)) {
    console.warn(`Stream ${streamId} already exists, removing old one`);
    removeStream(streamId);
  }

  const stream = {
    subscriberId,
    streamId,
    mediaUrl: streamConfig.mediaUrl,
    websocket: null,
    videoConfig: null,
    audioConfig: null,
    videoFrameRate: null,
    audioFrameRate: null,
    videoFrameBuffer: [],
    audioFrameBuffer: [],
    videoIntervalID: null,
    audioIntervalID: null,
    videoPlaybackStarted: false,
    audioPlaybackStarted: false,
    curVideoInterval: null,
    curAudioInterval: null,
    videoCodecReceived: false,
    audioCodecReceived: false,
    keyFrameReceived: false,
    videoDecoder: null,
    audioDecoder: null,
    channelPort,
  };

  streams.set(streamId, stream);
  setupWebSocketForStream(streamId);

  console.log(`Created stream ${streamId} for subscriber ${subscriberId}`);
  return streamId;
}

// Extract stream ID from WebSocket URL
function extractStreamIdFromUrl(url) {
  // Extract from: wss://host/stream-gate/meeting/ws/{roomId}/{streamId}
  const parts = url.split('/');
  return parts[parts.length - 1];
}

// Setup WebSocket for specific stream
function setupWebSocketForStream(streamId) {
  const stream = streams.get(streamId);
  if (!stream) return;

  stream.websocket = new WebSocket(stream.mediaUrl);
  stream.websocket.binaryType = 'arraybuffer';

  stream.websocket.onopen = () => {
    self.postMessage({
      type: 'log',
      level: 'info',
      event: 'ws-connected',
      message: `WebSocket connected for stream ${streamId}`,
      streamId,
      subscriberId: stream.subscriberId,
    });
  };

  stream.websocket.onmessage = (event) => handleMediaWsMessage(event, streamId);

  stream.websocket.onclose = () => {
    console.warn(`WebSocket closed for stream ${streamId}`);
    self.postMessage({
      type: 'connectionClosed',
      stream: 'media',
      message: `WebSocket closed for stream ${streamId}`,
      streamId,
      subscriberId: stream.subscriberId,
    });
  };

  stream.websocket.onerror = (error) => {
    console.error(`WebSocket error for stream ${streamId}:`, error);
    self.postMessage({
      type: 'error',
      message: `WebSocket error for stream ${streamId}`,
      streamId,
      subscriberId: stream.subscriberId,
    });
  };
}

// Handle WebSocket message for specific stream
function handleMediaWsMessage(event, streamId) {
  const stream = streams.get(streamId);
  if (!stream) return;

  if (typeof event.data === 'string') {
    const dataJson = JSON.parse(event.data);
    console.warn(`[Stream ${streamId}]: Received config data:`, dataJson);

    if (dataJson.type === 'TotalViewerCount') {
      self.postMessage({
        type: 'TotalViewerCount',
        count: dataJson.total_viewers,
        streamId,
        subscriberId: stream.subscriberId,
      });
      return;
    }

    if (
      dataJson.type === 'DecoderConfigs' &&
      (!stream.videoCodecReceived || !stream.audioCodecReceived)
    ) {
      stream.videoConfig = dataJson.videoConfig;
      stream.audioConfig = dataJson.audioConfig;
      stream.videoFrameRate = stream.videoConfig.frameRate;
      stream.audioFrameRate = stream.audioConfig.sampleRate / 1024;

      stream.videoConfig.description = base64ToUint8Array(stream.videoConfig.description);
      const audioConfigDescription = base64ToUint8Array(stream.audioConfig.description);

      // Configure per-stream decoders
      if (stream.videoDecoder && stream.videoDecoder.state === 'unconfigured') {
        stream.videoDecoder.configure(stream.videoConfig);
      }
      if (stream.audioDecoder && stream.audioDecoder.state === 'unconfigured') {
        stream.audioDecoder.configure(stream.audioConfig);
      }

      // Decode first audio frame to trigger audio decoder
      try {
        const dataView = new DataView(audioConfigDescription.buffer);
        const timestamp = dataView.getUint32(0, false);
        const data = audioConfigDescription.slice(5);

        const chunk = new EncodedAudioChunk({
          timestamp: timestamp * 1000,
          type: 'key',
          data,
        });
        if (stream.audioDecoder) {
          stream.audioDecoder.decode(chunk);
        }
        console.log(`Decoded first audio frame for stream ${streamId}`);
      } catch (error) {
        console.log(`Error decoding first audio frame for stream ${streamId}:`, error);
      }

      stream.videoCodecReceived = true;
      stream.audioCodecReceived = true;

      self.postMessage({
        type: 'codecReceived',
        stream: 'both',
        videoConfig: stream.videoConfig,
        audioConfig: stream.audioConfig,
        streamId,
        subscriberId: stream.subscriberId,
      });
      return;
    }

    if (event.data === 'publish') {
      // Reset per-stream decoders
      if (stream.videoDecoder) stream.videoDecoder.reset();
      if (stream.audioDecoder) stream.audioDecoder.reset();
      stream.videoCodecReceived = false;
      stream.audioCodecReceived = false;
      return;
    }

    if (event.data === 'ping') {
      return;
    }
  }

  // Handle frame data (ArrayBuffer)
  if (event.data instanceof ArrayBuffer) {
    const dataView = new DataView(event.data);
    const timestamp = dataView.getUint32(0, false);
    const frameType = dataView.getUint8(4);
    const data = event.data.slice(5);

    let type;
    if (frameType === 0) type = 'key';
    else if (frameType === 1) type = 'delta';
    else if (frameType === 2) type = 'audio';
    else if (frameType === 3) type = 'config';
    else type = 'unknown';

    if (type === 'audio') {
      handleAudioFrame(streamId, timestamp, data);
    } else if (type === 'key' || type === 'delta') {
      handleVideoFrame(streamId, timestamp, type, data);
    } else if (type === 'config') {
      console.warn(`[Stream ${streamId}]: Received unexpected config data:`, data);
    }
  }
}

// Handle audio frame for specific stream
function handleAudioFrame(streamId, timestamp, data) {
  const stream = streams.get(streamId);
  if (!stream) return;

  if (stream.audioDecoder && stream.audioDecoder.state === 'closed') {
    stream.audioDecoder = createAudioDecoderForStream(streamId);
    if (stream.audioConfig) {
      stream.audioDecoder.configure(stream.audioConfig);
    }
  }

  const chunk = new EncodedAudioChunk({
    timestamp: timestamp * 1000,
    type: 'key',
    data,
  });

  stream.audioFrameBuffer.push(chunk);

  if (stream.audioFrameBuffer.length === 23 && !stream.audioPlaybackStarted) {
    stream.audioPlaybackStarted = true;
    stream.curAudioInterval = {
      speed: 0,
      rate: 1000 / stream.audioFrameRate,
    };
    startSendingAudioForStream(streamId, stream.curAudioInterval);
  }

  if (stream.audioFrameBuffer.length >= 46) {
    stream.audioFrameBuffer.shift();
  }
}

// Handle video frame for specific stream
function handleVideoFrame(streamId, timestamp, type, data) {
  const stream = streams.get(streamId);
  if (!stream) return;

  if (type === 'key') stream.keyFrameReceived = true;

  if (stream.keyFrameReceived) {
    if (stream.videoDecoder && stream.videoDecoder.state === 'closed') {
      stream.videoDecoder = createVideoDecoderForStream(streamId);

      // Use hardcoded config for now (could be made configurable per stream)
      const videoDecoderConfig = {
        codec: 'hev1.1.0.L90.b0',
        width: 1920,
        height: 1080,
        framerate: 60,
        bitrate: 4_000_000,
        latencyMode: 'quality',
        hevc: {
          format: 'annexb',
          maxBFrames: 0,
        },
      };
      stream.videoDecoder.configure(videoDecoderConfig);
    }

    const encodedChunk = new EncodedVideoChunk({
      timestamp: timestamp * 1000,
      type,
      data,
    });

    stream.videoFrameBuffer.push(encodedChunk);

    if (stream.videoFrameBuffer.length === 30 && !stream.videoPlaybackStarted) {
      stream.videoPlaybackStarted = true;
      stream.curVideoInterval = {
        speed: 0,
        rate: 1000 / stream.videoFrameRate,
      };
      startSendingVideoForStream(streamId, stream.curVideoInterval);
    }

    if (stream.videoFrameBuffer.length >= 60) {
      stream.videoFrameBuffer.shift();
    }
  }
}

// Start sending video frames for specific stream
function startSendingVideoForStream(streamId, interval) {
  const stream = streams.get(streamId);
  if (!stream) return;

  clearInterval(stream.videoIntervalID);

  stream.videoIntervalID = setInterval(() => {
    const len = stream.videoFrameBuffer.length;

    // Adaptive playback speed based on buffer length
    if (len > 15 && stream.curVideoInterval.speed !== 3) {
      stream.curVideoInterval.speed = 3;
      stream.curVideoInterval.rate = (1000 / stream.videoFrameRate) * 0.75;
      startSendingVideoForStream(streamId, stream.curVideoInterval);
    } else if (len > 10 && len <= 15 && stream.curVideoInterval.speed !== 2) {
      stream.curVideoInterval.speed = 2;
      stream.curVideoInterval.rate = (1000 / stream.videoFrameRate) * 0.85;
      startSendingVideoForStream(streamId, stream.curVideoInterval);
    } else if (len <= 10 && len > 5 && stream.curVideoInterval.speed !== 1) {
      stream.curVideoInterval.speed = 1;
      stream.curVideoInterval.rate = 1000 / stream.videoFrameRate;
      startSendingVideoForStream(streamId, stream.curVideoInterval);
    } else if (len <= 5 && stream.curVideoInterval.speed !== 0) {
      stream.curVideoInterval.speed = 0;
      stream.curVideoInterval.rate = (1000 / stream.videoFrameRate) * 1.05;
      startSendingVideoForStream(streamId, stream.curVideoInterval);
    }

    const frameToSend = stream.videoFrameBuffer.shift();
    if (frameToSend && stream.videoDecoder) {
      stream.videoDecoder.decode(frameToSend);
    }
  }, interval.rate);
}

// Start sending audio frames for specific stream
function startSendingAudioForStream(streamId, interval) {
  const stream = streams.get(streamId);
  if (!stream) return;

  clearInterval(stream.audioIntervalID);

  stream.audioIntervalID = setInterval(() => {
    const len = stream.audioFrameBuffer.length;

    // Adaptive playback speed based on buffer length
    if (len > 15 && stream.curAudioInterval.speed !== 2) {
      stream.curAudioInterval.speed = 2;
      stream.curAudioInterval.rate = (1000 / stream.audioFrameRate) * 0.85;
      startSendingAudioForStream(streamId, stream.curAudioInterval);
      return;
    }

    if (len > 10 && len <= 15 && stream.curAudioInterval.speed !== 1) {
      stream.curAudioInterval.speed = 1;
      stream.curAudioInterval.rate = (1000 / stream.audioFrameRate) * 0.93;
      startSendingAudioForStream(streamId, stream.curAudioInterval);
      return;
    }

    if (len <= 10 && len > 5 && stream.curAudioInterval.speed !== 0) {
      stream.curAudioInterval.speed = 0;
      stream.curAudioInterval.rate = 1000 / stream.audioFrameRate;
      startSendingAudioForStream(streamId, stream.curAudioInterval);
      return;
    }

    if (len <= 5 && stream.curAudioInterval.speed !== -1) {
      stream.curAudioInterval.speed = -1;
      stream.curAudioInterval.rate = (1000 / stream.audioFrameRate) * 1.05;
      startSendingAudioForStream(streamId, stream.curAudioInterval);
      return;
    }

    const frameToSend = stream.audioFrameBuffer.shift();

    if (frameToSend && stream.audioDecoder) {
      if (stream.audioDecoder.state === 'configured') {
        try {
          stream.audioDecoder.decode(frameToSend);
        } catch (error) {
          self.postMessage({
            type: 'error',
            message: `Audio decode error for stream ${streamId}: ${error.message}`,
            streamId,
            subscriberId: stream.subscriberId,
          });

          if (error.message.includes('unconfigured codec')) {
            clearInterval(stream.audioIntervalID);
            stream.audioPlaybackStarted = false;
            self.postMessage({
              type: 'status',
              message: `Audio decoder reset for stream ${streamId}`,
              streamId,
              subscriberId: stream.subscriberId,
            });
          }
        }
      } else {
        stream.audioFrameBuffer.unshift(frameToSend);

        self.postMessage({
          type: 'status',
          message: `Waiting for audio decoder (${stream.audioDecoder.state}) - stream ${streamId}`,
          streamId,
          subscriberId: stream.subscriberId,
        });

        if (stream.audioDecoder.state === 'unconfigured' && stream.audioConfig) {
          try {
            stream.audioDecoder.configure(stream.audioConfig);
            self.postMessage({
              type: 'status',
              message: `Audio decoder reconfigured for stream ${streamId}`,
              streamId,
              subscriberId: stream.subscriberId,
            });
          } catch (e) {
            self.postMessage({
              type: 'error',
              message: `Failed to reconfigure audio for stream ${streamId}: ${e.message}`,
              streamId,
              subscriberId: stream.subscriberId,
            });
          }
        }
      }
    }
  }, interval.rate);
}

// Remove stream
function removeStream(streamIdOrSubscriberId) {
  // Find stream by streamId or subscriberId
  let streamToRemove = null;
  let streamId = null;

  for (const [id, stream] of streams.entries()) {
    if (id === streamIdOrSubscriberId || stream.subscriberId === streamIdOrSubscriberId) {
      streamToRemove = stream;
      streamId = id;
      break;
    }
  }

  if (!streamToRemove) {
    console.warn(`Stream not found: ${streamIdOrSubscriberId}`);
    return;
  }

  // Close WebSocket
  if (streamToRemove.websocket) {
    try {
      streamToRemove.websocket.close();
    } catch (e) {}
  }

  // Clear intervals
  if (streamToRemove.videoIntervalID) clearInterval(streamToRemove.videoIntervalID);
  if (streamToRemove.audioIntervalID) clearInterval(streamToRemove.audioIntervalID);

  // Close per-stream decoders
  if (streamToRemove.videoDecoder) {
    try {
      streamToRemove.videoDecoder.close();
    } catch (e) {}
  }
  if (streamToRemove.audioDecoder) {
    try {
      streamToRemove.audioDecoder.close();
    } catch (e) {}
  }

  // Clear buffers
  streamToRemove.videoFrameBuffer = [];
  streamToRemove.audioFrameBuffer = [];

  // Remove from streams map
  streams.delete(streamId);

  console.log(`Removed stream ${streamId} for subscriber ${streamToRemove.subscriberId}`);

  self.postMessage({
    type: 'streamRemoved',
    streamId,
    subscriberId: streamToRemove.subscriberId,
  });
}

// Stop all streams and cleanup
function stopAll() {
  // Stop all streams (this will also close individual decoders)
  for (const streamId of streams.keys()) {
    removeStream(streamId);
  }

  self.postMessage({
    type: 'log',
    level: 'info',
    event: 'stop-all',
    message: 'Stopped all operations and cleaned up per-stream resources',
  });
}

// Message handler
self.onmessage = async function (e) {
  const { type, subscriberId, data, port } = e.data;

  try {
    switch (type) {
      case 'initStream':
        console.log(`Media Worker: Initializing stream for subscriber ${subscriberId}`);
        const streamId = createStream(subscriberId, data, port);
        await initializeDecodersForStream(streamId);
        self.postMessage({
          type: 'streamInitialized',
          streamId,
          subscriberId,
        });
        break;

      case 'removeStream':
        console.log(`Media Worker: Removing stream for subscriber ${subscriberId}`);
        removeStream(subscriberId);
        break;

      case 'reset':
        console.log('Media Worker: Resetting all streams');
        // Reset all streams
        for (const stream of streams.values()) {
          if (stream.websocket) {
            stream.websocket.close();
            setupWebSocketForStream(stream.streamId);
          }
        }
        break;

      case 'stop':
        console.log('Media Worker: Stopping all operations');
        stopAll();
        break;

      case 'addSubscriberChannelPort':
        console.log(`Media Worker: Adding subscriber channel port for ${subscriberId}`);
        channelPorts.set(subscriberId, port);
        break;

      default:
        console.warn(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error(`Error handling message type ${type}:`, error);
    self.postMessage({
      type: 'error',
      message: `Error in ${type}: ${error.message}`,
      subscriberId,
    });
  }
};

// Utility function
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Log statistics periodically
// function logStats() {
//   setInterval(() => {
//     const streamStats = Array.from(streams.entries()).map(
//       ([streamId, stream]) => ({
//         streamId,
//         subscriberId: stream.subscriberId,
//         videoBuffer: stream.videoFrameBuffer.length,
//         audioBuffer: stream.audioFrameBuffer.length,
//         videoPlaying: stream.videoPlaybackStarted,
//         audioPlaying: stream.audioPlaybackStarted,
//         videoDecoderState: stream.videoDecoder?.state || "none",
//         audioDecoderState: stream.audioDecoder?.state || "none",
//       })
//     );

//     if (streamStats.length > 0) {
//       console.log("Stream stats:", streamStats);
//     }
//   }, 10000);
// }
