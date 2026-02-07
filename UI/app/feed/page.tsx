"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowUp, ArrowDown, MessageCircle, MoreHorizontal, Plus, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

import { type Post } from "@/lib/data"
import { cn } from "@/lib/utils"

// Comment Item Component with Voting
function CommentItem({ comment }: { comment: any }) {
    const [upvotes, setUpvotes] = useState(0)
    const [downvotes, setDownvotes] = useState(0)
    const [voteStatus, setVoteStatus] = useState<'up' | 'down' | null>(null)

    const handleVote = (type: 'up' | 'down') => {
        if (voteStatus === type) {
            if (type === 'up') setUpvotes(upvotes - 1)
            else setDownvotes(downvotes - 1)
            setVoteStatus(null)
        } else if (voteStatus === null) {
            if (type === 'up') setUpvotes(upvotes + 1)
            else setDownvotes(downvotes - 1)
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

    return (
        <div className="flex gap-3">
            <Avatar className="size-8 bg-accent/20 text-accent flex items-center justify-center font-mono text-xs flex-shrink-0">
                {comment.avatar}
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="bg-muted/30 rounded-lg px-3 py-2">
                    <h4 className="font-medium text-xs mb-1">{comment.author}</h4>
                    <p className="text-sm break-words">{comment.text}</p>
                </div>
                <div className="flex items-center gap-4 mt-1 ml-1">
                    <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleVote('up')}
                            className={cn("flex items-center gap-1 text-xs hover:text-accent transition-colors", voteStatus === 'up' && "text-accent")}
                        >
                            <ArrowUp className="size-3" />
                            <span>{upvotes}</span>
                        </button>
                        <button
                            onClick={() => handleVote('down')}
                            className={cn("flex items-center gap-1 text-xs hover:text-destructive transition-colors", voteStatus === 'down' && "text-destructive")}
                        >
                            <ArrowDown className="size-3" />
                            <span>{downvotes}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function Post({ post, onPostClick, onCommentClick }: {
    post: Post,
    onPostClick: (post: Post) => void,
    onCommentClick: (postId: number) => void
}) {
    const [upvotes, setUpvotes] = useState(Math.floor(post.votes * 0.6)) // 60% upvotes
    const [downvotes, setDownvotes] = useState(Math.floor(post.votes * 0.4)) // 40% downvotes
    const [voteStatus, setVoteStatus] = useState<'up' | 'down' | null>(null)

    const handleVote = (type: 'up' | 'down') => {
        if (voteStatus === type) {
            // Remove vote
            if (type === 'up') {
                setUpvotes(upvotes - 1)
            } else {
                setDownvotes(downvotes - 1)
            }
            setVoteStatus(null)
        } else if (voteStatus === null) {
            // Add vote
            if (type === 'up') {
                setUpvotes(upvotes + 1)
            } else {
                setDownvotes(downvotes - 1)
            }
            setVoteStatus(type)
        } else {
            // Switch vote
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

    return (
        <article className="backdrop-blur-sm bg-card/50 border border-border rounded-lg overflow-hidden transition-all duration-200 hover:border-accent/30">
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
                <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="size-4" />
                </Button>
            </div>

            {/* Post Content - Clickable */}
            <div
                className="cursor-pointer hover:bg-accent/5 transition-colors"
                onClick={() => onPostClick(post)}
            >
                {/* Image/Video */}
                {(post.content.type === 'image' || post.content.type === 'image-text') && post.content.image && (
                    <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                        <img
                            src={post.content.image}
                            alt="Post content"
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Text Content */}
                {(post.content.type === 'text' || post.content.type === 'image-text') && post.content.text && (
                    <div className="p-4">
                        <p className="text-sm leading-relaxed">{post.content.text}</p>
                    </div>
                )}
            </div>

            {/* Post Actions */}
            <div className="px-4 py-3 border-t border-border flex items-center gap-6">
                {/* Vote Section */}
                <div className="flex items-center gap-4">
                    {/* Upvote */}
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleVote('up')}
                            className={voteStatus === 'up' ? 'text-accent hover:text-accent' : ''}
                        >
                            <ArrowUp className="size-4" />
                        </Button>
                        <span className="font-mono text-xs min-w-[2ch] text-center">{upvotes}</span>
                    </div>

                    {/* Downvote */}
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleVote('down')}
                            className={voteStatus === 'down' ? 'text-destructive hover:text-destructive' : ''}
                        >
                            <ArrowDown className="size-4" />
                        </Button>
                        <span className="font-mono text-xs min-w-[2ch] text-center">{downvotes}</span>
                    </div>
                </div>

                {/* Comment Section */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={(e) => {
                        e.stopPropagation();
                        onCommentClick(post.id);
                    }}
                >
                    <MessageCircle className="size-4" />
                    <span className="text-xs">{post.comments}</span>
                </Button>
            </div>
        </article>
    )
}

export default function FeedPage() {
    const router = useRouter()
    const [posts, setPosts] = useState<Post[]>([])
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [postText, setPostText] = useState("")
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [filePreview, setFilePreview] = useState<string>("")
    const [commentPanelOpen, setCommentPanelOpen] = useState(false)
    const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
    const [comments, setComments] = useState<Record<number, Array<{ id: number, author: string, avatar: string, text: string, timestamp: string }>>>({})
    const [commentText, setCommentText] = useState("")

    // Load comments and posts from localStorage on mount
    useEffect(() => {
        const savedComments = localStorage.getItem('postComments')
        if (savedComments) {
            setComments(JSON.parse(savedComments))

            // Update separate comment counts for posts
            const parsedComments = JSON.parse(savedComments)
            setPosts(currentPosts => currentPosts.map(post => ({
                ...post,
                comments: (parsedComments[post.id] || []).length + (post.comments > 0 && !(parsedComments[post.id] || []).length ? post.comments : 0) // Keep initial mock count if no stored comments
            })))
        }
    }, [])

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
            if (!validTypes.includes(file.type)) {
                alert('Please upload a valid image (JPEG, PNG, GIF, WebP) or video (MP4, WebM) file')
                return
            }

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('File size must be less than 10MB')
                return
            }

            setUploadedFile(file)

            // Create preview URL
            const reader = new FileReader()
            reader.onloadend = () => {
                setFilePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleCreatePost = () => {
        // Validate: require either text or media
        if (!postText.trim() && !uploadedFile) {
            alert('Please add some text or upload media')
            return
        }

        // Create new post object
        const newPost = {
            id: Date.now(), // Simple ID generation
            author: {
                name: "You",
                username: "@you",
                avatar: "YU"
            },
            content: {
                type: uploadedFile && postText.trim() ? "image-text" : uploadedFile ? "image" : "text",
                text: postText.trim() || undefined,
                image: filePreview || undefined
            } as any,
            votes: 0,
            comments: 0,
            timestamp: "Just now",
            status: 'active' as const
        }

        // Add new post to the top of the feed
        setPosts([newPost, ...posts])

        // Reset form
        setPostText("")
        setUploadedFile(null)
        setFilePreview("")
        setIsDialogOpen(false)
    }

    const handleCommentClick = (postId: number) => {
        setSelectedPostId(postId)
        setCommentPanelOpen(true)
        setCommentText("")
    }

    const handlePostClick = (post: Post) => {
        // Save post data and current comments to localStorage
        localStorage.setItem('currentPost', JSON.stringify(post))
        localStorage.setItem('postComments', JSON.stringify(comments))

        // Navigate to post page
        router.push('/post')
    }

    const handlePostComment = () => {
        if (!commentText.trim() || selectedPostId === null) return

        const newComment = {
            id: Date.now(),
            author: "You",
            avatar: "YU",
            text: commentText.trim(),
            timestamp: "Just now"
        }

        const updatedComments = {
            ...comments,
            [selectedPostId]: [...(comments[selectedPostId] || []), newComment]
        }

        // Update state
        setComments(updatedComments)

        // Save to localStorage
        localStorage.setItem('postComments', JSON.stringify(updatedComments))

        // Update post comment count
        setPosts(posts.map(post =>
            post.id === selectedPostId
                ? { ...post, comments: post.comments + 1 }
                : post
        ))

        // Clear comment input
        setCommentText("")
    }

    const selectedPost = posts.find(p => p.id === selectedPostId)
    const postComments = selectedPostId ? (comments[selectedPostId] || []) : []

    return (
        <main className="relative min-h-screen">
            {/* Grid background */}
            <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />

            {/* Noise overlay */}
            <div className="noise-overlay" />

            {/* Main Feed */}
            <div className="relative z-10 min-h-screen">
                {/* Logo Header */}
                <header className="sticky top-0 z-20 backdrop-blur-lg bg-background/80 border-b border-border/40">
                    <div className="w-full px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {/* Logo Icon */}
                            <div className="size-8 text-foreground flex items-center justify-center">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="size-8">
                                    <path d="M21.576 4.673c-1.353 1.055-3.085 1.724-5.32 1.76l.044-1.296c0-.988-.8-1.788-1.787-1.788-.988 0-1.788.8-1.788 1.788v.572C10.824 5.253 9.4 4.545 8.448 3.35c.427 3.515-2.22 5.06-2.22 5.06s.907 2.656 2.454 4.148c0 0-1.602 1.127-4.636 1.786 2.502.935 5.51 1.045 7.643 1.045 2.134 0 5.142-.11 7.644-1.045-3.033-.66-4.636-1.787-4.636-1.787 1.547-1.492 2.454-4.148 2.454-4.148s-2.647-1.545-2.22-5.06c-.952 1.195-2.376 1.903-4.277 2.36v-.572c0-.988-.8-1.788-1.788-1.788-.987 0-1.787.8-1.787 1.788l.044 1.296c-2.235-.036-3.967-.705-5.32-1.76.924 2.87 3.342 4.095 3.342 4.095s.31 1.756 1.155 2.217c0 0-.58 2.062 1.058 3.51.52.46 1.54.912 2.922.912 1.38 0 2.402-.452 2.92-2.92-2.92-.91 1.637-.21 1.058-3.51.846-.46 1.155-2.217 1.155-2.217s2.418-1.225 3.342-4.095z" />
                                    <path d="M12 13c.8 0 1.5.5 1.8 1.2.3.7.1 1.5-.4 2.1-.5.6-1.4.7-2.1.3-.7-.4-1.1-1.2-1.1-2 .1-1 .9-1.8 1.8-1.6z" />
                                    {/* Simplified Batman-like shape or use a path from a known icon set if needed. Using a generic bat shape here for illustration. Detailed path replacement below. */}
                                    {/* Better Bat Path */}
                                    <path d="M22 8.5c-2 0-3.5 1-4.5 2.5-.5-2-2-3-3.5-3-.5 1-1 3-2 3s-1.5-2-2-3c-1.5 0-3 1-3.5 3-1-1.5-2.5-2.5-4.5-2.5 0 3 2 6.5 5 8 1 2.5 3 2.5 4 2.5 1 0 3 0 4-2.5 3-1.5 5-5 5-8z" fill="currentColor" />
                                </svg>
                            </div>
                            <h1 className="font-[var(--font-bebas)] text-3xl tracking-wide">VENGEANCE</h1>
                        </div>
                    </div>
                </header>

                {/* Feed Content */}
                <div className="max-w-2xl mx-auto px-4 py-6">
                    <div className="space-y-6">
                        {posts.length === 0 ? (
                            <div className="text-center py-20 opacity-50 space-y-4">
                                <div className="font-[var(--font-bebas)] text-4xl tracking-wide">NO ACTIVE SIGNALS</div>
                                <p className="font-mono text-sm">The network is silent. Be the first to broadcast.</p>
                            </div>
                        ) : (
                            posts.map((post) => (
                                <Post key={post.id} post={post} onCommentClick={handleCommentClick} onPostClick={handlePostClick} />
                            ))
                        )}
                    </div>
                </div>

                {/* Floating Add Post Button */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            size="icon-lg"
                            className="fixed bottom-6 right-6 size-14 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-2xl z-30 transition-all duration-200 hover:scale-110 active:scale-95"
                        >
                            <Plus className="size-6" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[650px] backdrop-blur-sm bg-card/95 border border-border">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Create Post</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            {/* Post Text */}
                            <div className="space-y-2">
                                <label htmlFor="post-text" className="text-sm font-medium">
                                    What's on your mind? (optional)
                                </label>
                                <Textarea
                                    id="post-text"
                                    placeholder="Share your thoughts..."
                                    value={postText}
                                    onChange={(e) => setPostText(e.target.value)}
                                    className="min-h-[120px] resize-none"
                                />
                            </div>

                            {/* Media Upload */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <ImageIcon className="size-4" />
                                    Add Media (optional)
                                </label>

                                {/* File Upload Button */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('file-upload')?.click()}
                                    className="w-full"
                                >
                                    <Plus className="size-4 mr-2" />
                                    Upload Image or Video
                                </Button>
                                <input
                                    id="file-upload"
                                    type="file"
                                    accept="image/*,video/*"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                            </div>

                            {/* Media Preview */}
                            {filePreview && (
                                <div className="rounded-lg overflow-hidden border border-border">
                                    {uploadedFile?.type.startsWith('video/') ? (
                                        <video
                                            src={filePreview}
                                            className="w-full h-48 object-cover"
                                            controls
                                        />
                                    ) : (
                                        <img
                                            src={filePreview}
                                            alt="Preview"
                                            className="w-full h-48 object-cover"
                                        />
                                    )}
                                    <div className="p-2 bg-muted/50 flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground truncate">
                                            {uploadedFile?.name}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setUploadedFile(null)
                                                setFilePreview("")
                                            }}
                                            className="h-6"
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreatePost}
                                    disabled={!postText.trim() && !uploadedFile}
                                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                                >
                                    Post
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Comment Panel - Instagram Style */}
                {commentPanelOpen && (
                    <>
                        {/* Overlay */}
                        <div
                            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
                            onClick={() => setCommentPanelOpen(false)}
                        />

                        {/* Sliding Panel */}
                        <div className="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-card border-l border-border z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out">
                            {/* Panel Header */}
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <h2 className="text-lg font-bold">Comments</h2>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setCommentPanelOpen(false)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </Button>
                            </div>

                            {/* Post Preview */}
                            {selectedPost && (
                                <div className="p-4 border-b border-border bg-muted/20">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Avatar className="size-8 bg-accent/20 text-accent flex items-center justify-center font-mono text-xs">
                                            {selectedPost.author.avatar}
                                        </Avatar>
                                        <div>
                                            <h3 className="font-medium text-xs">{selectedPost.author.name}</h3>
                                            <p className="text-xs text-muted-foreground">{selectedPost.author.username}</p>
                                        </div>
                                    </div>
                                    {selectedPost.content.text && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">{selectedPost.content.text}</p>
                                    )}
                                </div>
                            )}

                            {/* Comments List */}
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="space-y-4">
                                    {postComments.length === 0 ? (
                                        /* Placeholder for no comments */
                                        <div className="text-center py-8">
                                            <MessageCircle className="size-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                                            <p className="text-sm text-muted-foreground">No comments yet</p>
                                            <p className="text-xs text-muted-foreground mt-1">Be the first to comment!</p>
                                        </div>
                                    ) : (
                                        /* Display comments */
                                        postComments.map((comment) => (
                                            <CommentItem key={comment.id} comment={comment} />
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Comment Input */}
                            <div className="p-4 border-t border-border bg-background/50">
                                <div className="flex gap-3">
                                    <Avatar className="size-8 bg-accent/20 text-accent flex items-center justify-center font-mono text-xs flex-shrink-0">
                                        YU
                                    </Avatar>
                                    <div className="flex-1 flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Add a comment..."
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && commentText.trim()) {
                                                    handlePostComment()
                                                }
                                            }}
                                            className="flex-1 bg-transparent border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
                                        />
                                        <Button
                                            size="sm"
                                            className="bg-accent text-accent-foreground hover:bg-accent/90"
                                            onClick={handlePostComment}
                                            disabled={!commentText.trim()}
                                        >
                                            Post
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </main>
    )
}
