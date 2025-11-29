export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
          Welcome to FesMate
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          모든 공연과 페스티벌 정보를 한 곳에서
        </p>
      </section>

      {/* Dashboard Sections */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Interested Events */}
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">📌 관심 표시한 공연</h2>
          <p className="text-sm text-muted-foreground">
            관심 있는 공연을 추가하면 여기에 표시됩니다.
          </p>
        </section>

        {/* Live Events */}
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">🔥 진행 중인 공연</h2>
          <p className="text-sm text-muted-foreground">
            현재 진행 중인 공연들을 확인하세요.
          </p>
        </section>

        {/* Recommended */}
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">⭐ 추천 공연</h2>
          <p className="text-sm text-muted-foreground">
            당신을 위한 맞춤 공연을 추천합니다.
          </p>
        </section>
      </div>

      {/* Navigation Guide */}
      <section className="mt-12 p-6 rounded-lg bg-muted">
        <h3 className="text-lg font-semibold mb-2">🧭 Navigation Guide</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Event Hub</strong>: 공연별 상세 정보와 실시간 제보</li>
          <li>• <strong>Transfer</strong>: 티켓 양도 및 동행 게시판</li>
          <li>• <strong>Artists</strong>: 아티스트 정보 및 셋리스트</li>
          <li className="md:hidden">• 하단 탭 바를 통해 페이지를 이동하세요 (모바일)</li>
          <li className="hidden md:block">• 상단 메뉴를 통해 페이지를 이동하세요 (데스크톱)</li>
        </ul>
      </section>
    </div>
  );
}
