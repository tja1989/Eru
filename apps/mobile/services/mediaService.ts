import api from './api';
import axios from 'axios';

export const mediaService = {
  upload: (data: { contentType: string; width: number; height: number }) =>
    api.post('/media/upload', data).then((r) => r.data),
  presign: (data: { contentType: string; size: number }) =>
    api.post('/media/presign', data).then((r) => r.data),
  uploadFileToS3: async (uploadUrl: string, file: { uri: string; type: string }) => {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    await axios.put(uploadUrl, blob, { headers: { 'Content-Type': file.type } });
  },
};
