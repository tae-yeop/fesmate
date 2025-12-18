"use client";

import { createClient } from "@/lib/supabase/client";
import { Provider } from "@supabase/supabase-js";
import { MessageCircle, Search } from "lucide-react"; // Using Lucide icons as placeholders

export function SocialLoginButtons() {
    const supabase = createClient();

    const handleLogin = async (provider: Provider) => {
        const options: { redirectTo: string; scopes?: string } = {
            redirectTo: `${location.origin}/auth/callback`,
        };

        // 카카오는 account_email 권한이 없으므로 scope 명시
        if (provider === "kakao") {
            options.scopes = "profile_nickname profile_image";
        }

        await supabase.auth.signInWithOAuth({
            provider,
            options,
        });
    };

    return (
        <div className="flex flex-col gap-3 w-full">
            <button
                onClick={() => handleLogin("kakao")}
                className="flex items-center justify-center gap-2 rounded-md bg-[#FEE500] px-4 py-2 text-sm font-medium text-[#000000] hover:bg-[#FEE500]/90"
            >
                <MessageCircle className="h-4 w-4 fill-current" />
                <span>카카오로 계속하기</span>
            </button>
            <button
                onClick={() => handleLogin("google")}
                className="flex items-center justify-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
            >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                    />
                    <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                    />
                    <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                    />
                    <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                    />
                </svg>
                <span>Google로 계속하기</span>
            </button>
            {/* Naver is not a default provider in Supabase JS types, but works if configured */}
            {/* <button
        onClick={() => handleLogin("naver")} 
        className="flex items-center justify-center gap-2 rounded-md bg-[#03C75A] px-4 py-2 text-sm font-medium text-white hover:bg-[#03C75A]/90"
      >
        <Search className="h-4 w-4" />
        <span>네이버로 계속하기</span>
      </button> */}
        </div>
    );
}
