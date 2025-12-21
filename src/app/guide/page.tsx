import { redirect } from "next/navigation";

/**
 * 기존 /guide 경로는 /fieldnote로 리다이렉트
 */
export default function GuideRedirect() {
    redirect("/fieldnote");
}
