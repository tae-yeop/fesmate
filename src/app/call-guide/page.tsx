import { redirect } from "next/navigation";

/**
 * 기존 /call-guide 경로는 /fieldnote/call로 리다이렉트
 */
export default function CallGuideRedirect() {
    redirect("/fieldnote/call");
}
