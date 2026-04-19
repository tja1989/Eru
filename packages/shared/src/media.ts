export interface PickableMedia {
  originalUrl?: string | null;
  video360pUrl?: string | null;
  video540pUrl?: string | null;
  video720pUrl?: string | null;
  video1080pUrl?: string | null;
  hlsManifestUrl?: string | null;
}

export interface PickOptions {
  allow1080p?: boolean;
}

export function pickVideoUrl(
  media: PickableMedia | null | undefined,
  opts: PickOptions = {},
): string | undefined {
  if (!media) return undefined;
  if (media.hlsManifestUrl) return media.hlsManifestUrl;
  if (opts.allow1080p && media.video1080pUrl) return media.video1080pUrl;
  if (media.video720pUrl) return media.video720pUrl;
  if (media.video540pUrl) return media.video540pUrl;
  if (media.video360pUrl) return media.video360pUrl;
  return media.originalUrl ?? undefined;
}
