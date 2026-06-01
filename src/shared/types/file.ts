type MediaType = 'audio/wav' | 'audio/mpeg' | 'video/x-matroska' | 'video/x-msvideo' | 'video/mxf' | string;

type QualityTier = 'archival' | 'presentation';

type FileType = 'audio' | 'video' | 'other';

type FileAccess = {
  content: boolean;
};

export type EntityRef = {
  id: string;
  name: string;
};

export type RoCrateFile = {
  id: string;
  name: string;
  filename: string;
  mediaType: MediaType;
  size: number;
  memberOf: EntityRef;
  access?: FileAccess;
};

export const ARCHIVAL_AUDIO_TYPES = ['audio/wav', 'audio/x-wav'];
export const ARCHIVAL_VIDEO_TYPES = ['video/x-matroska', 'video/matroska', 'video/mxf', 'video/x-msvideo'];
export const ARCHIVAL_IMAGE_TYPES = ['image/tiff'];

export const getFileType = (mediaType: string): FileType => {
  if (mediaType.startsWith('audio/')) {
    return 'audio';
  }

  if (mediaType.startsWith('video/')) {
    return 'video';
  }

  return 'other';
};

export const getQualityTier = (mediaType: string): QualityTier => {
  if (ARCHIVAL_AUDIO_TYPES.includes(mediaType) || ARCHIVAL_VIDEO_TYPES.includes(mediaType) || ARCHIVAL_IMAGE_TYPES.includes(mediaType)) {
    return 'archival';
  }

  return 'presentation';
};
