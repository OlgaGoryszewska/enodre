// "Jay Shetty Podcast" — the channel that publishes "On Purpose" episodes.
const CHANNEL_ID = "UCbk_QsfaFZG6PdQeCvaYXJQ";

// Re-check once a day — matches how often a new episode could plausibly drop,
// and Next.js's fetch cache handles the "don't hit the API every request"
// part for free.
const REVALIDATE_SECONDS = 60 * 60 * 24;

const PAGE_SIZE = 50;
// Caps how many pages we'll walk to reach a random index deep in the
// catalog — 20 pages covers up to ~1000 episodes, comfortably above this
// channel's upload count, while bounding worst-case request count.
const MAX_PAGES = 20;

export type Episode = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
};

export type OnPurposeEpisode = Episode & {
  label: "Latest" | "Previous" | "Random pick";
};

type PlaylistSnippet = {
  resourceId: { videoId: string };
  title: string;
  thumbnails?: { high?: { url: string }; default?: { url: string } };
  publishedAt: string;
};

function toEpisode(snippet: PlaylistSnippet): Episode {
  return {
    videoId: snippet.resourceId.videoId,
    title: snippet.title,
    thumbnailUrl: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? "",
    publishedAt: snippet.publishedAt,
  };
}

async function fetchPlaylistPage(playlistId: string, apiKey: string, pageToken?: string) {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("playlistId", playlistId);
  url.searchParams.set("maxResults", String(PAGE_SIZE));
  url.searchParams.set("key", apiKey);
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const res = await fetch(url.toString(), { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`playlistItems.list failed: ${res.status}`);
  return res.json() as Promise<{
    items?: { snippet: PlaylistSnippet }[];
    nextPageToken?: string;
    pageInfo?: { totalResults?: number };
  }>;
}

async function getEpisodeAtIndex(
  playlistId: string,
  apiKey: string,
  targetIndex: number,
  firstPageItems: Episode[],
  nextPageToken: string | undefined
): Promise<Episode | null> {
  if (targetIndex < firstPageItems.length) return firstPageItems[targetIndex];

  let runningIndex = firstPageItems.length;
  let pageToken = nextPageToken;
  let pagesFetched = 0;

  while (pageToken && pagesFetched < MAX_PAGES) {
    const page = await fetchPlaylistPage(playlistId, apiKey, pageToken);
    const pageItems = (page.items ?? []).map((item) => toEpisode(item.snippet));
    if (targetIndex < runningIndex + pageItems.length) {
      return pageItems[targetIndex - runningIndex];
    }
    runningIndex += pageItems.length;
    pageToken = page.nextPageToken;
    pagesFetched += 1;
  }

  return null;
}

// Returns the newest episode, the one before it, and one random pick drawn
// from the rest of the channel's whole upload history.
export async function getOnPurposeEpisodes(): Promise<OnPurposeEpisode[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("Missing YOUTUBE_API_KEY env var — can't fetch episodes.");
    return [];
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

    const firstPage = await fetchPlaylistPage(uploadsPlaylistId, apiKey);
    const items = (firstPage.items ?? []).map((item) => toEpisode(item.snippet));
    const totalResults = firstPage.pageInfo?.totalResults ?? items.length;

    const result: OnPurposeEpisode[] = [];
    if (items[0]) result.push({ ...items[0], label: "Latest" });
    if (items[1]) result.push({ ...items[1], label: "Previous" });

    if (totalResults > 2) {
      const randomIndex = 2 + Math.floor(Math.random() * (totalResults - 2));
      const randomEpisode = await getEpisodeAtIndex(
        uploadsPlaylistId,
        apiKey,
        randomIndex,
        items,
        firstPage.nextPageToken
      );
      if (randomEpisode) result.push({ ...randomEpisode, label: "Random pick" });
    }

    return result;
  } catch (error) {
    console.error("Failed to fetch On Purpose episodes:", error);
    return [];
  }
}
