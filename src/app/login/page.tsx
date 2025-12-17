import Link from "next/link";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <Link href="/" className="inline-block">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                            FesMate
                        </h1>
                    </Link>
                    <h2 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
                        로그인하고 시작하기
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        나만의 페스티벌 메이트를 만나보세요
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    <div className="rounded-md bg-card p-6 shadow-sm border">
                        <SocialLoginButtons />
                    </div>

                    <p className="text-center text-xs text-muted-foreground">
                        로그인하면 FesMate의{" "}
                        <Link href="/terms" className="underline hover:text-primary">
                            이용약관
                        </Link>
                        과{" "}
                        <Link href="/privacy" className="underline hover:text-primary">
                            개인정보처리방침
                        </Link>
                        에 동의하게 됩니다.
                    </p>
                </div>
            </div>
        </div>
    );
}
