import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    turbopack: {},
    images: {
        remotePatterns: [
            { hostname: "*.supabase.co" },
            { hostname: "*.supabase.in" },
            { hostname: "ticketimage.interpark.com" },
            { hostname: "image.yes24.com" },
            { hostname: "*.cloudinary.com" },
            { hostname: "images.unsplash.com" },
            { hostname: "i.scdn.co" },
            { hostname: "*.scdn.co" },
        ],
    },
};

export default nextConfig;
