import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, User } from "lucide-react";
import { mockBlogPosts } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

export default function BlogPage() {
  return (
    <div className="flex flex-col min-h-screen pt-24 pb-16">
      <section className="py-12 md:py-20 bg-bg-card border-b border-border-default/50">
        <div className="container-road">
          <div className="max-w-3xl text-center mx-auto space-y-4">
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-text-primary">
              Real Estate Insights
            </h1>
            <p className="text-lg text-text-secondary">
              Stay updated with the latest market trends, investment tips, and platform news from the ROAD FACING editorial team.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-road">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockBlogPosts.map((post) => (
              <article 
                key={post.id} 
                className="group rounded-3xl bg-bg-card border border-border-default overflow-hidden hover:border-amber-primary/30 transition-all hover:shadow-elevated flex flex-col h-full"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image 
                    src={post.image} 
                    alt={post.title} 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-bg-card/90 backdrop-blur-md text-amber-primary text-xs font-bold border border-border-default">
                      {post.category}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="font-heading text-xl font-bold text-text-primary mb-3 line-clamp-2 group-hover:text-amber-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-text-secondary text-sm mb-6 line-clamp-3 flex-grow">
                    {post.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-text-tertiary mt-auto pt-4 border-t border-border-default/50">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span>{post.author}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(post.publishedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Button variant="outline" size="lg">
              Load More Articles
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
