import Image from "next/image";
import type { BlogPost } from "@/lib/blog";
import { BlogCoverArt } from "@/components/blog/BlogCoverArt";

type BlogCoverProps = {
  post: Pick<BlogPost, "title" | "coverVariant" | "coverImage">;
  className?: string;
  priority?: boolean;
};

export function BlogCover({ post, className, priority }: BlogCoverProps) {
  if (post.coverImage) {
    return (
      <div className={`relative overflow-hidden bg-foreground ${className ?? ""}`}>
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority={priority}
        />
      </div>
    );
  }

  return <BlogCoverArt variant={post.coverVariant} className={className} />;
}
