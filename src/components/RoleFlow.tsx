import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, CheckCircle2, Compass, FileText, BarChart3, 
  RefreshCw, Award, ChevronRight, ChevronLeft, User, 
  Smile, Meh, Frown, Plus, Trash2, AlertCircle, Check, 
  RotateCcw, Printer, Heart, Volume2, Search, MessageSquare
} from 'lucide-react';
import { sendMessageToAPI } from '../api/chat';
import { generateClassmates } from '../utils/simulatedData';
import type { Classmate } from '../utils/simulatedData';
import { runMatchAlgorithm, calculateDynamicCapacities } from '../utils/matchAlgorithm';
import type { Student } from '../utils/matchAlgorithm';

interface DashboardStudent extends Student {
  gender: 'boy' | 'girl';
}

// Define steps info
const STEPS = [
  { label: '시작', icon: User },
  { label: '실태 파악', icon: AlertCircle },
  { label: '고민 공유', icon: MessageSquare },
  { label: '역할 제안', icon: Compass },
  { label: '역할 투표', icon: Heart },
  { label: '나와 맞춤', icon: Smile },
  { label: '역할 지원', icon: FileText },
  { label: '경쟁률 확인', icon: BarChart3 },
  { label: '생각 수정', icon: RefreshCw },
  { label: '역할 배정', icon: Sparkles },
  { label: '최종 발표', icon: Award }
];

// Predefined classroom problems (3-4th grade level)
// Predefined classroom problems (3-4th grade level)
const PROBLEM_LIST = [
  { id: 'trash', emoji: '🗑️', title: '분리수거 쓰레기통 주변이 늘 지저분해요', desc: '종이컵과 플라스틱이 마구 섞여 버려지거나 바닥에 떨어져 있어요.' },
  { id: 'lights', emoji: '💡', title: '교실 불과 선풍기가 헛되이 켜져 있어요', desc: '이동 수업을 가거나 체육 시간일 때 전등이 그대로 켜져 낭비돼요.' },
  { id: 'floor', emoji: '🧹', title: '바닥에 지우개 가루나 쓰레기가 뒹굴어요', desc: '공부하고 나면 책상 주변 바닥이나 사물함 앞이 지저분해요.' },
  { id: 'windows', emoji: '🚪', title: '창문이 계속 열려 있어 바람이나 먼지가 들어와요', desc: '비가 올 때 창문이 열려 물이 들이치거나 환기 단속이 잘 안 돼요.' },
  { id: 'books', emoji: '📚', title: '학급문고 책꽂이가 엉망으로 섞여 있어요', desc: '책이 뒤죽박죽 꽂혀 있어서 내가 읽고 싶은 책을 찾기 어려워요.' },
  { id: 'plants', emoji: '🪴', title: '교실 화분의 초록이들이 목말라 시들어가요', desc: '화분에 물을 주는 친구가 없어서 흙이 바짝 마르고 잎이 아파해요.' },
  { id: 'milk', emoji: '🥛', title: '아침 우유 상자가 흐트러져 있어 가져가기 불편해요', desc: '우유가 섞여서 내 번호를 찾기 어렵고 우유 곽이 쓰러져 있어요.' },
  { id: 'board', emoji: '🖍️', title: '쉬는 시간마다 칠판이 지저분하게 낙서돼 있어요', desc: '수업이 끝나도 칠판이 닦이지 않아 다음 시간에 선생님 글씨가 잘 안 보여요.' },
  { id: 'lockers', emoji: '🎒', title: '사물함 안 교과서와 학용품이 엉망으로 섞여 있어요', desc: '사물함 안에 교과서와 미술 도구가 마구 뒤엉켜 필요한 물건을 찾기 힘들고 쏟아져요.' },
  { id: 'boardgames', emoji: '🎲', title: '보드게임 상자의 카드와 말이 섞여 있고 정리가 안 돼요', desc: '쉬는 시간에 쓰고 남은 보드게임들의 카드와 말이 섞이거나 분실되어 놀기 어려워요.' },
  { id: 'desks', emoji: '🪑', title: '책상과 의자 줄이 삐뚤빼뚤해 교실이 좁고 복잡해요', desc: '친구들이 지나다닐 때 책상에 부딪치거나 다칠 수 있고 교실 통로가 삐뚤빼뚤해요.' },
  { id: 'clean_tools', emoji: '🧹', title: '청소함 속 청소 도구들이 엉망으로 널브러져 있어요', desc: '빗자루와 걸레가 제자리에 걸려있지 않아 청소 도구함 문이 안 닫히고 도구가 망가져요.' },
  { id: 'tablet_pc', emoji: '💻', title: '태블릿 PC 충전선이 엉켜 충전이 안 돼 있어요', desc: '수업 때 쓰는 태블릿 PC 충전기가 꼬여 있거나 코드가 빠져 충전이 덜 되어 있어요.' }
];

// Default roles mapping for fallback
const DEFAULT_ROLES_MAP: Record<string, { name: string; job: string; reason: string }[]> = {
  'trash': [{ name: '분리수거 대장', job: '친구들이 다 쓴 종이컵이나 페트병을 분리수거함에 잘 넣도록 도와줘요.', reason: '쓰레기가 섞여 버려지거나 분리수거함 주변이 지저분해지는 것을 막기 위해서예요.' }],
  'lights': [{ name: '교실 에너지 요정', job: '이동 수업이나 체육 시간에 갈 때 교실 전등과 에어컨이 꺼져 있는지 확인하고 전원을 꺼요.', reason: '아무도 없는 빈 교실에 전기가 아깝게 새어 나가는 것을 막아 지구를 지켜요.' }],
  'floor': [{ name: '바닥 쓸기 히어로', job: '수업이 끝난 후나 청소 시간에 책상 밑에 떨어진 지우개 가루와 색종이를 빗자루로 쓸어요.', reason: '친구들이 쾌적하고 먼지 없는 바닥에서 마음껏 생활할 수 있도록 청결을 유지해요.' }],
  'windows': [{ name: '교실 창문 단속반', job: '미세먼지가 심하거나 비바람이 들이치기 전 창문을 닫고, 체육 시간이 끝난 후엔 창문을 열어 환기를 시켜요.', reason: '교실 안 공기를 맑고 상쾌하게 유지하고 바람이나 외부 비로부터 우리 교실을 안전하게 만들어요.' }],
  'books': [{ name: '도서 정리 박사', job: '학급 문고 책꽂이의 책들이 뒤섞여 꽂혀 있을 때, 크기와 장르별로 가지런하게 책을 꽂아 정리해요.', reason: '친구들이 읽고 싶은 동화책이나 만화책을 쉽고 빠르게 찾을 수 있도록 북 카페 같은 공간을 만들어요.' }],
  'plants': [{ name: '다정한 식물 집사', job: '교실 창가에 있는 미니 화분들의 흙을 만져보고 물을 주며 쑥쑥 자라게 정성껏 보살펴요.', reason: '초록색 잎을 가진 식물이 싱그럽게 자라며 우리 교실 공기를 깨끗하게 만들어주고 친구들 눈을 편안하게 해줘요.' }],
  'milk': [{ name: '우유 정돈 요정', job: '아침에 급식실에서 올라온 우유 통의 상자들을 학급 번호 순서에 맞춰 예쁘게 세워 정리해요.', reason: '친구들이 아침에 오자마자 자기 번호의 우유를 엉키지 않고 기분 좋게 챙겨 마실 수 있게 도와줘요.' }],
  'board': [{ name: '칠판 지우개 천사', job: '매 교시 수업이 끝난 후 칠판을 칠판지우개와 크리너로 닦아 먼지가 안 나게 하얗게 정리해두어요.', reason: '다음 수업 때 선생님이 칠판에 쓰시는 내용이 한눈에 쏙쏙 들어오도록 돕고 먼지 날림을 방지해요.' }],
  'lockers': [{ name: '사물함 정리 정돈가', job: '친구들이 사물함을 열었을 때 교과서와 미술도구가 쏟아지지 않도록 사물함 안을 가지런히 정돈해 줍니다.', reason: '각자 쓰는 사물함을 깨끗하게 돌보아 교실 속 자신의 보물창고를 스스로 아끼게 만들기 위해서예요.' }],
  'boardgames': [{ name: '보드게임 지킴이', job: '쉬는 시간이 끝나면 보드게임 박스의 카드와 말이 섞이지 않게 확인하고 부품이 다 있는지 살핀 후 제자리에 정리해요.', reason: '상자 속 부속품이 흩어지거나 잃어버리는 일 없이 매번 새것처럼 즐겁게 보드게임을 즐기기 위해서예요.' }],
  'desks': [{ name: '책상 각도 조절사', job: '이동 수업이나 하교 전, 쉬는 시간에 삐뚤삐뚤하게 흐트러진 책상과 의자의 줄을 곧게 맞추어 줍니다.', reason: '책상 사이가 좁아 친구들이 걸어가다 다치지 않게 보호하고, 교실을 더욱 넓고 정돈되게 만들기 위해서예요.' }],
  'clean_tools': [{ name: '청소 도구 관리관', job: '빗자루와 걸레가 바닥에 방치되지 않게 종류별로 청소도구함에 가지런히 걸고 정돈해 줍니다.', reason: '청소 도구가 망가지는 것을 방지하고, 필요할 때 누구나 쉽게 도구를 찾아 청소할 수 있게 돕기 위해서예요.' }],
  'tablet_pc': [{ name: '태블릿 PC 보안관', job: '수업에 쓰는 태블릿 충전선의 엉킴을 정성껏 풀고 모든 기기가 똑바로 충전 단자에 연결되었는지 확인해요.', reason: '다음 디지털 기기 수업 시간에 친구들이 충전 부족으로 공부를 못 하는 일이 없도록 예방하기 위해서예요.' }]
};

const TRAITS_CATEGORIES = {
  personality: {
    title: '성격 🧠',
    items: [
      { id: '꼼꼼함', label: '꼼꼼함 🔍', desc: '작은 것도 세심하게 살펴요' },
      { id: '창의적', label: '창의적 💡', desc: '기발한 아이디어가 많아요' },
      { id: '규칙준수', label: '규칙준수 📋', desc: '약속과 규칙을 잘 지켜요' },
      { id: '도우미', label: '친절도우미 🤝', desc: '친구를 돕는 일에 보람을 느껴요' },
      { id: '용감함', label: '용감함 🦁', desc: '어려운 일도 씩씩하게 도전해요' }
    ]
  },
  behavior: {
    title: '행동 🏃',
    items: [
      { id: '정리정돈', label: '정리정돈 🧹', desc: '주변을 깨끗하게 정리해요' },
      { id: '활동적', label: '활동적 🏃', desc: '움직이고 청소하는 걸 좋아해요' },
      { id: '신중함', label: '신중함 🐢', desc: '서두르지 않고 차분히 행동해요' },
      { id: '협동적', label: '협동적 👥', desc: '친구들과 힘을 합쳐 일해요' }
    ]
  },
  likes: {
    title: '좋아하는 것 ❤️',
    items: [
      { id: '식물사랑', label: '자연식물 🪴', desc: '자연과 식물을 아끼고 돌봐요' },
      { id: '그림그리기', label: '그림그리기 🎨', desc: '그리고 만들기를 즐겨해요' },
      { id: '책읽기', label: '독서 📚', desc: '책 속의 새 지식을 좋아해요' },
      { id: '기기사용', label: '기기사용 💻', desc: '태블릿과 기기 작동을 좋아해요' }
    ]
  },
  skills: {
    title: '잘하는 것 ✨',
    items: [
      { id: '글쓰기', label: '글쓰기 ✍️', desc: '내 생각과 사실을 글로 잘 적어요' },
      { id: '발표설명', label: '발표설명 🎤', desc: '내 의견을 당당하게 설명해요' },
      { id: '갈등조율', label: '갈등조율 ⚖️', desc: '친구들의 갈등을 평화롭게 풀어요' },
      { id: '수리계산', label: '수리계산 🔢', desc: '숫자를 세거나 계산하는 걸 잘해요' }
    ]
  }
};

const TRAITS_LIST = [
  { id: '정리정돈', label: '정리정돈 🧹', desc: '주변을 깨끗하게 정리해요' },
  { id: '식물사랑', label: '식물사랑 🪴', desc: '자연과 식물을 아껴요' },
  { id: '활동적', label: '활동적 🏃', desc: '움직이고 청소하기를 좋아해요' },
  { id: '꼼꼼함', label: '꼼꼼함 🔍', desc: '작은 것도 세심하게 살펴요' },
  { id: '도우미', label: '도우미 🤝', desc: '친구를 돕는 일에 보람을 느껴요' },
  { id: '창의적', label: '창의적 💡', desc: '새롭고 재미있는 아이디어가 많아요' },
  { id: '규칙준수', label: '규칙준수 📋', desc: '약속과 규칙을 잘 지켜요' },
  { id: '글쓰기', label: '글쓰기 ✍️', desc: '글씨를 쓰고 기록하기를 좋아해요' }
];

const APPLICATION_KEYWORDS = [
  '책임감 🎯', '성실함 📅', '친절함 🤝', '도전정신 🏃', '꼭 해보고 싶어요 ❤️', '도움이 되고 싶어요 🙋', '깨끗하게 만들게요 🧹', '정리왕이 될게요 📦', '약속을 잘 지켜요 🤙'
];


