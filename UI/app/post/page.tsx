"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { ArrowUp, ArrowDown, MessageCircle, ArrowLeft, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"

export default function PostPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [post, setPost] = useState<any>(null)
    const [upvotes, setUpvotes] = useState(0)
    const [downvotes, setDownvotes] = useState(0)
    const [voteStatus, setVoteStatus] = useState<'up' | 'down' | null>(null)
    const [comments, setComments] = useState<Array<{ id: number, author: string, avatar: string, text: string, timestamp: string }>>([])
    const [commentText, setCommentText] = useState("")

    useEffect(() => {
        // Get post data from localStorage (temporary solution)
        const postData = localStorage.getItem('currentPost')
        if (postData) {
            const parsedPost = JSON.parse(postData)
            setPost(parsedPost)
            setUpvotes(Math.floor(parsedPost.votes * 0.6))
            setDownvotes(Math.floor(parsedPost.votes * 0.4))

            // Get comments for this post
            const allComments = localStorage.getItem('postComments')
            if (allComments) {
                const parsedComments = JSON.parse(allComments)
                setComments(parsedComments[parsedPost.id] || [])
            }
        }
    }, [])

    const handleVote = (type: 'up' | 'down') => {
        if (voteStatus === type) {
            if (type === 'up') {
                setUpvotes(upvotes - 1)
            } else {
                setDownvotes(downvotes - 1)
            }
            setVoteStatus(null)
        } else if (voteStatus === null) {
            if (type === 'up') {
                setUpvotes(upvotes + 1)
            } else {
                setDownvotes(downvotes + 1)
            }
            setVoteStatus(type)
        } else {
            if (type === 'up') {
                setUpvotes(upvotes + 1)
                setDownvotes(downvotes - 1)
            } else {
                setDownvotes(downvotes + 1)
                setUpvotes(upvotes - 1)
            }
            setVoteStatus(type)
        }
    }

    const handlePostComment = () => {
        if (!commentText.trim() || !post) return

        const newComment = {
            id: Date.now(),
            author: "You",
            avatar: "YU",
            text: commentText.trim(),
            timestamp: "Just now"
        }

        const updatedComments = [...comments, newComment]
        setComments(updatedComments)

        // Update localStorage
        const allComments = JSON.parse(localStorage.getItem('postComments') || '{}')
        allComments[post.id] = updatedComments
        localStorage.setItem('postComments', JSON.stringify(allComments))

        setCommentText("")
    }

    if (!post) {
        return (
            <main className="relative min-h-screen flex items-center justify-center">
                <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />
                <div className="noise-overlay" />
                <div className="relative z-10">
                    <p className="text-muted-foreground">Loading post...</p>
                </div>
            </main>
        )
    }

    return (
        <main className="fixed inset-0 bg-background flex flex-col">
            {/* Grid background */}
            <div className="grid-bg fixed inset-0 opacity-30 pointer-events-none" aria-hidden="true" />

            {/* Noise overlay */}
            <div className="noise-overlay pointer-events-none" />

            {/* Header - Only visible on mobile or if needed, but we can make it part of the layout */}
            <header className="md:hidden sticky top-0 backdrop-blur-lg bg-background/80 border-b border-border z-20 shrink-0">
                <div className="px-4 py-3 flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => router.push('/feed')}
                    >
                        <ArrowLeft className="size-5" />
                    </Button>
                    <h1 className="text-lg font-bold">Post</h1>
                </div>
            </header>

            {/* Main Content - Flex/Grid Layout */}
            <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative z-10">

                {/* LEFT SIDE - Content/Media */}
                <div className="flex-1 bg-black/5 md:bg-black/20 flex items-center justify-center overflow-auto md:overflow-hidden relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 left-4 z-50 hidden md:flex bg-background/50 hover:bg-background/80"
                        onClick={() => router.push('/feed')}
                    >
                        <ArrowLeft className="size-5" />
                    </Button>

                    <div className="w-full h-full flex items-center justify-center p-4">
                        {(post.content.type === 'image' || post.content.type === 'image-text') && post.content.image ? (
                            <img
                                src={post.content.image}
                                alt="Post content"
                                className="max-w-full max-h-full object-contain shadow-2xl"
                            />
                        ) : (
                            <div className="max-w-2xl w-full p-8 text-center">
                                <p className="text-xl md:text-3xl font-medium leading-relaxed">{post.content.text}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDE - Interaction Panel */}
                <div className="w-full md:w-[400px] lg:w-[450px] bg-card border-l border-border flex flex-col h-[50vh] md:h-full">
                    {/* Header */}
                    <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-card/80 backdrop-blur-sm z-10">
                        <div className="flex items-center gap-3">
                            <Avatar className="size-8 md:size-10 bg-accent/20 text-accent flex items-center justify-center font-mono">
                                {post.author.avatar}
                            </Avatar>
                            <div>
                                <h3 className="font-medium text-sm md:text-base">{post.author.name}</h3>
                                <p className="text-xs text-muted-foreground">{post.author.username}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="size-5" />
                        </Button>
                    </div>

                    {/* Scrollable Area: Caption + Comments */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {/* Caption / Text Content (if has image) */}
                        {((post.content.type === 'image-text' && post.content.text) || (post.content.type === 'image' && post.content.text)) && (
                            <div className="flex gap-3 mb-6">
                                <Avatar className="size-8 bg-accent/20 text-accent flex items-center justify-center font-mono text-xs flex-shrink-0">
                                    {post.author.avatar}
                                </Avatar>
                                <div>
                                    <div className="bg-muted/30 rounded-lg px-3 py-2">
                                        <h4 className="font-medium text-xs mb-1">{post.author.name}</h4>
                                        <p className="text-sm">{post.content.text}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 ml-3">{post.timestamp}</p>
                                </div>
                            </div>
                        )}

                        {/* Comments List */}
                        <div className="space-y-4">
                            {comments.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <MessageCircle className="size-10 mx-auto mb-2" />
                                    <p className="text-sm">No comments yet.</p>
                                </div>
                            ) : (
                                comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <Avatar className="size-8 bg-accent/20 text-accent flex items-center justify-center font-mono text-sm flex-shrink-0">
                                            {comment.avatar}
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="bg-muted/30 rounded-lg px-3 py-2">
                                                <h4 className="font-medium text-xs mb-1">{comment.author}</h4>
                                                <p className="text-sm break-words">{comment.text}</p>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 ml-3">{comment.timestamp}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Footer Actions & Input */}
                    <div className="border-t border-border shrink-0 bg-card p-4 space-y-4">
                        {/* Actions */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => handleVote('up')}
                                        className={voteStatus === 'up' ? 'text-accent hover:text-accent' : ''}
                                    >
                                        <ArrowUp className="size-5" />
                                    </Button>
                                    <span className="font-mono text-sm font-medium">{upvotes}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => handleVote('down')}
                                        className={voteStatus === 'down' ? 'text-destructive hover:text-destructive' : ''}
                                    >
                                        <ArrowDown className="size-5" />
                                    </Button>
                                    <span className="font-mono text-sm font-medium">{downvotes}</span>
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <MessageCircle className="size-5" />
                                    <span className="text-sm">{comments.length}</span>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground uppercase tracking-widest">
                                {post.timestamp}
                            </div>
                        </div>

                        {/* Input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Add a comment..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            />
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-accent font-semibold hover:text-accent/80 hover:bg-transparent p-0"
                                onClick={handlePostComment}
                                disabled={!commentText.trim()}
                            >
                                Post
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
