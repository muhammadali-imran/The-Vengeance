"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, LineChart, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"

const navItems = [
    {
        title: "Feed",
        href: "/feed",
        icon: Home,
    },
    {
        title: "Result",
        href: "/feed/result/page",
        icon: LineChart,
    },
]

function FeedNavContent({ className, onItemClick }: { className?: string, onItemClick?: () => void }) {
    const pathname = usePathname()

    return (
        <div className={cn("space-y-4", className)}>
            <div className="px-3 py-2">
                <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                    Menu
                </h2>
                <div className="space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onItemClick}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                                pathname === item.href || (item.href !== "/feed" && pathname?.startsWith(item.href))
                                    ? "bg-accent/10 text-accent"
                                    : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.title}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}

export function UniversalFeedNav() {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="w-64 hidden md:block border-r border-border min-h-screen p-4 sticky top-0 h-screen">
                <FeedNavContent />
            </nav>

            {/* Mobile Header */}
            <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden p-4 flex items-center justify-between">
                <div className="font-bold text-lg">
                    {pathname === '/feed' ? 'Feed' : pathname?.includes('result') ? 'Results' : 'Menu'}
                </div>
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-6 w-6" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[240px] sm:w-[300px] p-0 pt-10">
                        <FeedNavContent onItemClick={() => setOpen(false)} />
                    </SheetContent>
                </Sheet>
            </header>
        </>
    )
}
