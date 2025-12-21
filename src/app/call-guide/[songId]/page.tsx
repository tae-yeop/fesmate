import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{ songId: string }>;
}

/**
 * 기존 /call-guide/[songId] 경로는 /fieldnote/call/[songId]로 리다이렉트
 */
export default async function CallGuideViewRedirect({ params }: PageProps) {
    const { songId } = await params;
    redirect(`/fieldnote/call/${songId}`);
}
