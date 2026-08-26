import Image from "next/image";
import { ArrowUpRight, Podcast } from "lucide-react";
import type { LatestEpisode } from "@/lib/youtube";

export function LatestPodcast({ episode }: { episode: LatestEpisode | null }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <Podcast className="h-4 w-4 text-accent" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight">On Purpose with Jay Shetty</h2>
      </div>
      <p className="mt-1 text-sm text-ink-muted">Latest episode</p>

      {episode ? (
        <a
          href={`https://www.youtube.com/watch?v=${episode.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-5 flex flex-col gap-4 sm:flex-row sm:items-center"
        >
          <div className="relative aspect-video w-full flex-none overflow-hidden rounded-xl border border-black/10 sm:w-56">
            <Image
              src={episode.thumbnailUrl}
              alt={episode.title}
              fill
              sizes="224px"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          </div>
          <div className="min-w-0">
            <p className="font-medium leading-6 transition group-hover:text-accent">{episode.title}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {new Date(episode.publishedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent">
              Watch on YouTube
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
        </a>
      ) : (
        <p className="mt-5 text-sm text-ink-muted">Couldn&apos;t load the latest episode right now.</p>
      )}
    </div>
  );
}
