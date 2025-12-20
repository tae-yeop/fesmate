// 댓글(Comment) 관련 타입 정의

/** 댓글 인터페이스 */
export interface Comment {
    id: string;
    postId: string;
    userId: string;
    content: string;
    createdAt: Date;
    updatedAt?: Date;
    // 대댓글 지원 (선택)
    parentId?: string;
    // 삭제 여부
    isDeleted?: boolean;
}

/** 댓글 생성 입력 */
export interface CreateCommentInput {
    postId: string;
    userId: string;
    content: string;
    parentId?: string;
}
