export interface Notice {
  id: string;
  version: string;
  title: string;
  date: string;
  content: string[];
  pinned?: boolean;
}

// 공지사항 데이터. 새로운 업데이트 내역이 있다면 여기에 추가하세요.
export const NOTICES: Notice[] = [
  {
    id: "notice-pinned-1",
    version: "공지사항",
    title: "설정 탭 공지사항 기능 추가 안내",
    date: "2026-06-16",
    content: [
      "안녕하세요. Bright Study 앱을 이용해주셔서 감사합니다.",
      "이제 설정 탭에서 공지사항 및 업데이트 내역을 확인하실 수 있습니다.",
      "새로운 기능 업데이트가 있을 때마다 이곳에 릴리즈 노트가 추가될 예정입니다."
    ],
    pinned: true
  },
  {
    id: "v2.1.1.15",
    version: "v2.1.1.15",
    title: "v2.1.1.15 최적화 및 안정화 업데이트",
    date: "2026-06-15",
    content: [
      "최초 설치 시 권한 설정 위자드 관련 오류 수정",
      "권한 관련 안정성 개선 및 크래시 현상 완화",
      "타이머 배경 및 화면 번인 방지 기능 최적화"
    ]
  },
  {
    id: "v2.0.1.13",
    version: "v2.0.1.13",
    title: "v2.0.1.13 기능 추가 업데이트",
    date: "2026-06-14",
    content: [
      "디스플레이 및 환경설정 내 테마 지원 추가",
      "달력 화면의 주간 목표 디자인 개선",
      "사용자 편의를 위한 폰트 사이즈 조절 기능 추가"
    ]
  }
];
