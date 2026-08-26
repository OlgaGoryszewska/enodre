// "Jay Shetty Podcast" — the channel that publishes "On Purpose" episodes.
const CHANNEL_ID = "UCbk_QsfaFZG6PdQeCvaYXJQ";

// Re-check once a day — matches how often a new episode could plausibly drop,
// and Next.js's fetch cache handles the "don't hit the API every request"
// part for free.
const REVALIDATE_SECONDS = 60 * 60 * 24;

export type LatestEpisode = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
};

export async function getLatestOnPurposeEpisode(): Promise<LatestEpisode | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("Missing YOUTUBE_API_KEY env var — can't fetch the latest episode.");
    return null;
  }

  try {
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${apiKey}`,
      { next: { revalidate: REVALIDATE_SECONDS } }
    );
    if (!channelRes.ok) throw new Error(`channels.list failed: ${channelRes.status}`);
    const channelData = await channelRes.json();
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) throw new Error("No uploads playlist found for channel.");

    const itemsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=1&key=${apiKey}`,
      { next: { revalidate: REVALIDATE_SECONDS } }
    );
    if (!itemsRes.ok) throw new Error(`playlistItems.list failed: ${itemsRes.status}`);
    const itemsData = await itemsRes.json();
    const latest = itemsData.items?.[0]?.snippet;
    if (!latest) return null;

    return {
      videoId: latest.resourceId.videoId,
      title: latest.title,
      thumbnailUrl: latest.thumbnails?.high?.url ?? latest.thumbnails?.default?.url ?? "",
      publishedAt: latest.publishedAt,
    };
  } catch (error) {
    console.error("Failed to fetch latest On Purpose episode:", error);
    return null;
  }
}
