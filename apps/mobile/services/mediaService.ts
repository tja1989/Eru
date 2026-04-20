import api from './api';
import * as FileSystem from 'expo-file-system';

export const mediaService = {
  upload: (data: { contentType: string; width: number; height: number }) =>
    api.post('/media/upload', data).then((r) => r.data),
  presign: (data: { contentType: string; size: number }) =>
    api.post('/media/presign', data).then((r) => r.data),
  uploadFileToS3: async (uploadUrl: string, file: { uri: string; type: string }) => {
    // axios.put with a React Native Blob serializes the Blob's internal _data
    // descriptor as JSON instead of streaming the binary — produces a ~200-byte
    // file in S3 instead of the actual media. FileSystem.uploadAsync streams
    // the file URI as raw binary, which is what S3 PUT expects.
    const result = await FileSystem.uploadAsync(uploadUrl, file.uri, {
      httpMethod: 'PUT',
      headers: { 'Content-Type': file.type },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`S3 upload failed: ${result.status} ${result.body?.slice(0, 200) ?? ''}`);
    }
  },
};
