import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{ songId: string }>;
}

/**
 * 기존 /call-guide/edit/[songId] 경로는 /fieldnote/call/[songId]/edit로 리다이렉트
 */
export default async function CallGuideEditRedirect({ params }: PageProps) {
    const { songId } = await params;
    redirect(`/fieldnote/call/${songId}/edit`);
}