export const RoleFlow = () => {
  // --- STATE VARIABLES ---
  const [step, setStep] = useState(0);
  const [studentName, setStudentName] = useState('');
  const [studentGrade, setStudentGrade] = useState<number>(3);
  const [studentClass, setStudentClass] = useState<number>(1);
  const [studentGender, setStudentGender] = useState<'boy' | 'girl'>('boy');
  
  // Group Sync States
  const [groupId, setGroupId] = useState<string>('');
  const [myStudentId] = useState<string>(() => `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
  const [groupRealStudents, setGroupRealStudents] = useState<Record<string, any>>({});
  const [isTeacherLocked, setIsTeacherLocked] = useState(true);
  const [showTeacherPasswordModal, setShowTeacherPasswordModal] = useState(false);
  const [teacherPasswordInput, setTeacherPasswordInput] = useState('');
  const [isPrintingAll, setIsPrintingAll] = useState(false);

  // Check for group ID in URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlGroup = params.get('group');
    if (urlGroup) {
      setGroupId(urlGroup);
      const parts = urlGroup.split('-');
      if (parts.length === 2) {
        const grade = parseInt(parts[0]);
        const cls = parseInt(parts[1]);
        if (!isNaN(grade)) setStudentGrade(grade);
        if (!isNaN(cls)) setStudentClass(cls);
      }
    }
  }, []);

  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [customProblem, setCustomProblem] = useState('');
  
  // Custom concerns list
  const [customProblemsList, setCustomProblemsList] = useState<Array<{ id: string; emoji: string; title: string; desc: string }>>([]);
  // Brainstorm comments state
  const [userBrainstormComment, setUserBrainstormComment] = useState('');
  const [brainstormComments, setBrainstormComments] = useState<Array<{ name: string; avatar: string; comment: string; problemId: string }>>([]);
  
  interface Role {
    id: string;
    name: string;
    job: string;
    reason: string;
    isCustom?: boolean;
    problemId?: string;
    recommendedBy?: string;
    votes?: number;
    capacity?: number;
  }
  const [rolePool, setRolePool] = useState<Role[]>([]);
  const [isGeneratingRoles, setIsGeneratingRoles] = useState(false);
  const [isMergingRoles, setIsMergingRoles] = useState(false);
  const [isGeneratingExtraRoles, setIsGeneratingExtraRoles] = useState(false);

  // Voting states
  const [roleVotes, setRoleVotes] = useState<Record<string, number>>({});
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [isSimulatingVotes, setIsSimulatingVotes] = useState(false);
  const [hasVotedSimulated, setHasVotedSimulated] = useState(false);

  // Teacher Swap state
  const [teacherSwapA, setTeacherSwapA] = useState('');
  const [teacherSwapB, setTeacherSwapB] = useState('');
  
  // Custom role state
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleJob, setNewRoleJob] = useState('');
  const [newRoleReason, setNewRoleReason] = useState('');
  const [newRoleProblemId, setNewRoleProblemId] = useState('');
  const [newRoleRecommendedBy, setNewRoleRecommendedBy] = useState('');
  const [showAddCustomRole, setShowAddCustomRole] = useState(false);

  // Suitability check states
  // roleId -> answers
  const [fitTestAnswers, setFitTestAnswers] = useState<Record<string, { q1: number; q2: number; q3: number }>>({});
  // Explored role IDs
  const [activeRoleForFit, setActiveRoleForFit] = useState<string | null>(null);

  // Application states
  const [applications, setApplications] = useState({ first: '', second: '', third: '' });
  const [applicationReasons, setApplicationReasons] = useState({ first: '', second: '', third: '' });
  const [isDraftingReason, setIsDraftingReason] = useState<Record<'first' | 'second' | 'third', boolean>>({ first: false, second: false, third: false });

  // Classroom Simulation States
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [hasModified, setHasModified] = useState(false);

  // Assignment results
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [matchDetails, setMatchDetails] = useState<Record<string, any>>({});
  const [isAssigning, setIsAssigning] = useState(false);
  const [pledge, setPledge] = useState('');
  const [assignmentsCapacities, setAssignmentsCapacities] = useState<Record<string, number>>({});

  // Teacher Mode States
  const [viewMode, setViewMode] = useState<'student' | 'teacher'>('student');
  const [classmateCount, setClassmateCount] = useState<number>(24);
  const [isAutoCapacity, setIsAutoCapacity] = useState<boolean>(true);
  const [customCapacity, setCustomCapacity] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'boy' | 'girl'>('all');
  const [assignedFilter, setAssignedFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // Mascot guide speech list
  const [mascotSpeech, setMascotSpeech] = useState('안녕! 나는 우리 반 역할 배정을 도와줄 다정한 조수 아리(Ari)야! 우선 너의 멋진 이름을 알려줄래? 👋');

  const printAreaRef = useRef<HTMLDivElement>(null);

    // New state: studentTraits
  const [studentTraits, setStudentTraits] = useState<string[]>([]);

  // Custom sync states
  const [isSubmittedForStep, setIsSubmittedForStep] = useState(false);
  const [isRegisteredInGroup, setIsRegisteredInGroup] = useState(false);
  const [applicationKeywords, setApplicationKeywords] = useState<Record<'first' | 'second' | 'third', string[]>>({
    first: [],
    second: [],
    third: []
  });

  // Reset submit status on step change
  useEffect(() => {
    setIsSubmittedForStep(false);
  }, [step]);

  // Handle selecting a trait (only one per category)
  const handleSelectTrait = (categoryKey: string, traitId: string) => {
    setStudentTraits(prev => {
      const categoryItems = TRAITS_CATEGORIES[categoryKey as keyof typeof TRAITS_CATEGORIES].items.map(item => item.id);
      const cleanPrev = prev.filter(id => !categoryItems.includes(id));
      return [...cleanPrev, traitId];
    });
  };

  // Helper to map traits to roles
  const getMatchingTraitsForRole = (roleName: string): string[] => {
    const name = roleName.toLowerCase();
    const matches: string[] = [];
    if (name.includes('분리수거') || name.includes('정리') || name.includes('사물함') || name.includes('보드게임') || name.includes('도서') || name.includes('우유') || name.includes('책')) {
      matches.push('정리정돈');
    }
    if (name.includes('식물') || name.includes('화분') || name.includes('자연') || name.includes('동물')) {
      matches.push('식물사랑');
    }
    if (name.includes('쓸기') || name.includes('바닥') || name.includes('청소') || name.includes('칠판') || name.includes('지우개')) {
      matches.push('활동적');
    }
    if (name.includes('꼼꼼') || name.includes('에너지') || name.includes('창문') || name.includes('태블릿') || name.includes('보안관') || name.includes('정리') || name.includes('책')) {
      matches.push('꼼꼼함');
    }
    if (name.includes('도우미') || name.includes('친구') || name.includes('천사') || name.includes('요정')) {
      matches.push('도우미');
    }
    if (name.includes('아이디어') || name.includes('창의') || name.includes('특별') || name.includes('기발')) {
      matches.push('창의적');
    }
    if (name.includes('에너지') || name.includes('불') || name.includes('규칙') || name.includes('창문') || name.includes('단속') || name.includes('태블릿')) {
      matches.push('규칙준수');
    }
    if (name.includes('글') || name.includes('기록') || name.includes('서명') || name.includes('보고서')) {
      matches.push('글쓰기');
    }
    // New Traits Matchers
    if (name.includes('그림') || name.includes('그리기') || name.includes('미술') || name.includes('디자인') || name.includes('칠판')) {
      matches.push('그림그리기');
    }
    if (name.includes('책') || name.includes('독서') || name.includes('학급문고')) {
      matches.push('책읽기');
    }
    if (name.includes('태블릿') || name.includes('충전') || name.includes('기기') || name.includes('컴퓨터')) {
      matches.push('기기사용');
    }
    if (name.includes('발표') || name.includes('설명') || name.includes('소개')) {
      matches.push('발표설명');
    }
    if (name.includes('조율') || name.includes('중재') || name.includes('평화')) {
      matches.push('갈등조율');
    }
    if (name.includes('계산') || name.includes('숫자') || name.includes('우유') || name.includes('번호')) {
      matches.push('수리계산');
    }
    return matches;
  };

  // Helper to calculate suitability score
  const calculateSuitability = (roleId: string): number => {
    const role = rolePool.find(r => r.id === roleId);
    if (!role) return 50;

    // 1. Calculate traits matching
    const matchingTraits = getMatchingTraitsForRole(role.name);
    let traitsScore = 70; // fallback if student selected no traits
    if (studentTraits.length > 0) {
      const overlapping = studentTraits.filter(t => matchingTraits.includes(t));
      traitsScore = 55 + overlapping.length * 18;
      if (traitsScore > 95) traitsScore = 95;
    }

    // 2. Combine with survey if survey was taken
    const answers = fitTestAnswers[roleId];
    if (answers) {
      const total = answers.q1 + answers.q2 + answers.q3; // max 15, min 3
      const surveyScore = Math.round((total / 15) * 100);
      // Combine: 40% traits, 60% survey
      return Math.round(traitsScore * 0.4 + surveyScore * 0.6);
    }

    return traitsScore;
  };

  // Calculate suitability for an arbitrary student
  const calculateSuitabilityForStudent = (
    sTraits: string[],
    sFitAnswers: Record<string, { q1: number; q2: number; q3: number }>,
    roleId: string
  ): number => {
    const role = rolePool.find(r => r.id === roleId);
    if (!role) return 50;

    const matchingTraits = getMatchingTraitsForRole(role.name);
    let traitsScore = 70;
    if (sTraits && sTraits.length > 0) {
      const overlapping = sTraits.filter(t => matchingTraits.includes(t));
      traitsScore = 55 + overlapping.length * 18;
      if (traitsScore > 95) traitsScore = 95;
    }

    const answers = sFitAnswers ? sFitAnswers[roleId] : undefined;
    if (answers) {
      const total = answers.q1 + answers.q2 + answers.q3;
      const surveyScore = Math.round((total / 15) * 100);
      return Math.round(traitsScore * 0.4 + surveyScore * 0.6);
    }

    return traitsScore;
  };

  // Teacher State sync push effect
  useEffect(() => {
    if (viewMode === 'teacher' && groupId) {
      const pushState = async () => {
        try {
          await fetch(`/api/sync?group=${encodeURIComponent(groupId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_state',
              state: {
                step,
                rolePool,
                roleVotes,
                classmates,
                assignments,
                hasVotedSimulated,
                classmateCount,
                isAutoCapacity,
                customCapacity,
                matchDetails
              }
            })
          });
        } catch (e) {
          console.error("Error pushing teacher state:", e);
        }
      };
      pushState();
    }
  }, [
    viewMode,
    groupId,
    step,
    rolePool,
    roleVotes,
    classmates,
    assignments,
    hasVotedSimulated,
    classmateCount,
    isAutoCapacity,
    customCapacity,
    matchDetails
  ]);

  // Student State sync push effect
  useEffect(() => {
    if (viewMode === 'student' && groupId && studentName.trim() && isRegisteredInGroup) {
      const pushStudent = async () => {
        try {
          const studentInfo = {
            id: myStudentId,
            name: studentName,
            gender: studentGender,
            traits: studentTraits,
            step: step,
            isDone: isSubmittedForStep,
            selectedProblems,
            brainstormComment: userBrainstormComment,
            userVotes,
            fitTestAnswers,
            applications,
            applicationReasons,
            pledge: pledge
          };
          await fetch(`/api/sync?group=${encodeURIComponent(groupId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'submit_student',
              student: studentInfo
            })
          });
        } catch (e) {
          console.error("Error pushing student state:", e);
        }
      };
      pushStudent();
    }
  }, [
    viewMode,
    groupId,
    studentName,
    studentGender,
    studentTraits,
    isSubmittedForStep,
    selectedProblems,
    userBrainstormComment,
    userVotes,
    fitTestAnswers,
    applications,
    applicationReasons,
    pledge,
    myStudentId,
    step,
    isRegisteredInGroup
  ]);

  // Group Polling effect
  useEffect(() => {
    if (!groupId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync?group=${encodeURIComponent(groupId)}`);
        if (res.ok) {
          const data = await res.json();
          const serverState = data.state;
          if (serverState) {
            setGroupRealStudents(serverState.students || {});
            
            if (viewMode === 'student') {
              if (typeof serverState.step === 'number' && serverState.step !== step) {
                setStep(serverState.step);
              }
              if (Array.isArray(serverState.rolePool)) {
                setRolePool(serverState.rolePool);
              }
              if (serverState.roleVotes) {
                setRoleVotes(serverState.roleVotes);
              }
              if (Array.isArray(serverState.classmates)) {
                setClassmates(serverState.classmates);
              }
              if (serverState.assignments) {
                setAssignments(serverState.assignments);
              }
              setHasVotedSimulated(!!serverState.hasVotedSimulated);
              setClassmateCount(serverState.classmateCount || 24);
              setIsAutoCapacity(serverState.isAutoCapacity ?? true);
              setCustomCapacity(serverState.customCapacity || {});
              setMatchDetails(serverState.matchDetails || {});
            }
          }
        }
      } catch (e) {
        console.error("Error polling group state:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [groupId, viewMode, step]);

  // Handle reset isPrintingAll after printing
  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrintingAll(false);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handlePrintAll = () => {
    setIsPrintingAll(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };


  const calculatePercent = (roleId: string): number => {
    return calculateSuitability(roleId);
  };

  const calculateStars = (roleId: string): number => {
    return Math.round((calculateSuitability(roleId) / 100) * 5);
  };

  // Update mascot speech on step change
  useEffect(() => {
    switch (step) {
      case 0:
        setMascotSpeech(`안녕! 나는 우리 반 역할 지정을 도와줄 귀여운 조수 아리(Ari)야. 우리 같이 1인 1역할을 정해볼까? 먼저 이름과 너를 나타내는 멋진 성격 태그를 골라줘! 🏷️`);
        break;
      case 1:
        setMascotSpeech(`${studentName}아, 반가워! 1단계는 우리 반의 작은 고민들을 찾아보는 거야. 평소 교실에서 불편했던 점이나 정돈이 필요한 것들을 골라볼래?`);
        break;
      case 2:
        setMascotSpeech(`골라준 고민들을 해결하기 위해 의견을 나누는 단계야. 친구들과 고민에 대해 자유롭게 이야기해 보고 해결책을 함께 브레인스토밍해 보자! 💬`);
        break;
      case 3:
        setMascotSpeech(`우리 반의 고민들을 해결할 수 있는 역할을 제안할 시간이야! AI 추천 역할을 살펴보거나 새로운 역할을 직접 제안해 봐. 너무 비슷한 역할은 하나로 합쳐서 보여줄 수도 있어! ✨`);
        break;
      case 4:
        setMascotSpeech(`제안된 역할들에 대해 투표해 보는 시간이야! 친구들이 좋아할 만한 좋은 아이디어에 하트를 꾹 눌러줘! 💖 그리고 정원이 총 인원 수와 잘 맞는지 꼭 확인해 봐.`);
        break;
      case 5:
        setMascotSpeech(`각 역할이 어떤 일을 하는지 살펴보고, 나와 얼마나 잘 맞는지 '적합도 검사'를 해보자! 최소 3개 이상의 역할을 클릭해 스마일 스티커를 붙여줘! ⭐`);
        break;
      case 6:
        setMascotSpeech(`이제 하고 싶은 역할을 1지망부터 3지망까지 고를 시간이야! 왜 이 역할을 잘할 수 있는지 마음을 담아 써보자. 쓰기가 힘들면 내 🪄 AI 마술봉을 눌러봐!`);
        break;
      case 7:
        setMascotSpeech(`우와! 우리 반 친구들의 지원서가 모두 들어왔어! 역할별로 경쟁률이 어떨지 그래프를 보면서 확인해보자. 친구들이 쓴 지망 이유도 읽어볼 수 있어!`);
        break;
      case 8:
        setMascotSpeech(`친구들의 경쟁률을 보니 어때? 혹시 다른 역할에 가보고 싶어졌니? 지망을 바꾸고 싶다면 '딱 한 번만' 수정할 기회를 줄게! 그대로 두어도 좋아.`);
        break;
      case 9:
        setMascotSpeech(`준비 완료! 모두의 선호도와 적합도를 모아서 내가 지혜롭고 공평하게 역할을 나누어 줄게. 과연 어떤 역할을 맡게 될까? 아래 배정 버튼을 눌러줘! 🎲`);
        break;
      case 10:
        setMascotSpeech(`축하해! 🎉 우리 교실의 고민을 멋지게 해결해줄 역할로 최종 선정되었어! 임명장을 확인하고, 이번 학기 동안 어떤 마음으로 활동할지 다짐을 적어 서명해봐!`);
        break;
      default:
        setMascotSpeech('만나서 반가워! 역할을 골라보자!');
    }
  }, [step, studentName]);

  const nextStep = () => {
    if (step === 0) {
      if (!studentName.trim()) {
        alert('이름을 입력해주세요!');
        return;
      }
    }
    if (step === 1) {
      if (selectedProblems.length === 0) {
        alert('최소 하나의 고민을 선택하거나 입력해주세요!');
        return;
      }
      
      // Initialize brainstorm comments
      const initialComments: typeof brainstormComments = [];
      const classmateNames = ['민준', '지우', '서현', '예준', '하은', '주원', '수빈', '도윤'];
      const avatars = ['👦', '👧', '👧', '👦', '👧', '👦', '👧', '👦'];

      const commentMap: Record<string, string[]> = {
        trash: [
          "쓰레기통 주변에 음료수가 뚝뚝 떨어져서 파리가 꼬이는 게 문제야. 청소도 하고 감시도 하는 역할이 필요해!",
          "분리수거 쓰레기통 주변 진짜 매일 지저분해서 들어갈 때 냄새났어. 꼭 분리수거 대장이 있으면 좋겠어!"
        ],
        lights: [
          "체육 하러 갈 때마다 불 다 켜져 있는 거 보면 지구온난화가 생각났어. 에너지 지키미 최고!",
          "교실 불 끄기 역할 있으면 좋겠다. 깜빡하고 나갈 때가 너무 많아."
        ],
        floor: [
          "지우개 가루 너무 뒹굴어! 책상 털이 도우미나 바닥 먼지 킬러 역할 어때?",
          "공부 다 하고 나서 사물함 앞 바닥 청소하는 친구들 진짜 천사야. 역할로 정해주자!"
        ],
        windows: [
          "비 오는 날 창문 열려 있어서 책상 다 젖은 적 있었잖아. 창문 단속반 꼭 만들자!",
          "환기 시키는 걸 까먹을 때가 많은데 환기 대장이 있으면 진짜 좋을 것 같아."
        ],
        books: [
          "책 읽고 싶어서 학급문고 갔는데 다 엉망이라 못 찾았던 적 많아. 정리가 꼭 필요해!",
          "도서실 책장처럼 가나다순이나 종류별로 정리하면 진짜 멋지겠다."
        ],
        plants: [
          "우리 반 화분이 맨날 바짝 말라 있는 것 같아서 속상해. 식물 집사 있으면 내가 해보고 싶어!",
          "화분에 매일 사랑을 담아 물을 주는 역할 찬성!"
        ],
        milk: [
          "우유 번호 찾는 게 보물찾기 같아... 번호순으로 세워두는 정돈 요정 진짜 시급해.",
          "우유팩 정리해두면 가져갈 때 정말 편하겠네."
        ],
        board: [
          "쉬는 시간에 낙서하고 안 지우는 거 선생님이 지우실 때 힘들어 보이셔. 칠판 도우미 있으면 최고!",
          "칠판을 늘 새것처럼 깨끗이 유지해주는 도우미 역할 진짜 필요해."
        ]
      };

      const customComments = [
        "이 고민 꼭 해결해야 해! 우리 반 규칙으로 삼자.",
        "맞아, 매번 신경 쓰기 힘들었던 부분인데 고민으로 올라와서 다행이야.",
        "이걸 정돈해줄 책임 도우미가 필요하겠어!",
        "사소하지만 매번 거슬렸는데 다같이 잘 지켜보자!"
      ];

      const finalSelected = [...selectedProblems];
      finalSelected.forEach((probId, idx) => {
        const mappedComments = commentMap[probId] || customComments;
        
        mappedComments.forEach((text, cIdx) => {
          const nameIdx = (idx * 2 + cIdx) % classmateNames.length;
          initialComments.push({
            name: classmateNames[nameIdx],
            avatar: avatars[nameIdx],
            comment: text,
            problemId: probId
          });
        });
      });

      setBrainstormComments(initialComments);
      setSelectedProblemForComment(finalSelected[0] || 'trash');
    }
    if (step === 2) {
      // Initialize roles from selected problems when moving to step 3 (역할 제안)
      generateRolesFromProblems();
    }
    if (step === 3) {
      if (rolePool.length < 4) {
        alert('최소 4개 이상의 역할이 있어야 합니다!');
        return;
      }
    }
    if (step === 4) {
      if (!hasVotedSimulated) {
        alert('먼저 투표 결과를 확인하거나 친구들 투표 시뮬레이션을 완료해주세요!');
        return;
      }
    }
    if (step === 5) {
      // Must test at least 3 roles
      const testedCount = Object.keys(fitTestAnswers).length;
      if (testedCount < Math.min(3, rolePool.length)) {
        alert(`나와의 적합도를 알아보기 위해 최소 ${Math.min(3, rolePool.length)}개 이상의 역할에 스마일 스티커를 붙여주세요! (현재 ${testedCount}개 완료)`);
        return;
      }
    }
    if (step === 6) {
      if (!applications.first) {
        alert('1지망 역할은 꼭 선택해주셔야 해요!');
        return;
      }
      if (!applicationReasons.first.trim()) {
        alert('1지망 역할에 지원하는 이유를 적어주세요!');
        return;
      }
      // Generate simulated classmates when moving to Step 7 (경쟁률 확인)
      const generatedClassmates = generateClassmates(classmateCount, rolePool);
      setClassmates(generatedClassmates);
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setStep(prev => Math.max(0, prev - 1));
  };

  // Step 1 helper to toggle problem selection
  const toggleProblem = (id: string) => {
    setSelectedProblems(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  // Step 1 custom problem addition
  const handleAddCustomProblem = () => {
    if (!customProblem.trim()) {
      alert('추가할 고민 내용을 적어주세요!');
      return;
    }
    const customId = `custom-prob-${Date.now()}`;
    const emojis = ['🏫', '🎒', '📝', '✏️', '🧠', '💬', '🧹', '📚', '🥛', '🖍️'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const newCustom = {
      id: customId,
      emoji: randomEmoji,
      title: customProblem.trim(),
      desc: '우리가 직접 찾은 교실 생활 불편 사항이에요.'
    };
    setCustomProblemsList(prev => [...prev, newCustom]);
    setSelectedProblems(prev => [...prev, customId]);
    setCustomProblem('');
  };

  // Step 2 custom brainstorm comment addition
  const [selectedProblemForComment, setSelectedProblemForComment] = useState('trash');
  const handleAddBrainstormComment = () => {
    if (!userBrainstormComment.trim()) {
      alert('의견을 입력해주세요!');
      return;
    }
    const probId = selectedProblemForComment || selectedProblems[0];
    if (!probId) {
      alert('고민을 선택해주세요!');
      return;
    }
    const newComment = {
      name: studentName + ' (나)',
      avatar: studentGender === 'boy' ? '👦' : '👧',
      comment: userBrainstormComment.trim(),
      problemId: probId
    };
    setBrainstormComments(prev => [...prev, newComment]);
    setUserBrainstormComment('');
  };

  // Step 3 helper: Generate Roles based on selected problems
  const generateRolesFromProblems = () => {
    if (rolePool.length > 0) return;

    let generated: Role[] = [];
    const problemKeys = selectedProblems.length > 0 ? selectedProblems : ['trash', 'lights', 'floor'];

    problemKeys.forEach((key, index) => {
      const match = DEFAULT_ROLES_MAP[key];
      if (match) {
        match.forEach((r, idx) => {
          generated.push({
            id: `role-${key}-${idx}-${index}-${Date.now()}`,
            name: r.name,
            job: r.job,
            reason: r.reason,
            problemId: key,
            recommendedBy: 'AI 아리',
            votes: 0,
            capacity: 1
          });
        });
      } else {
        const customObj = customProblemsList.find(cp => cp.id === key);
        if (customObj) {
          generated.push({
            id: `role-${key}-${index}-${Date.now()}`,
            name: `${customObj.title.substring(0, 6)} 도우미`,
            job: `[${customObj.title}] 문제를 해결하기 위해 관련 사항을 스스로 돌보는 일이에요.`,
            reason: `학급 고민인 '${customObj.title}' 문제를 다함께 극복해 나가기 위해서예요.`,
            problemId: key,
            recommendedBy: 'AI 아리',
            votes: 0,
            capacity: 1
          });
        }
      }
    });

    if (generated.length < 4) {
      const allKeys = Object.keys(DEFAULT_ROLES_MAP);
      for (const k of allKeys) {
        if (!problemKeys.includes(k)) {
          const match = DEFAULT_ROLES_MAP[k][0];
          generated.push({
            id: `role-fill-${k}-${Date.now()}`,
            name: match.name,
            job: match.job,
            reason: match.reason,
            problemId: k,
            recommendedBy: 'AI 아리',
            votes: 0,
            capacity: 1
          });
          if (generated.length >= 4) break;
        }
      }
    }

    setRolePool(generated);
  };

  // Ask AI to generate creative roles based on selected problems
  const handleAskAIRoles = async () => {
    setIsGeneratingRoles(true);
    
    const activeProblems = [
      ...selectedProblems.map(id => {
        const predefined = PROBLEM_LIST.find(p => p.id === id);
        if (predefined) return { id, title: predefined.title };
        const custom = customProblemsList.find(p => p.id === id);
        if (custom) return { id, title: custom.title };
        return null;
      })
    ].filter(Boolean) as Array<{ id: string; title: string }>;

    const problemsDescription = activeProblems.map(p => `[ID: ${p.id}] ${p.title}`).join(', ');

    try {
      const systemPrompt = `당신은 초등학교 3~4학년 학급 경영을 돕는 친절한 AI 조수 '아리'입니다.
학생들이 선택한 학급 문제점들을 해결하기 위한 귀엽고 창의적인 1인 1역할을 5~6개 추천해주세요.
각 역할은 반드시 전달된 문제 중 하나와 매칭되어야 합니다.
반드시 아래 JSON 배열 형식으로만 응답하며, 앞뒤에 다른 말이나 \`\`\`json 기호를 포함하지 말아주세요.
JSON 포맷:
[
  {
    "problemId": "매칭되는 문제의 ID (전달받은 고민 ID 목록 중 하나)",
    "name": "역할 이름 (예: 칠판 지우개 요정, 도서관 박사)",
    "job": "어린이가 알아듣기 쉬운 말로, 매일 실천할 구체적인 활동 내용",
    "reason": "왜 이 역할이 교실에 필요한지 어린이가 납득할 수 있는 친근한 필요성 이유"
  }
]`;
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `우리 반의 고민 목록: ${problemsDescription}` }
      ];

      const res = await sendMessageToAPI(messages as any);
      
      let cleaned = res.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
      }

      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const mappedRoles = parsed.map((r, i) => ({
          id: `ai-role-${i}-${Date.now()}`,
          name: r.name || '특별 도우미',
          job: r.job || '교실의 미화나 정리를 성실히 돕는 일',
          reason: r.reason || '우리 학급의 쾌적한 환경을 유지하기 위해서예요.',
          problemId: r.problemId || activeProblems[0]?.id || 'trash',
          recommendedBy: 'AI 아리',
          votes: 0,
          capacity: 1
        }));
        setRolePool(mappedRoles);
      } else {
        throw new Error('Not a valid array');
      }
    } catch (error) {
      console.error('AI Role Generation Error:', error);
      alert('AI가 바쁜 것 같아요! 기본 생활 도우미 역할 목록으로 먼저 채워줄게요. 대신 우리가 직접 역할을 만들어 추가할 수도 있어요!');
      generateRolesFromProblems();
    } finally {
      setIsGeneratingRoles(false);
    }
  };

  // Merge similar roles using AI
  const handleMergeRolesAI = async () => {
    if (rolePool.length < 2) {
      alert('통합할 역할이 부족합니다!');
      return;
    }
    setIsMergingRoles(true);

    try {
      const activeProblems = [
        ...selectedProblems.map(id => {
          const predefined = PROBLEM_LIST.find(p => p.id === id);
          if (predefined) return { id, title: predefined.title };
          const custom = customProblemsList.find(p => p.id === id);
          if (custom) return { id, title: custom.title };
          return null;
        })
      ].filter(Boolean) as Array<{ id: string; title: string }>;

      const rolesText = rolePool.map(r => JSON.stringify({
        id: r.id,
        name: r.name,
        job: r.job,
        reason: r.reason,
        problemId: r.problemId,
        recommendedBy: r.recommendedBy
      })).join('\n');

      const systemPrompt = `당신은 초등학교 학급 역할을 정돈하는 친절한 AI 조수 '아리'입니다.
현재 학급 역할 목록을 분석하여, 지나치게 이름이나 하는 일(역할)이 중복되거나 유사한 역할들을 찾아 하나로 통합하고 깔끔하게 정리해주세요.
서로 다른 고민을 해결하는 고유한 역할들은 그대로 유지하되, 너무 비슷한 역할(예: '칠판 지우개 천사'와 '칠판 뽀드득 요정')은 더 어울리는 창의적이고 대표적인 이름과 명확한 설명으로 하나로 합쳐야 합니다.
통합 완료 후 정돈된 학급 역할 목록을 반드시 아래 JSON 배열 형식으로만 응답하고, 앞뒤에 다른 설명이나 \`\`\`json 기호를 일절 포함하지 마세요.
최소 4개 이상의 역할이 유지되도록 해주세요.
JSON 포맷:
[
  {
    "name": "정돈된 역할 이름",
    "job": "수행할 구체적이고 다정한 업무 설명",
    "reason": "해당 역할의 필요성 및 이유",
    "problemId": "매칭되는 문제의 ID",
    "recommendedBy": "최초 제안자 정보 (예: 'AI 아리' 또는 학생 이름. 통합된 경우 'AI 아리(통합)' 혹은 '합동 제안' 등으로 예쁘게 표기)"
  }
]`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `현재 역할 목록:\n${rolesText}\n\n사용 가능한 고민 ID 목록:\n${activeProblems.map(p => p.id).join(', ')}` }
      ];

      const res = await sendMessageToAPI(messages as any);
      
      let cleaned = res.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
      }

      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const mappedRoles = parsed.map((r, i) => ({
          id: `merged-role-${i}-${Date.now()}`,
          name: r.name || '통합 도우미',
          job: r.job || '학급의 청결과 정돈을 돕는 유익한 활동',
          reason: r.reason || '우리 반 생활 고민을 해결하기 위해서예요.',
          problemId: r.problemId || activeProblems[0]?.id || 'trash',
          recommendedBy: r.recommendedBy || 'AI 아리',
          votes: 0,
          capacity: 1
        }));
        setRolePool(mappedRoles);
        alert('AI가 너무 비슷한 역할들을 하나로 정성스럽게 통합하여 정돈했습니다!');
      } else {
        throw new Error('Not a valid array');
      }
    } catch (error) {
      console.error('AI Role Merging Error:', error);
      alert('AI가 정리 중에 조금 고민이 길어지나 봐요. 지금 역할 목록을 그대로 사용할게요!');
    } finally {
      setIsMergingRoles(false);
    }
  };

  // Add a user custom role in Step 3
  const handleAddCustomRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim() || !newRoleJob.trim()) {
      alert('역할 이름과 하는 일을 입력해주세요!');
      return;
    }
    const newRole: Role = {
      id: `custom-role-${Date.now()}`,
      name: newRoleName.trim(),
      job: newRoleJob.trim(),
      reason: newRoleReason.trim() || '우리 교실의 원활하고 기분 좋은 생활을 위해서입니다.',
      isCustom: true,
      problemId: newRoleProblemId || selectedProblems[0] || 'trash',
      recommendedBy: newRoleRecommendedBy.trim() || studentName || '학생',
      votes: 0,
      capacity: 1
    };
    setRolePool(prev => [...prev, newRole]);
    setNewRoleName('');
    setNewRoleJob('');
    setNewRoleReason('');
    setNewRoleProblemId('');
    setNewRoleRecommendedBy('');
    setShowAddCustomRole(false);
  };

  // Remove role from pool
  const removeRole = (id: string) => {
    if (rolePool.length <= 3) {
      alert('최소 3개 이상의 역할이 교실 풀에 있어야 해요!');
      return;
    }
    setRolePool(prev => prev.filter(r => r.id !== id));
    // Clear choice if deleted
    setApplications(prev => ({
      first: prev.first === id ? '' : prev.first,
      second: prev.second === id ? '' : prev.second,
      third: prev.third === id ? '' : prev.third,
    }));
  };

  // Step 4: Toggle user vote
  const handleToggleUserVote = (roleId: string) => {
    setUserVotes(prev => {
      const alreadyVoted = prev.includes(roleId);
      let updated: string[];
      if (alreadyVoted) {
        updated = prev.filter(id => id !== roleId);
        setRoleVotes(votes => ({
          ...votes,
          [roleId]: Math.max(0, (votes[roleId] || 0) - 1)
        }));
      } else {
        updated = [...prev, roleId];
        setRoleVotes(votes => ({
          ...votes,
          [roleId]: (votes[roleId] || 0) + 1
        }));
      }
      return updated;
    });
  };

  // Step 4: Simulate Classmate Votes
  const handleSimulateClassmateVotes = () => {
    setIsSimulatingVotes(true);
    
    const newVotes: Record<string, number> = {};
    rolePool.forEach(r => {
      newVotes[r.id] = userVotes.includes(r.id) ? 1 : 0;
    });

    setTimeout(() => {
      for (let i = 0; i < classmateCount; i++) {
        const voteCount = Math.floor(Math.random() * 2) + 2; // 2 or 3 votes
        const shuffled = [...rolePool].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, voteCount);
        selected.forEach(r => {
          newVotes[r.id] = (newVotes[r.id] || 0) + 1;
        });
      }
      
      setRoleVotes(newVotes);
      setIsSimulatingVotes(false);
      setHasVotedSimulated(true);
    }, 1500);
  };

  // Step 4: AI generate extra roles up to classmateCount + 1
  const handleGenerateExtraRolesAI = async (targetCount: number) => {
    setIsGeneratingExtraRoles(true);
    const needed = targetCount - rolePool.length;
    if (needed <= 0) {
      setIsGeneratingExtraRoles(false);
      return rolePool;
    }

    const activeProblems = [
      ...selectedProblems.map(id => {
        const predefined = PROBLEM_LIST.find(p => p.id === id);
        if (predefined) return { id, title: predefined.title };
        const custom = customProblemsList.find(p => p.id === id);
        if (custom) return { id, title: custom.title };
        return null;
      })
    ].filter(Boolean) as Array<{ id: string; title: string }>;

    const existingNames = rolePool.map(r => r.name).join(', ');

    try {
      const systemPrompt = `당신은 초등학교 학급 경영을 돕는 친절한 AI 조수 '아리'입니다.
우리 반의 총원인 ${targetCount}명에 맞추기 위해, 현재 존재하는 역할들과 중복되지 않는 새로운 역할을 추가로 ${needed}개 생성해주세요.
각 역할은 우리 반의 고민 목록과 관련되어야 하며, 매우 창의적이고 귀엽고 실천 가능한 것이어야 합니다.
반드시 아래 JSON 배열 형식으로만 응답하며, 앞뒤에 다른 설명이나 \`\`\`json 기호를 포함하지 마세요.
JSON 포맷:
[
  {
    "problemId": "매칭되는 문제의 ID (전달받은 고민 ID 목록 중 하나)",
    "name": "창의적인 새로운 역할 이름",
    "job": "어린이가 하기 쉬운 구체적인 실천 일",
    "reason": "이 역할이 교실에 필요한 다정하고 유용한 이유"
  }
]`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `고민 ID 목록: ${activeProblems.map(p => p.id).join(', ')}\n현재 존재하는 역할 목록: ${existingNames}\n\n추가로 필요한 역할 수: ${needed}개` 
        }
      ];

      const res = await sendMessageToAPI(messages as any);
      
      let cleaned = res.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
      }

      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const extraRoles = parsed.slice(0, needed).map((r, i) => ({
          id: `extra-role-${i}-${Date.now()}`,
          name: r.name || `추가 도우미 ${i+1}`,
          job: r.job || '교실의 환경 미화와 정리를 돕습니다.',
          reason: r.reason || '교실 인원수에 맞춰 모두가 1인 1역할을 수행하기 위해서예요.',
          problemId: r.problemId || activeProblems[0]?.id || 'trash',
          recommendedBy: 'AI 아리 (인원 보충)',
          votes: 0,
          capacity: 1
        }));
        
        const finalPool = [...rolePool, ...extraRoles];
        setRolePool(finalPool);
        return finalPool;
      }
    } catch (error) {
      console.error('AI Extra Role Generation Error:', error);
      const fallbackRoles: Role[] = [];
      for (let i = 0; i < needed; i++) {
        fallbackRoles.push({
          id: `fallback-extra-${i}-${Date.now()}`,
          name: `새싹 도우미 ${i + 1}`,
          job: '교실의 부족한 일손을 돕고 친구들의 물건 정리를 지원해요.',
          reason: '우리 학급의 모든 구성원이 1인 1역할을 기쁘게 나누어 맡기 위해서예요.',
          problemId: selectedProblems[0] || 'trash',
          recommendedBy: 'AI 아리 (임시 보충)',
          votes: 0,
          capacity: 1
        });
      }
      const finalPool = [...rolePool, ...fallbackRoles];
      setRolePool(finalPool);
      return finalPool;
    } finally {
      setIsGeneratingExtraRoles(false);
    }
    return rolePool;
  };

  // Largest Remainder Method for capacity distribution based on votes
  const distributeCapacitiesByVotes = (roles: Role[], totalSeats: number, votes: Record<string, number>): Record<string, number> => {
    const capacities: Record<string, number> = {};
    
    if (roles.length >= totalSeats) {
      const sorted = [...roles].sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0));
      roles.forEach(r => {
        capacities[r.id] = 0;
      });
      for (let i = 0; i < totalSeats; i++) {
        capacities[sorted[i].id] = 1;
      }
      return capacities;
    }

    roles.forEach(r => {
      capacities[r.id] = 1;
    });

    let remainingSeats = totalSeats - roles.length;
    if (remainingSeats <= 0) return capacities;

    const totalVotes = roles.reduce((sum, r) => sum + (votes[r.id] || 0), 0);
    
    if (totalVotes === 0) {
      let index = 0;
      while (remainingSeats > 0) {
        const rId = roles[index % roles.length].id;
        capacities[rId]++;
        remainingSeats--;
        index++;
      }
      return capacities;
    }

    const remainders: { id: string; remainder: number }[] = [];
    roles.forEach(r => {
      const share = ((votes[r.id] || 0) / totalVotes) * (totalSeats - roles.length);
      const integerPart = Math.floor(share);
      capacities[r.id] += integerPart;
      remainingSeats -= integerPart;
      remainders.push({ id: r.id, remainder: share - integerPart });
    });

    remainders.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < remainingSeats; i++) {
      if (remainders[i]) {
        capacities[remainders[i].id]++;
      }
    }

    return capacities;
  };

  // Step 4 finalization
  const handleFinishVoting = async () => {
    if (!hasVotedSimulated) {
      alert('먼저 친구들 투표 시뮬레이션을 실행해주세요!');
      return;
    }

    const totalStudents = classmateCount + 1;
    let currentPool = [...rolePool];

    if (currentPool.length < totalStudents) {
      const confirmGenerate = window.confirm(
        `현재 생성된 역할 개수(${currentPool.length}개)가 우리 반 인원수(${totalStudents}명)보다 적습니다.\nAI 추천으로 부족한 역할을 자동 생성하여 인원수를 맞출까요?`
      );
      if (confirmGenerate) {
        const updatedPool = await handleGenerateExtraRolesAI(totalStudents);
        if (updatedPool) {
          currentPool = updatedPool;
        }
      }
    }

    const distributedCaps = distributeCapacitiesByVotes(currentPool, totalStudents, roleVotes);
    
    setCustomCapacity(distributedCaps);
    setIsAutoCapacity(false);
    
    setRolePool(prevPool => {
      const poolToUse = currentPool.length > prevPool.length ? currentPool : prevPool;
      return poolToUse.map(r => ({
        ...r,
        votes: roleVotes[r.id] || 0,
        capacity: distributedCaps[r.id] !== undefined ? distributedCaps[r.id] : 1
      }));
    });

    nextStep();
  };

  // Step 5: Handle Fit Test Rating Question
  const handleFitTestAnswer = (roleId: string, question: 'q1' | 'q2' | 'q3', score: number) => {
    setFitTestAnswers(prev => {
      const current = prev[roleId] || { q1: 3, q2: 3, q3: 3 };
      return {
        ...prev,
        [roleId]: {
          ...current,
          [question]: score
        }
      };
    });
  };

  // Step 6: AI Draft Helper for Application Reasons
  const handleAIDraftReason = async (rank: 'first' | 'second' | 'third') => {
    const roleId = applications[rank];
    if (!roleId) {
      alert('먼저 역할을 선택한 후에 AI 추천을 받아보세요!');
      return;
    }
    
    setIsDraftingReason(prev => ({ ...prev, [rank]: true }));
    const role = rolePool.find(r => r.id === roleId);
    if (!role) return;

    const stars = calculateStars(roleId);

    try {
      const userMessage = `이름: ${studentName}, 학년: ${studentGrade}학년, 선택한 역할: "${role.name}" (하는일: ${role.job}).
내 적합도 자가 진단 평가: ${stars}점/5점 (만족도 스마일 스티커를 받음).
이 역할을 지원하는 동기를 초등학교 3~4학년 어린이가 선생님에게 쓴 것처럼 아주 다정하고 성실한 문체로 2문장 내외로 작성해줘.`;
      
      const systemPrompt = `당신은 초등학교 학생의 역할 지원서 한 줄 작성을 도와주는 AI 조수 '아리'입니다.
학생이 입력한 정보를 바탕으로, 어린이다운 천진함과 열심히 하겠다는 약속이 담긴 귀여운 문장을 한 문단(약 60~100자)으로 추천해주세요.
~하고 싶습니다, ~하겠습니다 처럼 예의 바르고 씩씩한 어조를 써주세요.
오직 추천하는 한글 본문 1개만 다른 설명(예: "추천 문장입니다", 마크다운 따옴표 등) 없이 출력해야 합니다.`;

      const responseText = await sendMessageToAPI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ] as any);

      setApplicationReasons(prev => ({
        ...prev,
        [rank]: responseText.replace(/["']/g, '').trim()
      }));
    } catch (error) {
      console.error('AI Draft Reason Error:', error);
      alert('AI가 한 발 늦었나봐요! 대신 직접 다짐을 한마디 적어보는 건 어떨까? 할 수 있다는 마음을 적으면 충분해!');
    } finally {
      setIsDraftingReason(prev => ({ ...prev, [rank]: false }));
    }
  };

  // Calculate competition rates helper
  const getStats = () => {
    const counts: Record<string, { first: number; second: number; third: number; total: number }> = {};
    rolePool.forEach(role => {
      counts[role.id] = { first: 0, second: 0, third: 0, total: 0 };
    });

    if (applications.first) {
      counts[applications.first].first++;
      counts[applications.first].total++;
    }
    if (applications.second) {
      counts[applications.second].second++;
      counts[applications.second].total++;
    }
    if (applications.third) {
      counts[applications.third].third++;
      counts[applications.third].total++;
    }

    classmates.forEach(mate => {
      const { first, second, third } = mate.applications;
      if (counts[first]) {
        counts[first].first++;
        counts[first].total++;
      }
      if (counts[second]) {
        counts[second].second++;
        counts[second].total++;
      }
      if (counts[third]) {
        counts[third].third++;
        counts[third].total++;
      }
    });

    return counts;
  };

  // Step 8: Modifications logic
  const handleModifySubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!applications.first) {
      alert('1지망은 꼭 적어줘야 해!');
      return;
    }
    if (!applicationReasons.first.trim()) {
      alert('1지망을 선택한 이유를 채워줘!');
      return;
    }

    const stats = getStats();
    
    const allStudentsList: Student[] = [
      {
        id: 'user-student',
        name: studentName + ' (나)',
        isUser: true,
        applications: { ...applications },
        suitability: {}
      },
      ...classmates.map(c => ({
        id: c.id,
        name: c.name,
        isUser: false,
        applications: c.applications,
        suitability: c.suitability
      }))
    ];
    const roleCapacities = calculateDynamicCapacities(allStudentsList, rolePool, isAutoCapacity ? undefined : customCapacity);

    const updatedClassmates = classmates.map((mate) => {
      const firstRoleCount = stats[mate.applications.first]?.first || 0;
      const capacity = roleCapacities[mate.applications.first] !== undefined ? roleCapacities[mate.applications.first] : 1;
      if (firstRoleCount > capacity + 1 && Math.random() < 0.3) {
        const lessCompetitiveRoles = rolePool
          .filter(r => r.id !== mate.applications.first)
          .sort((a, b) => (stats[a.id]?.first || 0) - (stats[b.id]?.first || 0));

        if (lessCompetitiveRoles.length > 0) {
          const newFirst = lessCompetitiveRoles[0].id;
          return {
            ...mate,
            applications: {
              ...mate.applications,
              first: newFirst
            }
          };
        }
      }
      return mate;
    });

    setClassmates(updatedClassmates);
    setHasModified(true);
    nextStep();
  };

  // Step 9: Allocation Trigger
  const handleExecuteAllocation = () => {
    setIsAssigning(true);
    
    const allStudentsList: Student[] = [
      {
        id: 'user-student',
        name: studentName + ' (나)',
        isUser: true,
        applications: { ...applications },
        suitability: { ...fitTestAnswers ? Object.keys(fitTestAnswers).reduce((acc, k) => {
          acc[k] = calculatePercent(k);
          return acc;
        }, {} as Record<string, number>) : {} }
      },
      ...classmates.map(c => ({
        id: c.id,
        name: c.name,
        isUser: false,
        applications: c.applications,
        suitability: c.suitability
      }))
    ];

    setTimeout(() => {
      const matchResult = runMatchAlgorithm(allStudentsList, rolePool, isAutoCapacity ? undefined : customCapacity);
      setAssignments(matchResult.assignments);
      setMatchDetails(matchResult.details);
      setAssignmentsCapacities(matchResult.roleCapacities);
      setIsAssigning(false);
      nextStep();
    }, 3000);
  };

  // Reset the process
  const handleReset = () => {
    setStep(0);
    setStudentName('');
    setSelectedProblems([]);
    setCustomProblem('');
    setCustomProblemsList([]);
    setRolePool([]);
    setRoleVotes({});
    setUserVotes([]);
    setHasVotedSimulated(false);
    setFitTestAnswers({});
    setApplications({ first: '', second: '', third: '' });
    setApplicationReasons({ first: '', second: '', third: '' });
    setHasModified(false);
    setClassmates([]);
    setAssignments({});
    setMatchDetails({});
    setAssignmentsCapacities({});
    setPledge('');
  };

  // Print/Download Appointment Certificate
  const handlePrint = () => {
    window.print();
  };

  // --- TEACHER ACTIONS ---

  // Handle student count change from teacher dashboard
  const handleClassmateCountChange = (newCount: number) => {
    setClassmateCount(newCount);
    if (classmates.length > 0 && rolePool.length > 0) {
      const generated = generateClassmates(newCount, rolePool);
      setClassmates(generated);
      setAssignments({});
      setMatchDetails({});
      setAssignmentsCapacities({});
    }
  };

  // Force regenerate classmate applications
  const handleForceRegenerateClassmates = () => {
    if (rolePool.length === 0) {
      alert('가상 학생을 배치할 수 있는 역할 풀이 비어있습니다. 먼저 역할을 추천받거나 추가해주세요!');
      return;
    }
    const generated = generateClassmates(classmateCount, rolePool);
    setClassmates(generated);
    setAssignments({});
    setMatchDetails({});
    setAssignmentsCapacities({});
    alert(`성공적으로 ${classmateCount}명의 가상 학생 지망 데이터를 새로 만들었습니다!`);
  };

  // Force move step from teacher control panel
  const handleForceMoveStep = (newStep: number) => {
    if (newStep >= 7 && classmates.length === 0) {
      if (rolePool.length === 0) {
        alert('이동하려는 단계에 가상 학생 데이터가 필요하나 역할 풀이 정의되지 않았습니다. 역할을 먼저 생성해주세요.');
        return;
      }
      const generated = generateClassmates(classmateCount, rolePool);
      setClassmates(generated);
    }
    setStep(newStep);
  };

  // Update capacity for a single role
  const handleUpdateRoleCapacity = (roleId: string, capacity: number) => {
    setCustomCapacity(prev => ({
      ...prev,
      [roleId]: capacity
    }));
  };

  // Manual override for single student assignment
  const handleManualAssignStudent = (studentId: string, roleId: string) => {
    setAssignments(prev => {
      const updated = { ...prev };
      if (roleId) {
        updated[studentId] = roleId;
      } else {
        delete updated[studentId];
      }
      return updated;
    });
    setMatchDetails((prev: Record<string, any>) => ({
      ...prev,
      [studentId]: {
        roleId,
        choiceRank: 'assigned_other',
        score: 100
      }
    }));
  };

  // Teacher Swap Roles implementation
  const handleTeacherSwapRoles = () => {
    if (!teacherSwapA || !teacherSwapB) {
      alert('역할을 맞교환할 두 학생을 모두 선택해주세요!');
      return;
    }
    if (teacherSwapA === teacherSwapB) {
      alert('동일한 학생을 선택할 수 없습니다!');
      return;
    }

    const roleA = assignments[teacherSwapA];
    const roleB = assignments[teacherSwapB];

    if (!roleA && !roleB) {
      alert('두 학생 모두 배정된 역할이 없습니다!');
      return;
    }

    setAssignments(prev => {
      const updated = { ...prev };
      if (roleB) {
        updated[teacherSwapA] = roleB;
      } else {
        delete updated[teacherSwapA];
      }
      if (roleA) {
        updated[teacherSwapB] = roleA;
      } else {
        delete updated[teacherSwapB];
      }
      return updated;
    });

    setMatchDetails((prev: Record<string, any>) => {
      const updated = { ...prev };
      const detailsA = prev[teacherSwapA];
      const detailsB = prev[teacherSwapB];

      updated[teacherSwapA] = {
        ...detailsA,
        roleId: roleB,
        choiceRank: 'assigned_other',
        score: 100
      };
      updated[teacherSwapB] = {
        ...detailsB,
        roleId: roleA,
        choiceRank: 'assigned_other',
        score: 100
      };
      return updated;
    });

    const nameA = getAllStudentsList().find(s => s.id === teacherSwapA)?.name || '학생A';
    const nameB = getAllStudentsList().find(s => s.id === teacherSwapB)?.name || '학생B';
    const nameRoleA = roleA ? rolePool.find(r => r.id === roleA)?.name || '학급 도우미' : '미배정';
    const nameRoleB = roleB ? rolePool.find(r => r.id === roleB)?.name || '학급 도우미' : '미배정';

    alert(`성공적으로 두 학생의 역할을 맞바꿨습니다!\n- ${nameA}: ${nameRoleB}\n- ${nameB}: ${nameRoleA}`);

    setTeacherSwapA('');
    setTeacherSwapB('');
  };

  // Retrieve full list of students (User + Classmates)
  const getAllStudentsList = (): DashboardStudent[] => {
    return [
      {
        id: 'user-student',
        name: studentName || '나',
        isUser: true,
        gender: studentGender,
        applications: { ...applications },
        suitability: { ...fitTestAnswers ? Object.keys(fitTestAnswers).reduce((acc, k) => {
          acc[k] = calculatePercent(k);
          return acc;
        }, {} as Record<string, number>) : {} }
      },
      ...classmates.map(c => ({
        id: c.id,
        name: c.name,
        isUser: false,
        gender: c.gender,
        applications: c.applications,
        suitability: c.suitability
      }))
    ];
  };

  const allStudents = getAllStudentsList();
  const filteredStudents = allStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // gender check
    let matchesGender = true;
    if (genderFilter !== 'all') {
      if (student.isUser) {
        matchesGender = studentGender === genderFilter;
      } else {
        const mate = classmates.find(c => c.id === student.id);
        matchesGender = mate ? mate.gender === genderFilter : true;
      }
    }

    // assigned check
    let matchesAssigned = true;
    if (assignedFilter !== 'all') {
      const isAssigned = !!assignments[student.id];
      if (assignedFilter === 'assigned') {
        matchesAssigned = isAssigned;
      } else {
        matchesAssigned = !isAssigned;
      }
    }

    return matchesSearch && matchesGender && matchesAssigned;
  });

  // Group roles by problem ID
  const groupedRoles: Record<string, Role[]> = {};
  rolePool.forEach(role => {
    const probId = role.problemId || 'trash';
    if (!groupedRoles[probId]) {
      groupedRoles[probId] = [];
    }
    groupedRoles[probId].push(role);
  });

  const getProblemInfo = (probId: string) => {
    const predefined = PROBLEM_LIST.find(p => p.id === probId);
    if (predefined) return predefined;
    const custom = customProblemsList.find(p => p.id === probId);
    if (custom) return custom;
    return { emoji: '✨', title: '직접 정의한 고민' };
  };

  return (
    <div className="role-flow-layout">
      {/* 👑 TEACHER / STUDENT MODE SWITCH */}
      <div className="mode-toggle-container no-print">
        <button 
          className={`mode-toggle-btn student-mode ${viewMode === 'student' ? 'active' : ''}`}
          onClick={() => setViewMode('student')}
        >
          👦👧 학생 체험 모드
        </button>
        <button 
          className={`mode-toggle-btn teacher-mode ${viewMode === 'teacher' ? 'active' : ''}`}
          onClick={() => setViewMode('teacher')}
        >
          👩‍🏫 교사 관리 탭
        </button>
      </div>

      {/* 🚀 PROGRESS STEPPER (Rounded, colorful & icon-based) */}
      <div className="role-stepper-container">
        <div className="role-stepper-track">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = idx < step;
            const isActive = idx === step;
            return (
              <div 
                key={idx} 
                className={`step-node ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                title={s.label}
              >
                <div className="step-node-bubble">
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
                </div>
                <span className="step-node-label">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {viewMode === 'teacher' ? (
        <div className="teacher-dashboard animate-slide-in">
          <div className="teacher-header">
            <h2>👩‍🏫 학급 1인 1역할 배정 - 교사 관리 탭</h2>
            <p>학생 수 조절, 진행 단계 강제 이동, 정원 관리 및 실시간 배정 현황을 모니터링할 수 있습니다.</p>
          </div>

          {/* 대시보드 메트릭 카드 */}
          <div className="teacher-card-grid">
            <div className="teacher-card metric-card">
              <div className="card-emoji">🏫</div>
              <div className="card-metrics">
                <span className="metric-label">총 학생 수</span>
                <strong className="metric-val">{classmateCount + 1}명</strong>
                <span className="metric-sub">(나 1명 + 가상 친구 {classmateCount}명)</span>
              </div>
            </div>
            <div className="teacher-card metric-card">
              <div className="card-emoji">📋</div>
              <div className="card-metrics">
                <span className="metric-label">현재 생성된 역할</span>
                <strong className="metric-val">{rolePool.length}개</strong>
                <span className="metric-sub">{rolePool.length > 0 ? rolePool.map(r => r.name).join(', ') : '역할 미생성'}</span>
              </div>
            </div>
            <div className="teacher-card metric-card">
              <div className="card-emoji">🚀</div>
              <div className="card-metrics">
                <span className="metric-label">현재 학급 진행 단계</span>
                <strong className="metric-val">{step + 1}단계 / 11단계</strong>
                <span className="metric-sub">{STEPS[step]?.label}</span>
              </div>
            </div>
          </div>

          {/* 주요 제어판 */}
          <div className="teacher-controls-section">
            {/* 1. 학생 수 및 기본 설정 */}
            <div className="teacher-card control-card">
              <h3>👥 학급 인원 및 가상 데이터 관리</h3>
              <p className="card-desc text-muted">학급 전체 인원을 조절합니다. 가상 친구의 지망 데이터를 즉시 생성/재생성할 수 있습니다.</p>
              <div className="student-count-slider-box">
                <label>가상 학생 수: <strong>{classmateCount}명</strong></label>
                <div className="slider-wrapper">
                  <input 
                    type="range" 
                    min={5} 
                    max={40} 
                    value={classmateCount} 
                    onChange={(e) => handleClassmateCountChange(Number(e.target.value))} 
                    className="cute-slider"
                  />
                  <input
                    type="number"
                    min={5}
                    max={40}
                    value={classmateCount}
                    onChange={(e) => handleClassmateCountChange(Math.max(5, Math.min(40, Number(e.target.value))))}
                    className="cute-number-input"
                  />
                </div>
              </div>
              <button className="btn-regenerate-data" onClick={handleForceRegenerateClassmates} disabled={rolePool.length === 0}>
                🔄 가상 학생 지망 데이터 새로 만들기
              </button>
              {rolePool.length === 0 && (
                <p className="text-warning-sm" style={{ color: '#d97706', marginTop: '8px', fontSize: '0.8rem' }}>
                  ⚠️ 역할 목록이 아직 정의되지 않았습니다. 3단계(역할 제안) 이후에 가상 학생 데이터를 생성할 수 있습니다.
                </p>
              )}
            </div>

            {/* 2. 단계 강제 이동 */}
            <div className="teacher-card control-card">
              <h3>🚀 진행 단계 원격 제어 (확정 단계 이동)</h3>
              <p className="card-desc text-muted">학급 전체의 진행 상황을 강제로 변경합니다. 특정 단계를 건너뛰거나 이전 단계로 되돌아갈 수 있습니다.</p>
              <div className="step-control-grid">
                {STEPS.map((s, idx) => {
                  const Icon = s.icon;
                  const isActive = step === idx;
                  return (
                    <button
                      key={idx}
                      className={`btn-step-direct ${isActive ? 'active' : ''}`}
                      onClick={() => handleForceMoveStep(idx)}
                    >
                      <div className="btn-step-num">{idx + 1}</div>
                      <Icon size={14} />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. 역할 수동 맞교환 */}
            <div className="teacher-card control-card" style={{ gridColumn: 'span 2' }}>
              <h3>🔄 역할 수동 맞교환 (지정 맞교환)</h3>
              <p className="card-desc text-muted">서로 다른 역할을 배정받은 두 학생을 골라 역할을 바꿉니다. 배정 단계가 완료된 이후에 사용 가능합니다.</p>
              
              <div className="swap-panel-inputs">
                <div className="form-group-sm" style={{ flex: 1 }}>
                  <label>학생 A</label>
                  <select
                    className="cute-select"
                    value={teacherSwapA}
                    onChange={(e) => setTeacherSwapA(e.target.value)}
                  >
                    <option value="">-- 학생 선택 --</option>
                    {allStudents.map(s => {
                      const assignedRoleId = assignments[s.id];
                      const assignedRole = rolePool.find(r => r.id === assignedRoleId);
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} ({assignedRole ? assignedRole.name : '미배정'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group-sm" style={{ flex: 1 }}>
                  <label>학생 B</label>
                  <select
                    className="cute-select"
                    value={teacherSwapB}
                    onChange={(e) => setTeacherSwapB(e.target.value)}
                  >
                    <option value="">-- 학생 선택 --</option>
                    {allStudents.map(s => {
                      const assignedRoleId = assignments[s.id];
                      const assignedRole = rolePool.find(r => r.id === assignedRoleId);
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} ({assignedRole ? assignedRole.name : '미배정'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <button
                  type="button"
                  className="btn-execute-swap btn-execute-swap"
                  onClick={handleTeacherSwapRoles}
                  disabled={!teacherSwapA || !teacherSwapB || teacherSwapA === teacherSwapB}
                  style={{
                    padding: '10px 20px',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    cursor: (!teacherSwapA || !teacherSwapB || teacherSwapA === teacherSwapB) ? 'not-allowed' : 'pointer',
                    height: '42px'
                  }}
                >
                  맞교환 실행
                </button>
              </div>
            </div>
          </div>

          {/* 정원 및 배정 관리 */}
          <div className="teacher-controls-section" style={{ marginTop: '24px' }}>
            <div className="teacher-card control-card" style={{ gridColumn: 'span 2' }}>
              <h3>⚖️ 역할별 정원(배정 인원) 및 방식 설정</h3>
              <p className="card-desc text-muted">역할별로 배정될 수 있는 최대 인원을 관리합니다. 자동 비례 정원 계산 또는 수동 정원 배치를 선택할 수 있습니다.</p>
              
              <div className="capacity-mode-toggle">
                <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="capacityMode"
                    checked={isAutoCapacity} 
                    onChange={() => setIsAutoCapacity(true)}
                  />
                  <span>자동 정원 비례 계산 (학생들의 지망 인기에 맞춰 인원을 자동으로 배정합니다)</span>
                </label>
                <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '12px' }}>
                  <input 
                    type="radio" 
                    name="capacityMode"
                    checked={!isAutoCapacity} 
                    onChange={() => setIsAutoCapacity(false)}
                  />
                  <span>수동 정원 직접 지정 (역할별 인원을 교사가 직접 고정합니다)</span>
                </label>
              </div>

              {!isAutoCapacity && (
                <div className="custom-capacity-settings-grid animate-slide-in">
                  {rolePool.map(role => {
                    const currentCap = customCapacity[role.id] ?? 1;
                    return (
                      <div key={role.id} className="capacity-input-item">
                        <span className="role-cap-name">⚙️ {role.name}</span>
                        <div className="capacity-counter">
                          <button 
                            type="button" 
                            className="btn-cap-adjust"
                            onClick={() => handleUpdateRoleCapacity(role.id, Math.max(0, currentCap - 1))}
                          >
                            -
                          </button>
                          <input 
                            type="number" 
                            className="cap-number-input"
                            value={currentCap} 
                            min={0}
                            onChange={(e) => handleUpdateRoleCapacity(role.id, Math.max(0, Number(e.target.value)))}
                          />
                          <button 
                            type="button" 
                            className="btn-cap-adjust"
                            onClick={() => handleUpdateRoleCapacity(role.id, currentCap + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!isAutoCapacity && (
                <div className="capacity-sum-info" style={{ marginTop: '16px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  총 배정 정원 합계: <span style={{ color: '#4f46e5' }}>{Object.values(customCapacity).reduce((a, b) => a + b, 0)}명</span> / 총 학생 수: <span style={{ color: '#00b894' }}>{classmateCount + 1}명</span>
                  {Object.values(customCapacity).reduce((a, b) => a + b, 0) < classmateCount + 1 && (
                    <span style={{ color: '#d97706', marginLeft: '12px', fontSize: '0.8rem', fontWeight: 'normal' }}>
                      ⚠️ 정원 총합이 총 학생 수보다 적어 남는 학생은 차선책 역할에 임의 배정됩니다.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 실시간 모니터링 테이블 */}
          <div className="teacher-monitoring-section" style={{ marginTop: '24px' }}>
            <div className="teacher-card monitor-card">
              <div className="monitor-header">
                <h3>📋 실시간 학생 지원 현황 및 배정 현황</h3>
                <div className="monitor-actions">
                  <div className="search-input-wrapper">
                    <Search size={14} className="search-icon" />
                    <input 
                      type="text" 
                      placeholder="이름 검색..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="monitor-search-input"
                    />
                  </div>
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value as any)}
                    className="monitor-select-filter"
                  >
                    <option value="all">모든 성별</option>
                    <option value="boy">남학생</option>
                    <option value="girl">여학생</option>
                  </select>
                  <select
                    value={assignedFilter}
                    onChange={(e) => setAssignedFilter(e.target.value as any)}
                    className="monitor-select-filter"
                  >
                    <option value="all">모든 배정상태</option>
                    <option value="assigned">배정 완료</option>
                    <option value="unassigned">배정 대기중</option>
                  </select>
                </div>
              </div>

              <div className="table-responsive">
                <table className="teacher-table">
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>성별</th>
                      <th>1지망 역할 (적합도)</th>
                      <th>2지망 역할 (적합도)</th>
                      <th>3지망 역할 (적합도)</th>
                      <th>최종 배정 결과</th>
                      <th>배정 변경</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map(student => {
                        const assignedRoleId = assignments[student.id];
                        const assignedRole = rolePool.find(r => r.id === assignedRoleId);
                        const firstRole = rolePool.find(r => r.id === student.applications.first);
                        const secondRole = rolePool.find(r => r.id === student.applications.second);
                        const thirdRole = rolePool.find(r => r.id === student.applications.third);

                        return (
                          <tr key={student.id} className={student.isUser ? 'user-row' : ''}>
                            <td>
                              <strong>{student.name}</strong>
                              {student.isUser && <span className="user-badge-sm">나</span>}
                            </td>
                            <td>{student.gender === 'boy' ? '👦 남' : '👧 여'}</td>
                            <td>
                              {firstRole ? `${firstRole.name} (${student.suitability[firstRole.id] ?? 0}%)` : '-'}
                            </td>
                            <td>
                              {secondRole ? `${secondRole.name} (${student.suitability[secondRole.id] ?? 0}%)` : '-'}
                            </td>
                            <td>
                              {thirdRole ? `${thirdRole.name} (${student.suitability[thirdRole.id] ?? 0}%)` : '-'}
                            </td>
                            <td>
                              {assignedRole ? (
                                <span className="assigned-role-badge">
                                  {assignedRole.name}
                                </span>
                              ) : (
                                <span className="unassigned-badge">미배정</span>
                              )}
                            </td>
                            <td>
                              <select
                                className="table-assign-select"
                                value={assignedRoleId || ''}
                                onChange={(e) => handleManualAssignStudent(student.id, e.target.value)}
                              >
                                <option value="">-- 미배정 --</option>
                                {rolePool.map(r => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#a0aec0' }}>
                          일치하는 학생 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="main-content-split">
          {/* 🐣 MASCOT 'ARI' INTERACTIVE PANEL */}
          <div className="mascot-panel">
            <div className="mascot-card">
              <div className="mascot-avatar-wrapper">
                <div className="mascot-avatar">
                  🐣
                </div>
                <div className="mascot-name-badge">
                  AI 도우미 아리
                </div>
              </div>
              <div className="mascot-bubble">
                <p>{mascotSpeech}</p>
              </div>
            </div>
          </div>

          {/* 💻 STAGE VIEWS */}
          <div className="stage-card-wrapper">
            
            {/* STEP 0: WELCOME & NAME ENTRY */}
            {step === 0 && (
              <div className="stage-content animate-slide-in">
                <h2 className="stage-title">👋 안녕! 너의 정보를 알려줘</h2>
                <p className="stage-desc">친구들과 학급 역할을 고르기 전에 이름과 성별, 학년, 그리고 너의 개성있는 성격을 알려줄래?</p>
                
                <div className="form-group">
                  <label className="input-label">내 이름</label>
                  <input
                    type="text"
                    className="cute-input"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value.substring(0, 10))}
                    placeholder="이름을 적어주세요 (최대 10자)"
                    maxLength={10}
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">내 학년</label>
                  <div className="grade-selector-grid">
                    {[3, 4, 5, 6].map(g => (
                      <button
                        key={g}
                        type="button"
                        className={`btn-grade ${studentGrade === g ? 'active' : ''}`}
                        onClick={() => setStudentGrade(g)}
                      >
                        {g}학년
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="input-label">내 성별</label>
                  <div className="gender-selector-grid">
                    <button
                      type="button"
                      className={`btn-gender boy ${studentGender === 'boy' ? 'active' : ''}`}
                      onClick={() => setStudentGender('boy')}
                    >
                      👦 남학생
                    </button>
                    <button
                      type="button"
                      className={`btn-gender girl ${studentGender === 'girl' ? 'active' : ''}`}
                      onClick={() => setStudentGender('girl')}
                    >
                      👧 여학생
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="input-label">내 성격 태그 (최소 2개 이상 선택)</label>
                  <div className="traits-selector-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '8px',
                    marginTop: '8px'
                  }}>
                    {TRAITS_LIST.map(t => {
                      const isSelected = studentTraits.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={`btn-trait ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            setStudentTraits(prev => 
                              prev.includes(t.id) 
                                ? prev.filter(x => x !== t.id) 
                                : [...prev, t.id]
                            );
                          }}
                          style={{
                            padding: '10px',
                            border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                            borderRadius: '12px',
                            background: isSelected ? '#eeebff' : '#ffffff',
                            color: isSelected ? '#4f46e5' : '#4a5568',
                            fontWeight: isSelected ? 'bold' : 'normal',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            textAlign: 'center',
                            transition: 'all 0.2s'
                          }}
                        >
                          <span style={{ fontSize: '1rem' }}>{t.label}</span>
                          <span style={{ fontSize: '0.75rem', color: '#718096' }}>{t.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="stage-footer-actions">
                  <button 
                    className="btn-next" 
                    onClick={nextStep} 
                    disabled={!studentName.trim() || studentTraits.length < 2}
                  >
                    시작하기 <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 1: CLASSROOM STATUS ASSESSMENT (Problems Survey) */}
            {step === 1 && (
              <div className="stage-content animate-slide-in">
                <h2 className="stage-title">🔍 우리 교실의 일상 고민 찾아보기</h2>
                <p className="stage-desc">지금 우리 반 교실에서 해결이 필요한 불편하거나 지저분한 고민을 2~3개 골라줘!</p>
                
                <div className="problems-grid">
                  {[...PROBLEM_LIST, ...customProblemsList].map(p => {
                    const isSelected = selectedProblems.includes(p.id);
                    return (
                      <div 
                        key={p.id}
                        className={`problem-select-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleProblem(p.id)}
                      >
                        <div className="problem-emoji">{p.emoji}</div>
                        <div className="problem-texts">
                          <h3>{p.title}</h3>
                          <p>{p.desc}</p>
                        </div>
                        <div className="problem-checkbox">
                          {isSelected && <Check size={16} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="form-group" style={{ marginTop: '24px' }}>
                  <label className="input-label">✍️ 선택지에 없는 우리 반만의 특별한 고민이 있나요?</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="cute-input"
                      value={customProblem}
                      onChange={(e) => setCustomProblem(e.target.value)}
                      placeholder="예: 보드게임 상자가 엉망으로 섞여 있어요 (직접 적어보세요)"
                      maxLength={40}
                    />
                    <button 
                      type="button" 
                      className="btn-add-custom-problem" 
                      onClick={handleAddCustomProblem}
                      style={{
                        padding: '0 16px',
                        background: '#4f46e5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      추가
                    </button>
                  </div>
                </div>

                <div className="stage-footer-actions">
                  <button className="btn-back" onClick={prevStep}>
                    <ChevronLeft size={18} /> 뒤로
                  </button>
                  <button 
                    className="btn-next" 
                    onClick={nextStep}
                    disabled={selectedProblems.length === 0 && !customProblem.trim()}
                  >
                    고민 공유 및 의견 나누기 <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CLASSROOM PROBLEM DISCUSSION (고민 공유) */}
            {step === 2 && (
              <div className="stage-content animate-slide-in">
                <h2 className="stage-title">💬 우리 반의 고민 공유하기 & 해결 방안 찾기</h2>
                <p className="stage-desc">친구들이 올린 교실 불편 사항들을 읽어보고, 해결할 수 있는 좋은 의견을 나누어 볼까?</p>

                <div className="brainstorm-layout">
                  {/* Left: Problems List */}
                  <div className="brainstorm-problems-list">
                    <h3>🔍 친구들이 고른 고민 목록</h3>
                    <div className="problems-scroll">
                      {selectedProblems.map(id => {
                        const prob = PROBLEM_LIST.find(p => p.id === id) || customProblemsList.find(p => p.id === id);
                        if (!prob) return null;
                        const isSelected = selectedProblemForComment === id;
                        return (
                          <div 
                            key={id} 
                            className="brainstorm-problem-item"
                            onClick={() => setSelectedProblemForComment(id)}
                            style={{ 
                              cursor: 'pointer', 
                              background: isSelected ? '#eeebff' : 'white',
                              border: isSelected ? '2.5px solid var(--primary-color)' : '1px solid #e2e8f0',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div className="problem-item-emoji">{prob.emoji}</div>
                            <div className="problem-item-details">
                              <h4>{prob.title}</h4>
                              <p>{prob.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Discussion Chat Container */}
                  <div className="brainstorm-chat-container">
                    {(() => {
                      const activeProb = PROBLEM_LIST.find(p => p.id === selectedProblemForComment) || customProblemsList.find(p => p.id === selectedProblemForComment);
                      return (
                        <>
                          <h3>💬 [ {activeProb?.title || '고민 해결실'} ] 토론방</h3>
                          
                          <div className="chat-messages-box">
                            {brainstormComments
                              .filter(c => c.problemId === selectedProblemForComment)
                              .map((c, cIdx) => {
                                const isUser = c.name.includes('(나)');
                                return (
                                  <div key={cIdx} className={`chat-message-bubble ${isUser ? 'user-comment' : ''}`}>
                                    <div className="comment-avatar">{c.avatar}</div>
                                    <div className="comment-text-wrapper">
                                      <span className="comment-user-name">{c.name}</span>
                                      <span className="comment-content">{c.comment}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            {brainstormComments.filter(c => c.problemId === selectedProblemForComment).length === 0 && (
                              <p style={{ color: '#a0aec0', fontSize: '0.85rem', textAlign: 'center', margin: 'auto' }}>
                                이 고민에 대한 해결책 아이디어를 첫 번째로 남겨보세요! 💡
                              </p>
                            )}
                          </div>

                          <form 
                            className="chat-input-form" 
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleAddBrainstormComment();
                            }}
                          >
                            <input
                              type="text"
                              className="cute-chat-input"
                              value={userBrainstormComment}
                              onChange={(e) => setUserBrainstormComment(e.target.value)}
                              placeholder="이 고민을 해결하기 위한 좋은 의견이나 역할을 제안해주세요..."
                            />
                            <button 
                              type="submit" 
                              className="btn-chat-send"
                              disabled={!userBrainstormComment.trim()}
                            >
                              의견 올리기
                            </button>
                          </form>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="stage-footer-actions" style={{ marginTop: '24px' }}>
                  <button className="btn-back" onClick={prevStep}>
                    <ChevronLeft size={18} /> 뒤로
                  </button>
                  <button className="btn-next" onClick={nextStep}>
                    역할 제안하기 <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: RECOMMENDED ROLES & CUSTOM ADDITION */}
            {step === 3 && (
              <div className="stage-content animate-slide-in">
                <h2 className="stage-title">💡 우리 반에 추천하는 해결사 역할</h2>
                <p className="stage-desc">골라준 문제들을 바탕으로 만들어진 역할이에요. 마음에 안 드는 것은 빼고, 새 역할을 추가해보세요.</p>

                <div className="ai-assist-box">
                  <div className="ai-assist-badge">아리의 마법</div>
                  <p>AI 조수가 특별히 더 창의적이고 재미있는 해결사 역할을 추천해주거나, 너무 중복되고 비슷한 역할을 하나로 깔끔하게 정리해 줄 수 있어요!</p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                    <button 
                      type="button"
                      className="btn-ai-action"
                      onClick={handleAskAIRoles}
                      disabled={isGeneratingRoles}
                    >
                      {isGeneratingRoles ? (
                        <>
                          <RefreshCw className="spinning-icon" size={16} /> 아리가 고민하는 중...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} /> AI 특별 역할 추천받기
                        </>
                      )}
                    </button>
                    <button 
                      type="button" 
                      className="btn-ai-action btn-ai-merge-roles"
                      onClick={handleMergeRolesAI}
                      disabled={isMergingRoles || rolePool.length < 2}
                      style={{
                        background: '#ffffff',
                        color: '#4f46e5',
                        border: '2px solid #cbd5e0'
                      }}
                    >
                      {isMergingRoles ? (
                        <>
                          <RefreshCw className="spinning-icon" size={16} /> 역할 통합 중...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} /> 너무 비슷한 역할 하나로 통합 (AI 정리)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <h3 className="sub-section-title">📦 현재 역할 목록 (최소 4개 필요)</h3>
                
                {isGeneratingRoles ? (
                  <div className="loading-placeholder">
                    <div className="bouncing-chick">🐣</div>
                    <p>역할을 예쁘게 다듬는 중이에요. 조금만 기다려주세요...</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {Object.entries(groupedRoles).map(([probId, roles]) => {
                      const prob = getProblemInfo(probId);
                      return (
                        <div key={probId} className="role-group-section" style={{
                          background: '#f8fafc',
                          padding: '16px',
                          borderRadius: '16px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4f46e5', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{prob.emoji}</span> <span>{prob.title}</span>
                          </h4>
                          <div className="roles-pool-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                            {roles.map(role => (
                              <div key={role.id} className="role-pool-card" style={{ background: 'white' }}>
                                <div className="role-pool-header">
                                  <h4>
                                    ⭐ {role.name}{' '}
                                    {role.isCustom && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#e2e8f0', borderRadius: '4px', color: '#4a5568', fontWeight: 'normal' }}>제안함</span>}
                                  </h4>
                                  <button className="btn-delete-role" onClick={() => removeRole(role.id)}>
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                                <div className="role-pool-body">
                                  <p className="role-job"><strong>할 일:</strong> {role.job}</p>
                                  <p className="role-reason"><strong>이유:</strong> {role.reason}</p>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.75rem', color: '#718096', borderTop: '1px dashed #edf2f7', paddingTop: '8px' }}>
                                    <span>제안자: <strong>{role.recommendedBy || 'AI 아리'}</strong></span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Custom Role Section */}
                <div className="custom-role-builder" style={{ marginTop: '24px' }}>
                  {!showAddCustomRole ? (
                    <button 
                      type="button" 
                      className="btn-add-custom-toggle"
                      onClick={() => setShowAddCustomRole(true)}
                    >
                      <Plus size={16} /> 우리 힘으로 직접 역할 새로 만들기
                    </button>
                  ) : (
                    <form onSubmit={handleAddCustomRoleSubmit} className="custom-role-form animate-slide-in">
                      <h4>🔨 우리가 만드는 새로운 역할</h4>
                      <div className="form-group-sm">
                        <label>역할 이름</label>
                        <input 
                          type="text" 
                          value={newRoleName} 
                          onChange={e => setNewRoleName(e.target.value)} 
                          placeholder="예: 칠판 화가, 청소 히어로"
                          maxLength={15}
                        />
                      </div>
                      <div className="form-group-sm">
                        <label>하는 구체적인 일</label>
                        <textarea 
                          value={newRoleJob} 
                          onChange={e => setNewRoleJob(e.target.value)} 
                          placeholder="이 역할이 매일 해야 하는 일을 구체적으로 적어주세요."
                          maxLength={100}
                          rows={2}
                        />
                      </div>
                      <div className="form-group-sm">
                        <label>필요한 이유 (생략 가능)</label>
                        <input 
                          type="text" 
                          value={newRoleReason} 
                          onChange={e => setNewRoleReason(e.target.value)} 
                          placeholder="이 역할이 왜 교실에 필요할까요?"
                          maxLength={100}
                        />
                      </div>
                      <div className="form-actions-sm">
                        <button type="submit" className="btn-submit-custom">추가하기</button>
                        <button 
                          type="button" 
                          className="btn-cancel-custom"
                          onClick={() => setShowAddCustomRole(false)}
                        >
                          취소
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="stage-footer-actions">
                  <button className="btn-back" onClick={prevStep} disabled={isGeneratingRoles}>
                    <ChevronLeft size={18} /> 뒤로
                  </button>
                  <button 
                    className="btn-next" 
                    onClick={nextStep}
                    disabled={isGeneratingRoles || rolePool.length < 4}
                  >
                    역할 투표하러 가기 <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: ROLE VOTING & HEART RECOMMENDATIONS */}
            {step === 4 && (
              <div className="stage-content animate-slide-in">
                <h2 className="stage-title">🗳️ 좋은 아이디어에 하트 남기기 (역할 투표)</h2>
                <p className="stage-desc">우리 교실의 고민을 해결하기 위한 좋은 역할 아이디어에 하트를 꾹 눌러줘! 💖</p>

                <div className="vote-stage-layout">
                  {/* Left: Role List for Voting */}
                  <div className="vote-roles-list">
                    {rolePool.map(role => {
                      const prob = PROBLEM_LIST.find(p => p.id === role.problemId) || customProblemsList.find(p => p.id === role.problemId) || { emoji: '✨', title: '기타 고민' };
                      const isVoted = userVotes.includes(role.id);
                      const voteCount = roleVotes[role.id] || 0;
                      return (
                        <div key={role.id} className={`vote-role-card ${isVoted ? 'voted' : ''}`}>
                          <div className="vote-card-header">
                            <span className="vote-card-category">{prob.emoji} {prob.title.substring(0, 10)}...</span>
                            <span className="vote-card-recommended">제안: {role.recommendedBy || 'AI'}</span>
                          </div>
                          <h3>{role.name}</h3>
                          <p className="vote-card-job"><strong>할 일:</strong> {role.job}</p>
                          <p className="vote-card-reason"><strong>필요성:</strong> {role.reason}</p>
                          
                          <div className="vote-card-footer">
                            <button
                              type="button"
                              className={`btn-vote-toggle ${isVoted ? 'active' : ''}`}
                              onClick={() => handleToggleUserVote(role.id)}
                            >
                              <Heart size={14} fill={isVoted ? 'white' : 'none'} />
                              <span>{isVoted ? '추천 취소' : '좋은 생각이에요!'}</span>
                            </button>
                            <span className="vote-count-badge">❤️ {voteCount}표</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right: Vote Status and Simulation Panel */}
                  <div className="vote-status-box">
                    <h3>🗳️ 투표 진행판</h3>
                    <p className="status-desc">학급 총원: <strong>{classmateCount + 1}명</strong></p>
                    <p className="status-desc">현재 역할 후보 수: <strong>{rolePool.length}개</strong></p>

                    {rolePool.length < classmateCount + 1 && (
                      <div style={{ padding: '10px', background: '#fff9db', border: '1px solid #ffe066', borderRadius: '8px', fontSize: '0.8rem', color: '#f59f00' }}>
                        ⚠️ 역할 후보 개수가 총원({classmateCount + 1}명)보다 적습니다. 배정 시 인원 비례로 정원이 자동 조정되지만, 역할을 더 늘리고 싶다면 아래 AI 버튼을 눌러보세요.
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn-simulate-votes"
                      onClick={handleSimulateClassmateVotes}
                      disabled={isSimulatingVotes}
                    >
                      {isSimulatingVotes ? '🗳️ 가상 투표 진행 중...' : '🔄 가상 친구들 투표 시뮬레이션'}
                    </button>

                    {rolePool.length < classmateCount + 1 && (
                      <button
                        type="button"
                        className="btn-ai-extra-roles"
                        onClick={() => handleGenerateExtraRolesAI(classmateCount + 1)}
                        disabled={isGeneratingExtraRoles}
                        style={{
                          marginTop: '8px',
                          padding: '10px',
                          background: '#e8f0fe',
                          color: '#1a73e8',
                          border: '1.5px dashed #1a73e8',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        {isGeneratingExtraRoles ? '✨ 부족한 역할 생성 중...' : '✨ AI 추천으로 부족한 역할 채우기'}
                      </button>
                    )}

                    <div className="vote-rankings">
                      <h4>📊 역할 득표 실시간 순위</h4>
                      <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        {[...rolePool]
                          .sort((a, b) => (roleVotes[b.id] || 0) - (roleVotes[a.id] || 0))
                          .map((r, idx) => (
                            <div key={r.id} className="rank-item">
                              <span className="rank-num">{idx + 1}</span>
                              <span className="rank-name">{r.name}</span>
                              <span className="rank-votes">❤️ {roleVotes[r.id] || 0}표</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-finish-voting"
                      onClick={handleFinishVoting}
                      disabled={!hasVotedSimulated}
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        background: '#4f46e5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: hasVotedSimulated ? 'pointer' : 'not-allowed',
                        opacity: hasVotedSimulated ? 1 : 0.6
                      }}
                    >
                      투표 마감하고 다음 단계로
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: ROLE EXPLORATION & SUITABILITY TEST */}
            {step === 5 && (
              <div className="stage-content animate-slide-in">
                <h2 className="stage-title">⭐ 나와 어울리는 역할 찾기 (적합도 진단)</h2>
                <p className="stage-desc">각 역할을 누르고 스마일 스티커를 골라 척도를 평가해봐! 최소 3개 이상 완료해야 해.</p>

                <div className="fit-split-layout">
                  {/* Role List */}
                  <div className="fit-role-sidebar">
                    {rolePool.map(role => {
                      const stars = calculateStars(role.id);
                      const isTested = !!fitTestAnswers[role.id];
                      return (
                        <div
                          key={role.id}
                          className={`fit-role-tab-item ${activeRoleForFit === role.id ? 'active' : ''} ${isTested ? 'tested' : ''}`}
                          onClick={() => setActiveRoleForFit(role.id)}
                        >
                          <div className="tab-item-title-row">
                            <span>{role.name}</span>
                            {isTested && <CheckCircle2 size={16} className="checked-icon" />}
                          </div>
                          {isTested ? (
                            <div className="stars-row">
                              {'⭐'.repeat(stars)}
                              <span className="percent-text">({calculatePercent(role.id)}%)</span>
                            </div>
                          ) : (
                            <span className="pending-text">스티커 필요 🐣</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Fit Test Form */}
                  <div className="fit-test-panel">
                    {activeRoleForFit ? (
                      (() => {
                        const role = rolePool.find(r => r.id === activeRoleForFit)!;
                        const answers = fitTestAnswers[activeRoleForFit] || { q1: 0, q2: 0, q3: 0 };
                        
                        return (
                          <div className="fit-test-content animate-slide-in">
                            <div className="selected-role-info">
                              <h3>👑 {role.name}</h3>
                              <p><strong>할 일:</strong> {role.job}</p>
                              <p className="reason-quote">" {role.reason} "</p>
                            </div>

                            <div className="fit-questions-list">
                              <h4 className="sticker-question-title">👇 질문에 어울리는 스마일 스티커를 클릭해줘!</h4>
                              
                              {/* Q1 */}
                              <div className="question-item">
                                <p className="q-text">1. 나는 이 역할을 매일매일 성실하게 잘 실천할 수 있나요?</p>
                                <div className="smiles-row">
                                  <button 
                                    className={`btn-smile ${answers.q1 === 5 ? 'active-good' : ''}`}
                                    onClick={() => handleFitTestAnswer(role.id, 'q1', 5)}
                                  >
                                    <Smile size={32} />
                                    <span>아주 잘해요!</span>
                                  </button>
                                  <button 
                                    className={`btn-smile ${answers.q1 === 3 ? 'active-medium' : ''}`}
                                    onClick={() => handleFitTestAnswer(role.id, 'q1', 3)}
                                  >
                                    <Meh size={32} />
                                    <span>할 수 있어요</span>
                                  </button>
                                  <button 
                                    className={`btn-smile ${answers.q1 === 1 ? 'active-bad' : ''}`}
                                    onClick={() => handleFitTestAnswer(role.id, 'q1', 1)}
                                  >
                                    <Frown size={32} />
                                    <span>조금 힘들어요</span>
                                  </button>
                                </div>
                              </div>

                              {/* Q2 */}
                              <div className="question-item">
                                <p className="q-text">2. 이 역할을 할 때 내 마음이 즐겁고 보람찰까요?</p>
                                <div className="smiles-row">
                                  <button 
                                    className={`btn-smile ${answers.q2 === 5 ? 'active-good' : ''}`}
                                    onClick={() => handleFitTestAnswer(role.id, 'q2', 5)}
                                  >
                                    <Smile size={32} />
                                    <span>신나요!</span>
                                  </button>
                                  <button 
                                    className={`btn-smile ${answers.q2 === 3 ? 'active-medium' : ''}`}
                                    onClick={() => handleFitTestAnswer(role.id, 'q2', 3)}
                                  >
                                    <Meh size={32} />
                                    <span>괜찮아요</span>
                                  </button>
                                  <button 
                                    className={`btn-smile ${answers.q2 === 1 ? 'active-bad' : ''}`}
                                    onClick={() => handleFitTestAnswer(role.id, 'q2', 1)}
                                  >
                                    <Frown size={32} />
                                    <span>안 하고 싶어요</span>
                                  </button>
                                </div>
                              </div>

                              {/* Q3 */}
                              <div className="question-item">
                                <p className="q-text">3. 내가 이 일을 하면 친구들이 기뻐하고 교실이 깨끗해질까요?</p>
                                <div className="smiles-row">
                                  <button 
                                    className={`btn-smile ${answers.q3 === 5 ? 'active-good' : ''}`}
                                    onClick={() => handleFitTestAnswer(role.id, 'q3', 5)}
                                  >
                                    <Smile size={32} />
                                    <span>정말 그래요!</span>
                                  </button>
                                  <button 
                                    className={`btn-smile ${answers.q3 === 3 ? 'active-medium' : ''}`}
                                    onClick={() => handleFitTestAnswer(role.id, 'q3', 3)}
                                  >
                                    <Meh size={32} />
                                    <span>그럴 것 같아요</span>
                                  </button>
                                  <button 
                                    className={`btn-smile ${answers.q3 === 1 ? 'active-bad' : ''}`}
                                    onClick={() => handleFitTestAnswer(role.id, 'q3', 1)}
                                  >
                                    <Frown size={32} />
                                    <span>잘 모르겠어요</span>
                                  </button>
                                </div>
                              </div>

                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="fit-no-selection">
                        <p>👈 왼쪽에서 역할을 선택해서 적합도 평가 스티커를 붙여주세요!</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="stage-footer-actions">
                  <button className="btn-back" onClick={prevStep}>
                    <ChevronLeft size={18} /> 뒤로
                  </button>
                  <button 
                    className="btn-next" 
                    onClick={nextStep}
                    disabled={Object.keys(fitTestAnswers).length < Math.min(3, rolePool.length)}
                  >
                    희망 역할 지원하기 <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: PREFERENCE APPLICATION (지망 및 이유) */}
            {step === 6 && (
              <div className="stage-content animate-slide-in">
                <h2 className="stage-title">✍️ 가고 싶은 역할 지원서 작성하기</h2>
                <p className="stage-desc">가장 하고 싶은 1지망, 2지망, 3지망 역할을 고르고, 그 역할을 하고 싶은 이유를 멋지게 채워줘!</p>

                <div className="applications-form-area">
                  
                  {/* 1지망 */}
                  <div className="choice-block first-choice">
                    <div className="choice-header-badge first">1지망 (가장 하고 싶은 역할)</div>
                    
                    <div className="form-group-sm">
                      <label>역할 선택</label>
                      <select
                        className="cute-select"
                        value={applications.first}
                        onChange={(e) => setApplications(prev => ({ ...prev, first: e.target.value }))}
                      >
                        <option value="">-- 역할을 선택하세요 --</option>
                        {rolePool
                          .filter(r => r.id !== applications.second && r.id !== applications.third)
                          .map(r => (
                            <option key={r.id} value={r.id}>{r.name} (적합도: {calculatePercent(r.id)}% / {calculateStars(r.id)}★)</option>
                          ))}
                      </select>
                    </div>

                    {applications.first && (
                      <div className="form-group-sm animate-slide-in">
                        <div className="reason-label-row">
                          <label>선택하고 싶은 이유</label>
                          <button
                            type="button"
                            className="btn-ai-helper"
                            onClick={() => handleAIDraftReason('first')}
                            disabled={isDraftingReason.first}
                          >
                            {isDraftingReason.first ? <RefreshCw className="spinning-icon" size={14} /> : <Sparkles size={14} />} 
                            <span>AI 다듬기 도우미</span>
                          </button>
                        </div>
                        <textarea
                          className="cute-textarea"
                          value={applicationReasons.first}
                          onChange={(e) => setApplicationReasons(prev => ({ ...prev, first: e.target.value }))}
                          placeholder="이 역할을 잘할 수 있는 이유나 다짐을 간단히 적어보세요..."
                          rows={2}
                        />
                      </div>
                    )}
                  </div>

                  {/* 2지망 */}
                  <div className="choice-block second-choice">
                    <div className="choice-header-badge second">2지망 (두 번째로 하고 싶은 역할)</div>
                    
                    <div className="form-group-sm">
                      <label>역할 선택</label>
                      <select
                        className="cute-select"
                        value={applications.second}
                        onChange={(e) => setApplications(prev => ({ ...prev, second: e.target.value }))}
                      >
                        <option value="">-- 역할을 선택하세요 (생략 가능) --</option>
                        {rolePool
                          .filter(r => r.id !== applications.first && r.id !== applications.third)
                          .map(r => (
                            <option key={r.id} value={r.id}>{r.name} (적합도: {calculatePercent(r.id)}% / {calculateStars(r.id)}★)</option>
                          ))}
                      </select>
                    </div>

                    {applications.second && (
                      <div className="form-group-sm animate-slide-in">
                        <div className="reason-label-row">
                          <label>선택하고 싶은 이유</label>
                          <button
                            type="button"
                            className="btn-ai-helper"
                            onClick={() => handleAIDraftReason('second')}
                            disabled={isDraftingReason.second}
                          >
                            {isDraftingReason.second ? <RefreshCw className="spinning-icon" size={14} /> : <Sparkles size={14} />} 
                            <span>AI 다듬기 도우미</span>
                          </button>
                        </div>
                        <textarea
                          className="cute-textarea"
                          value={applicationReasons.second}
                          onChange={(e) => setApplicationReasons(prev => ({ ...prev, second: e.target.value }))}
                          placeholder="두 번째로 잘할 수 있는 이유를 적어보세요..."
                          rows={2}
                        />
                      </div>
                    )}
                  </div>

                  {/* 3지망 */}
                  <div className="choice-block third-choice">
                    <div className="choice-header-badge third">3지망 (세 번째로 하고 싶은 역할)</div>
                    
                    <div className="form-group-sm">
                      <label>역할 선택</label>
                      <select
                        className="cute-select"
                        value={applications.third}
                        onChange={(e) => setApplications(prev => ({ ...prev, third: e.target.value }))}
                      >
                        <option value="">-- 역할을 선택하세요 (생략 가능) --</option>
                        {rolePool
                          .filter(r => r.id !== applications.first && r.id !== applications.second)
                          .map(r => (
                            <option key={r.id} value={r.id}>{r.name} (적합도: {calculatePercent(r.id)}% / {calculateStars(r.id)}★)</option>
                          ))}
                      </select>
                    </div>

                    {applications.third && (
                      <div className="form-group-sm animate-slide-in">
                        <div className="reason-label-row">
                          <label>선택하고 싶은 이유</label>
                          <button
                            type="button"
                            className="btn-ai-helper"
                            onClick={() => handleAIDraftReason('third')}
                            disabled={isDraftingReason.third}
                          >
                            {isDraftingReason.third ? <RefreshCw className="spinning-icon" size={14} /> : <Sparkles size={14} />} 
                            <span>AI 다듬기 도우미</span>
                          </button>
                        </div>
                        <textarea
                          className="cute-textarea"
                          value={applicationReasons.third}
                          onChange={(e) => setApplicationReasons(prev => ({ ...prev, third: e.target.value }))}
                          placeholder="이 역할을 지망하는 각오를 간단히 적어보세요..."
                          rows={2}
                        />
                      </div>
                    )}
                  </div>

                </div>

                <div className="stage-footer-actions">
                  <button className="btn-back" onClick={prevStep}>
                    <ChevronLeft size={18} /> 뒤로
                  </button>
                  <button 
                    className="btn-next" 
                    onClick={nextStep}
                    disabled={!applications.first || !applicationReasons.first.trim()}
                  >
                    우리 반 경쟁률 확인하기 <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 7: VIEW STATISTICS & COMPETITION (경쟁률 확인) */}
            {step === 7 && (
              <div className="stage-content animate-slide-in">
                <h2 className="stage-title">📊 우리 반 친구들의 실시간 지원 통계</h2>
                <p className="stage-desc">가상 친구 {classmateCount}명을 포함해 총 {classmateCount + 1}명의 1지망 지원 현황입니다. 각 역할을 클릭해서 경쟁자 명단과 지원 이유를 살펴보세요.</p>

                {(() => {
                  const stats = getStats();
                  const allStudentsList: Student[] = [
                    {
                      id: 'user-student',
                      name: studentName + ' (나)',
                      isUser: true,
                      applications: { ...applications },
                      suitability: {}
                    },
                    ...classmates.map(c => ({
                      id: c.id,
                      name: c.name,
                      isUser: false,
                      applications: c.applications,
                      suitability: c.suitability
                    }))
                  ];
                  const roleCapacities = calculateDynamicCapacities(allStudentsList, rolePool, isAutoCapacity ? undefined : customCapacity);

                  return (
                    <div className="stats-layout">
                      {/* Stat Bars */}
                      <div className="stats-charts-list">
                        {rolePool.map(role => {
                          const roleStat = stats[role.id] || { first: 0, second: 0, third: 0, total: 0 };
                          const firstChoiceCount = roleStat.first;
                          const capacity = roleCapacities[role.id] !== undefined ? roleCapacities[role.id] : 1;
                          const isOverCapacity = firstChoiceCount > capacity;
                          const compRate = capacity > 0 ? (firstChoiceCount / capacity).toFixed(1) : (firstChoiceCount > 0 ? '∞' : '0.0');

                          // Colors based on competition rate
                          let statusColorClass = 'status-green';
                          let statusText = '여유로움 🍀';
                          if (firstChoiceCount === capacity) {
                            statusColorClass = 'status-yellow';
                            statusText = '적당함 👍';
                          } else if (isOverCapacity) {
                            statusColorClass = 'status-red';
                            statusText = '인기 폭발 ⚠️';
                          }

                          return (
                            <div key={role.id} className="stat-row-card">
                              <div className="stat-row-info">
                                <div className="stat-role-title">
                                  <strong>{role.name}</strong> 
                                  <span className={`status-badge ${statusColorClass}`}>{statusText}</span>
                                </div>
                                <span className="stat-count-text">
                                  1지망: <strong>{firstChoiceCount}명</strong> / 정원: {capacity}명 (경쟁률 {compRate}:1)
                                </span>
                              </div>

                              {/* Custom CSS Bar Chart */}
                              <div className="progress-bar-track">
                                <div 
                                  className={`progress-bar-fill ${statusColorClass}`}
                                  style={{ width: `${Math.min(100, (firstChoiceCount / Math.max(8, firstChoiceCount)) * 100)}%` }}
                                />
                                {/* Capacity indicator line */}
                                <div 
                                  className="capacity-marker"
                                  style={{ left: `${(capacity / Math.max(8, firstChoiceCount)) * 100}%` }}
                                  title="정원 기준선"
                                />
                              </div>
                              
                              {/* Peeking Area Toggle */}
                              <div className="stat-peek-area">
                                <details className="peek-details">
                                  <summary className="peek-summary">👀 이 역할에 지원한 친구들의 사연 보기</summary>
                                  <div className="peek-content-list animate-slide-in">
                                    {/* Check if user applied as 1st */}
                                    {applications.first === role.id && (
                                      <div className="peek-item user-peek-item">
                                        <span className="peek-name">✨ {studentName} (나)</span>
                                        <p className="peek-reason">"{applicationReasons.first}"</p>
                                      </div>
                                    )}

                                    {/* Classmates */}
                                    {classmates
                                      .filter(c => c.applications.first === role.id)
                                      .map(c => (
                                        <div key={c.id} className="peek-item">
                                          <span className="peek-name">{c.name} ({c.gender === 'boy' ? '👦' : '👧'})</span>
                                          <p className="peek-reason">"{c.reasons.first}"</p>
                                        </div>
                                      ))}
                                    {classmates.filter(c => c.applications.first === role.id).length === 0 && applications.first !== role.id && (
                                      <p className="no-peek-text">이 역할에 1지망으로 지원한 친구가 아직 없습니다.</p>
                                    )}
                                  </div>
                                </details>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div className="stage-footer-actions">
                  <button className="btn-back" onClick={prevStep}>
                    <ChevronLeft size={18} /> 뒤로
                  </button>
                  <button className="btn-next animate-pulse-btn" onClick={nextStep}>
                    수정할 기회 얻기 (딱 1회!) <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 8: ONE-TIME MODIFICATION STEP (지망 수정 기회) */}
            {step === 8 && (
              <div className="stage-content animate-slide-in">
                <h2 className="stage-title">🔄 지망 수정하기 (마지막 결정!)</h2>
                <p className="stage-desc">친구들의 지원 상황과 경쟁률을 보고 내 지망을 변경하고 싶다면 지금 수정할 수 있어요. (단 1회만 제공됩니다)</p>

                <div className="modification-box">
                  <div className="info-alert">
                    <Volume2 size={20} />
                    <span>경쟁률이 너무 높은 역할(빨간색) 보단 여유가 있는 역할(초록색)로 지망을 바꾸면 배정될 확률이 훨씬 높아져요!</span>
                  </div>

                  <form onSubmit={handleModifySubmit} className="mod-form">
                    <div className="choice-block mod-choice">
                      <div className="choice-header-badge first">내 1지망 수정</div>
                      <select
                        className="cute-select"
                        value={applications.first}
                        onChange={(e) => setApplications(prev => ({ ...prev, first: e.target.value }))}
                      >
                        {rolePool.map(r => (
                          <option key={r.id} value={r.id}>{r.name} (적합도: {calculatePercent(r.id)}% / {calculateStars(r.id)}★)</option>
                        ))}
                      </select>

                      <label className="mod-label">지원하는 이유 수정</label>
                      <textarea
                        className="cute-textarea"
                        value={applicationReasons.first}
                        onChange={(e) => setApplicationReasons(prev => ({ ...prev, first: e.target.value }))}
                        rows={2}
                      />
                    </div>

                    <div className="choice-block mod-choice">
                      <div className="choice-header-badge second">내 2지망 수정</div>
                      <select
                        className="cute-select"
                        value={applications.second}
                        onChange={(e) => setApplications(prev => ({ ...prev, second: e.target.value }))}
                      >
                        <option value="">-- 선택 안함 --</option>
                        {rolePool.map(r => (
                          <option key={r.id} value={r.id}>{r.name} (적합도: {calculatePercent(r.id)}% / {calculateStars(r.id)}★)</option>
                        ))}
                      </select>
                    </div>

                    <div className="choice-block mod-choice">
                      <div className="choice-header-badge third">내 3지망 수정</div>
                      <select
                        className="cute-select"
                        value={applications.third}
                        onChange={(e) => setApplications(prev => ({ ...prev, third: e.target.value }))}
                      >
                        <option value="">-- 선택 안함 --</option>
                        {rolePool.map(r => (
                          <option key={r.id} value={r.id}>{r.name} (적합도: {calculatePercent(r.id)}% / {calculateStars(r.id)}★)</option>
                        ))}
                      </select>
                    </div>

                    <div className="mod-action-buttons">
                      <button 
                        type="button" 
                        className="btn-keep-original"
                        onClick={nextStep}
                      >
                        🙅 바꾸지 않고 이대로 결정할래요!
                      </button>
                      <button 
                        type="submit" 
                        className="btn-apply-modification"
                      >
                        🙆 네, 지망을 수정해서 낼래요!
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* STEP 9: ALLOCATION RUNNING ANIMATION */}
            {step === 9 && (
              <div className="stage-content animate-slide-in text-center-stage">
                <h2 className="stage-title">🎲 공정하게 역할 배정 실행하기</h2>
                <p className="stage-desc">우리의 선택지(지망 순위)와 각자 작성했던 역할 적합도 진단 점수를 합쳐서, 아리가 가장 공정한 분배를 시작합니다!</p>

                {isAssigning ? (
                  <div className="assigning-animation-box animate-pulse">
                    <div className="assigning-wheel">
                      ⚙️
                    </div>
                    <div className="scrolling-names-container">
                      <p className="scrolling-name-item">민준이 배치 중...</p>
                      <p className="scrolling-name-item">지우 적합도 검증 중...</p>
                      <p className="scrolling-name-item">서현 선호도 확인 중...</p>
                      <p className="scrolling-name-item">{studentName} 매칭 확인 중...</p>
                    </div>
                    <p className="assigning-text-status">🐣 아리가 공평하고 정밀하게 매칭 주사위를 굴리고 있어요! 🐣</p>
                  </div>
                ) : (
                  <div className="ready-to-assign-box">
                    <div className="chick-mascot-huge">
                      🐣🎩
                    </div>
                    <button className="btn-execute-match" onClick={handleExecuteAllocation}>
                      🎲 역할 배정 시뮬레이션 시작!
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 10: FINAL RESULT & CERTIFICATE / PLEDGE */}
            {step === 10 && (
              <div className="stage-content animate-slide-in print-wrapper">
                <h2 className="stage-title no-print">🏆 최종 배정 결과 및 위촉식</h2>
                <p className="stage-desc no-print">축하합니다! 모두가 한 학기 동안 소중하게 이끌어갈 학급 1인 1역할 배치도와 임명장입니다.</p>

                {(() => {
                  const assignedRoleId = assignments['user-student'];
                  const role = rolePool.find(r => r.id === assignedRoleId);
                  const detail = matchDetails['user-student'];
                  
                  let choiceRankKorean = '1지망';
                  if (detail?.choiceRank === 'second') choiceRankKorean = '2지망';
                  if (detail?.choiceRank === 'third') choiceRankKorean = '3지망';
                  if (detail?.choiceRank === 'assigned_other') choiceRankKorean = '자율 배치';

                  return (
                    <div className="final-result-container">
                      
                      {/* 📜 CERTIFICATE CARD */}
                      <div className="certificate-card" ref={printAreaRef}>
                        <div className="cert-border-outer">
                          <div className="cert-border-inner">
                            <div className="cert-seal">🎖️</div>
                            <h1 className="cert-main-title">임 명 장</h1>
                            
                            <div className="cert-info">
                              <p className="cert-class">
                                제 {studentGrade}학년 1반
                              </p>
                              <p className="cert-name">
                                이 름 : <strong>{studentName}</strong>
                              </p>
                              <p className="cert-role">
                                임명역할 : <strong>{role ? role.name : '학급 도우미'}</strong> ({choiceRankKorean} 배정)
                              </p>
                            </div>

                            <div className="cert-body-text">
                              위 사람은 성실한 태도와 교실을 사랑하는 마음으로 학급 문제 해결에 앞장섰기에, 한 학기 동안 학급을 기분 좋게 가꿀 <strong>{role ? role.name : '학급 도우미'}</strong>(으)로 기쁘게 임명합니다.
                            </div>

                            <div className="cert-date">
                              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>

                            <div className="cert-issuer">
                              {studentGrade}학년 1반 AI 조수 아리 & 담임교사 백
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ACTION BUTTON FOR CERTIFICATE */}
                      <div className="cert-actions no-print" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button className="btn-print-cert" onClick={handlePrint}>
                          <Printer size={18} /> 내 임명장 인쇄하기
                        </button>
                        {hasModified && (
                          <span className="badge-modified-info" style={{ 
                            fontSize: '0.8rem', 
                            background: '#e0e7ff', 
                            color: '#4f46e5', 
                            padding: '6px 12px', 
                            borderRadius: '12px', 
                            fontWeight: 'bold' 
                          }}>
                            🔄 지망 수정 완료
                          </span>
                        )}
                      </div>

                      {/* ✍️ PLEDGE SECTION */}
                      <div className="pledge-section">
                        <h3>🪴 나의 다짐 약속 적기</h3>
                        <p className="no-print">이 역할을 멋지게 수행하기 위해 지킬 다짐을 한마디 적어줘!</p>
                        
                        <div className="pledge-form-group">
                          <input
                            type="text"
                            className="cute-pledge-input"
                            value={pledge}
                            onChange={(e) => setPledge(e.target.value)}
                            placeholder="예: 매일 수업 끝나고 칠판을 뽀드득 소리가 나게 깨끗이 닦겠습니다!"
                          />
                          {pledge && (
                            <div className="pledge-signature animate-slide-in">
                              <Heart size={16} className="heart-icon" /> <strong>{studentName}</strong> 약속함
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 💡 NOTICE CARD FOR ROLE SWAP */}
                      <div className="alert-box-info no-print" style={{ margin: '20px 0', background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}>
                        <AlertCircle size={18} />
                        <span>💡 <strong>역할을 바꾸고 싶나요?</strong> 친구와 동의한 후 선생님께 말씀드려보세요! 선생님께서 교사 관리 탭에서 역할을 맞바꿔 주실 수 있습니다.</span>
                      </div>

                      {/* 🏫 CLASSROOM ROLE PLACEMENT BOARD */}
                      <div className="class-placement-board">
                        <h3 className="placement-board-title">🏫 우리 반 1인 1역할 최종 배치표</h3>
                        <div className="placement-grid">
                          {rolePool.map(r => {
                            const assignedToThisRole: string[] = [];
                            
                            // Check user
                            if (assignments['user-student'] === r.id) {
                              assignedToThisRole.push(studentName + ' ⭐');
                            }

                            // Check classmates
                            classmates.forEach(c => {
                              if (assignments[c.id] === r.id) {
                                assignedToThisRole.push(c.name);
                              }
                            });

                            return (
                              <div key={r.id} className="placement-card">
                                <h4>
                                  {r.name}{' '}
                                  <span className="placement-capacity-tag" style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 'normal',
                                    color: '#6b7280',
                                    marginLeft: '4px'
                                  }}>
                                    ({assignedToThisRole.length}/{assignmentsCapacities[r.id] !== undefined ? assignmentsCapacities[r.id] : 1}명)
                                  </span>
                                </h4>
                                <p className="placement-job-desc">{r.job}</p>
                                <div className="placement-names-list">
                                  {assignedToThisRole.map((name, nIdx) => (
                                    <span 
                                      key={nIdx} 
                                      className={`placement-name-tag ${name.includes('⭐') ? 'user-tag animate-pulse-btn' : ''}`}
                                    >
                                      {name}
                                    </span>
                                  ))}
                                  {assignedToThisRole.length === 0 && (
                                    <span className="empty-tag">빈자리 🍃</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* START OVER */}
                      <div className="reset-area no-print">
                        <button className="btn-reset" onClick={handleReset}>
                          <RotateCcw size={16} /> 처음부터 다시 역할 선정하기
                        </button>
                      </div>

                    </div>
                  );
                })()}

              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
