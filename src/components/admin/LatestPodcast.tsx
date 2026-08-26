import Image from "next/image";
import { ArrowUpRight, Podcast } from "lucide-react";
import type { OnPurposeEpisode } from "@/lib/youtube";

export function LatestPodcast({ episodes }: { episodes: OnPurposeEpisode[] }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <Podcast className="h-4 w-4 text-accent" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight">On Purpose with Jay Shetty</h2>
      </div>
      <p className="mt-1 text-sm text-ink-muted">Latest, previous, and a random pick from the archive</p>

      {episodes.length > 0 ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {episodes.map((episode) => (
            <a
              key={episode.videoId}
              href={`https://www.youtube.com/watch?v=${episode.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-3"
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-black/10">
                <Image
                  src={episode.thumbnailUrl}
                  alt={episode.title}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {episode.label}
                </p>
                <p className="mt-1 font-medium leading-6 transition group-hover:text-accent">
                  {episode.title}
                </p>
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
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-ink-muted">Couldn&apos;t load episodes right now.</p>
      )}
    </div>
  );
}
