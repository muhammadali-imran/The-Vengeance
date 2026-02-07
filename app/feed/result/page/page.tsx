"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUp, ArrowDown, ExternalLink, BarChart2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MOCK_POSTS, type Post } from "@/lib/data"
import { PostAnalytics } from "@/components/post-analytics"
import { Badge } from "@/components/ui/badge"

function ResultPost({ post, onAnalyticsClick, onPostClick }: {
    post: Post,
    onAnalyticsClick: (post: Post) => void,
    onPostClick: (post: Post) => void
}) {
    // Determine color based on result (True/False)
    const resultColor = post.result ? "text-green-500" : "text-red-500"
    const borderColor = post.result ? "border-green-500/50" : "border-red-500/50"
    const bgColor = post.result ? "bg-green-500/10" : "bg-red-500/10"

    return (
        <article className={`backdrop-blur-sm bg-card/50 border rounded-lg overflow-hidden transition-all duration-200 hover:border-accent/30 ${borderColor}`}>
            {/* Result Header */}
            <div className={`px-4 py-2 flex items-center justify-between border-b ${borderColor} ${bgColor}`}>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider font-bold">Rumor Verification</span>
                </div>
                <Badge variant={post.result ? "default" : "destructive"} className={post.result ? "bg-green-600 text-white hover:bg-green-700" : ""}>
                    {post.result ? "TRUE" : "FALSE"}
                </Badge>
            </div>

            {/* Post Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="size-10 bg-accent/20 text-accent flex items-center justify-center font-mono text-sm">
                        {post.author.avatar}
                    </Avatar>
                    <div>
                        <h3 className="font-medium text-sm">{post.author.name}</h3>
                        <p className="text-xs text-muted-foreground">{post.author.username} · {post.timestamp}</p>
                    </div>
                </div>
            </div>

            {/* Content Preview */}
            <div className="px-4 pb-2">
                {/* Image/Video */}
                {(post.content.type === 'image' || post.content.type === 'image-text') && post.content.image && (
                    <div className="relative aspect-[4/3] bg-muted overflow-hidden rounded-md mb-3 opacity-80 grayscale-[30%]">
                        <img
                            src={post.content.image}
                            alt="Post content"
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {(post.content.type === 'text' || post.content.type === 'image-text') && post.content.text && (
                    <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">{post.content.text}</p>
                )}
            </div>

            {/* Post Actions */}
            <div className="px-4 py-3 flex items-center gap-3 justify-between">
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 flex-1"
                    onClick={() => onAnalyticsClick(post)}
                >
                    <BarChart2 className="size-4" />
                    View Analytics
                </Button>

                <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2 flex-1"
                    onClick={() => onPostClick(post)}
                >
                    <ExternalLink className="size-4" />
                    View Post
                </Button>
            </div>
        </article>
    )
}

export default function ResultPage() {
    const router = useRouter()

    // Filter inactive posts
    const inactivePosts = MOCK_POSTS.filter(p => p.status === 'inactive')

    const [selectedPost, setSelectedPost] = useState<Post | null>(null)
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false)

    const handleAnalyticsClick = (post: Post) => {
        setSelectedPost(post)
        setIsAnalyticsOpen(true)
    }

    const handlePostClick = (post: Post) => {
        // In a real app, this would navigate to the specific post ID
        // router.push(`/post/${post.id}`)
        router.push('/post') // Assuming /post is the generic post page for now
    }

    return (
        <main className="relative min-h-screen">
            {/* Grid background */}
            <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />

            {/* Noise overlay */}
            <div className="noise-overlay" />

            {/* Main Feed */}
            <div className="relative z-10 min-h-screen">
                {/* Header */}
                <header className="sticky top-0 backdrop-blur-lg bg-background/80 border-b border-border z-20 hidden md:block">
                    <div className="max-w-2xl mx-auto px-4 py-4">
                        <h1 className="text-2xl font-bold">Results & Analysis</h1>
                        <p className="text-sm text-muted-foreground">Verification results for older posts</p>
                    </div>
                </header>

                {/* Feed Content */}
                <div className="max-w-2xl mx-auto px-4 py-6">
                    <div className="space-y-6">
                        {inactivePosts.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">No results available yet.</p>
                            </div>
                        ) : (
                            inactivePosts.map((post) => (
                                <ResultPost
                                    key={post.id}
                                    post={post}
                                    onAnalyticsClick={handleAnalyticsClick}
                                    onPostClick={handlePostClick}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Analytics Modal */}
                <Dialog open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
                    <DialogContent className="sm:max-w-[600px] backdrop-blur-sm bg-card/95 border border-border">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <BarChart2 className="size-5" />
                                Post Analytics
                            </DialogTitle>
                        </DialogHeader>

                        {selectedPost && selectedPost.analytics && (
                            <div className="mt-4">
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-sm text-muted-foreground">
                                            Total Engagement
                                        </div>
                                        <Badge variant={selectedPost.result ? "default" : "destructive"}>
                                            {selectedPost.result ? "VERIFIED TRUE" : "VERIFIED FALSE"}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-muted/30 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-primary">{selectedPost.votes}</div>
                                            <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Votes</div>
                                        </div>
                                        <div className="bg-muted/30 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-foreground">{selectedPost.comments}</div>
                                            <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Comments</div>
                                        </div>
                                    </div>
                                </div>

                                <PostAnalytics data={selectedPost.analytics} />

                                <div className="mt-6 flex justify-end">
                                    <Button onClick={() => setIsAnalyticsOpen(false)}>Close Analysis</Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </main>
    )
}
