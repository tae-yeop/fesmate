"use client";

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    ReactNode,
} from "react";

// 소그룹 타입
export interface CrewSubgroup {
    id: string;
    name: string;
    emoji: string;
    memberIds: string[];
    crewId: string;
    createdAt: string;
}

interface CrewSubgroupContextType {
    subgroups: CrewSubgroup[];
    createSubgroup: (crewId: string, name: string, emoji: string, memberIds: string[]) => CrewSubgroup;
    deleteSubgroup: (id: string) => void;
    updateSubgroup: (id: string, updates: Partial<Omit<CrewSubgroup, "id" | "crewId" | "createdAt">>) => void;
    getSubgroupsByCrewId: (crewId: string) => CrewSubgroup[];
}

const CrewSubgroupContext = createContext<CrewSubgroupContextType | undefined>(undefined);

const STORAGE_KEY = "fesmate_crew_subgroups";

export function CrewSubgroupProvider({ children }: { children: ReactNode }) {
    const [subgroups, setSubgroups] = useState<CrewSubgroup[]>([]);

    // 로컬 스토리지에서 로드
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setSubgroups(JSON.parse(stored));
            }
        } catch (error) {
            console.error("Failed to load subgroups from localStorage:", error);
        }
    }, []);

    // 로컬 스토리지에 저장
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(subgroups));
        } catch (error) {
            console.error("Failed to save subgroups to localStorage:", error);
        }
    }, [subgroups]);

    // 크루별 소그룹 조회
    const getSubgroupsByCrewId = useCallback((crewId: string) => {
        return subgroups.filter(sg => sg.crewId === crewId);
    }, [subgroups]);

    // 소그룹 생성
    const createSubgroup = useCallback((
        crewId: string,
        name: string,
        emoji: string,
        memberIds: string[]
    ): CrewSubgroup => {
        const newSubgroup: CrewSubgroup = {
            id: `sg-${Date.now()}`,
            name,
            emoji,
            memberIds,
            crewId,
            createdAt: new Date().toISOString(),
        };

        setSubgroups(prev => [...prev, newSubgroup]);
        return newSubgroup;
    }, []);

    // 소그룹 삭제
    const deleteSubgroup = useCallback((id: string) => {
        setSubgroups(prev => prev.filter(sg => sg.id !== id));
    }, []);

    // 소그룹 수정
    const updateSubgroup = useCallback((
        id: string,
        updates: Partial<Omit<CrewSubgroup, "id" | "crewId" | "createdAt">>
    ) => {
        setSubgroups(prev =>
            prev.map(sg =>
                sg.id === id ? { ...sg, ...updates } : sg
            )
        );
    }, []);

    return (
        <CrewSubgroupContext.Provider
            value={{
                subgroups,
                createSubgroup,
                deleteSubgroup,
                updateSubgroup,
                getSubgroupsByCrewId,
            }}
        >
            {children}
        </CrewSubgroupContext.Provider>
    );
}

export function useCrewSubgroup() {
    const context = useContext(CrewSubgroupContext);
    if (!context) {
        throw new Error("useCrewSubgroup must be used within a CrewSubgroupProvider");
    }
    return context;
}
