
export type PostContent =
    | { type: 'text'; text: string; image?: never }
    | { type: 'image'; image: string; text?: never }
    | { type: 'image-text'; text: string; image: string };

export type Post = {
    id: number;
    author: {
        name: string;
        username: string;
        avatar: string;
    };
    content: PostContent;
    votes: number;
    comments: number;
    timestamp: string;
    status: 'active' | 'inactive';
    result?: boolean; // true for True rumor, false for False rumor
    analytics?: {
        likes: number[];
        dislikes: number[];
        labels: string[];
    };
};

export const MOCK_POSTS: Post[] = [
    {
        id: 1,
        author: {
            name: "Sarah Chen",
            username: "@sarahchen",
            avatar: "SC"
        },
        content: {
            type: "text",
            text: "Just finished building an amazing AI-powered resume analyzer! 🚀 The future of job applications is here."
        },
        votes: 142,
        comments: 23,
        timestamp: "2h ago",
        status: 'active'
    },
    {
        id: 2,
        author: {
            name: "Marcus Rodriguez",
            username: "@marcusr",
            avatar: "MR"
        },
        content: {
            type: "image-text",
            text: "Loving the new monochrome design trend in web development. Clean, minimal, and powerful.",
            image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop"
        },
        votes: 89,
        comments: 12,
        timestamp: "4h ago",
        status: 'active'
    },
    {
        id: 3,
        author: {
            name: "Emma Watson",
            username: "@emmaw",
            avatar: "EW"
        },
        content: {
            type: "image",
            image: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&h=600&fit=crop"
        },
        votes: 234,
        comments: 45,
        timestamp: "6h ago",
        status: 'active'
    },
    {
        id: 4,
        author: {
            name: "David Kim",
            username: "@davidk",
            avatar: "DK"
        },
        content: {
            type: "text",
            text: "Pro tip: Always validate your forms client-side AND server-side. Security is not optional! 🔒"
        },
        votes: 67,
        comments: 8,
        timestamp: "8h ago",
        status: 'active'
    },
    // Inactive posts for Result page
    {
        id: 5,
        author: {
            name: "Alex Truth",
            username: "@alextruth",
            avatar: "AT"
        },
        content: {
            type: "text",
            text: "Heard that the new React compiler creates optimized code automatically. This changes everything!"
        },
        votes: 542,
        comments: 120,
        timestamp: "2 weeks ago",
        status: 'inactive',
        result: true, // Confirmed True
        analytics: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
            likes: [120, 150, 200, 300, 450, 500, 542],
            dislikes: [5, 10, 15, 20, 25, 30, 35]
        }
    },
    {
        id: 6,
        author: {
            name: "Jamie False",
            username: "@jamiefalse",
            avatar: "JF"
        },
        content: {
            type: "image-text",
            text: "Aliens landed in Times Square! 👽",
            image: "https://images.unsplash.com/photo-1542259681-d3d623255154?w=800&h=600&fit=crop"
        },
        votes: 12,
        comments: 300,
        timestamp: "10 days ago",
        status: 'inactive',
        result: false, // Confirmed False
        analytics: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
            likes: [50, 40, 30, 20, 15, 12, 12],
            dislikes: [100, 200, 300, 400, 500, 600, 700]
        }
    }
];
