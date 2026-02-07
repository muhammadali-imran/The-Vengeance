"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AnalyticsData {
    likes: number[]
    dislikes: number[]
    labels: string[]
}

export function PostAnalytics({ data }: { data: AnalyticsData }) {
    const chartData = data.labels.map((label, index) => ({
        name: label,
        likes: data.likes[index],
        dislikes: data.dislikes[index],
    }))

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader>
                <CardTitle>Engagement Analytics</CardTitle>
                <CardDescription>
                    Daily engagement breakdown for the past week
                </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                        <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: '8px', border: 'none' }}
                            itemStyle={{ color: '#fff' }}
                            cursor={{ fill: 'transparent' }}
                        />
                        <Bar
                            dataKey="likes"
                            fill="currentColor"
                            radius={[4, 4, 0, 0]}
                            className="fill-primary"
                            name="Likes"
                        />
                        <Bar
                            dataKey="dislikes"
                            fill="currentColor"
                            radius={[4, 4, 0, 0]}
                            className="fill-destructive" // Using destructive color for dislikes
                            name="Dislikes"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
