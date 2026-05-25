import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, CheckCircle2, Compass, FileText, 
  RefreshCw, Award, ChevronRight, ChevronLeft, User, 
  Smile, Meh, Frown, Plus, Trash2, AlertCircle, Check, 
  RotateCcw, Printer, Heart, Search, MessageSquare,
  Lock, Eye, EyeOff
} from 'lucide-react';
import { sendMessageToAPI } from '../api/chat';
import { generateClassmates } from '../utils/simulatedData';
import type { Classmate } from '../utils/simulatedData';
import { runMatchAlgorithm, calculateDynamicCapacities } from '../utils/matchAlgorithm';
import type { Student } from '../utils/matchAlgorithm';

interface DashboardStudent extends Student {
  gender: 'boy' | 'girl';
  pledge?: string;
}

// Define steps info
const STEPS = [
  { label: '시작', icon: User },
  { label: '실태 파악', icon: AlertCircle },
  { label: '고민 공유', icon: MessageSquare },
  { label: '역할 제안', icon: Compass },
  { label: '역할 투표', icon: Heart },
  { label: '나와 맞춤', icon: Smile },
  { label: '역할 지원 및 경쟁률', icon: FileText },
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


const APPLICATION_KEYWORDS = [
  '책임감 🎯', '성실함 📅', '친절함 🤝', '도전정신 🏃', '꼭 해보고 싶어요 ❤️', '도움이 되고 싶어요 🙋', '깨끗하게 만들게요 🧹', '정리왕이 될게요 📦', '약속을 잘 지켜요 🤙'
];

const RIDDLE_QUESTIONS = [
  { q: 'ㅂㄹㅅㄱ', hint: '쓰레기를 종류별로 나누어 담아 버리는 활동이에요 🗑️', a: '분리수거' },
  { q: 'ㅊㅅ', hint: '교실을 쓸고 닦아서 깨끗하게 만드는 일이에요 🧹', a: '청소' },
  { q: 'ㄷㅅ', hint: '학급문고나 도서실에서 책을 읽는 일이에요 📚', a: '독서' },
  { q: 'ㅎㄱ', hint: '우리가 매일 와서 공부하고 친구들을 만나는 곳이에요 🏫', a: '학교' },
  { q: 'ㅅㅅㄴ', hint: '우리 반을 사랑으로 가르쳐 주시는 분이에요 🧑‍🏫', a: '선생님' },
  { q: '🪴', hint: '식물이 살고 있는 작은 그릇, 물을 잘 줘야 해요', a: '화분' },
  { q: '🥛', hint: '매일 아침 뼈를 튼튼하게 하려고 마시는 하얀 음료', a: '우유' },
  { q: '🖍️', hint: '칠판에 글씨를 쓰거나 그림을 그릴 때 사용하는 도구', a: '분필' }
];

const COMPLIMENT_TEMPLATES = [
  "언제나 남을 잘 도와줘서 고마워! 🤝",
  "오늘도 활기찬 모습이 참 보기 좋아! ☀️",
  "우리 같은 역할 맡아서 멋지게 활동하자! 🧑‍🤝‍🧑",
  "너의 꼼꼼한 성격은 정말 최고야! 🔍",
  "항상 교실을 기분 좋게 만들어줘서 고마워! 🍀",
  "너의 빛나는 아이디어가 정말 훌륭해! 💡",
  "우리 반에 너 같은 친구가 있어서 다행이야! 🥰"
];

const COMPLIMENT_STICKERS = ['💖', '👍', '🌟', '👑', '🎉', '🍎', '🍀', '🧸', '🌈', '🔥'];

export const RoleFlow = () => {
  // --- STATE VARIABLES ---
  const [step, setStep] = useState(0);
  const [studentName, setStudentName] = useState('');
  const [studentGrade, setStudentGrade] = useState<number>(3);
  const [studentClass, setStudentClass] = useState<number>(1);
  const [studentGender, setStudentGender] = useState<'boy' | 'girl'>('boy');
  
  // School and PIN States
  const [schoolName, setSchoolName] = useState<string>('');
  const [studentPinInput, setStudentPinInput] = useState<string>('');
  const [teacherSchoolInput, setTeacherSchoolInput] = useState<string>('');
  const [teacherGradeInput, setTeacherGradeInput] = useState<number>(3);
  const [teacherClassInput, setTeacherClassInput] = useState<number>(1);

  // Deterministic 6-digit PIN hash generator
  const generatePinFromInfo = (school: string, grade: number, cls: number): string => {
    const combinedStr = `${school.trim()}-${grade}-${cls}`;
    let hash = 0;
    for (let i = 0; i < combinedStr.length; i++) {
      const char = combinedStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    const positiveHash = Math.abs(hash);
    const pinNumber = (positiveHash % 900000) + 100000; // Force exactly 6 digits (100000 to 999999)
    return pinNumber.toString();
  };
  
  // Group Sync States
  const [groupId, setGroupId] = useState<string>('');
  const [myStudentId] = useState<string>(() => `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
  const [groupRealStudents, setGroupRealStudents] = useState<Record<string, any>>({});
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
  const [brainstormComments, setBrainstormComments] = useState<Array<{ name: string; avatar: string; comment: string; problemId: string; studentId?: string; timestamp?: number }>>([]);
  
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
  const [tempClassmateCount, setTempClassmateCount] = useState<number>(24);
  const [isAutoCapacity, setIsAutoCapacity] = useState<boolean>(true);
  const [showStepTransitionAlert, setShowStepTransitionAlert] = useState(false);
  const hasDismissedAlertForStep = useRef(false);
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

  // Participation mode states
  const [participationMode, setParticipationMode] = useState<'simulated' | 'realtime'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('group') ? 'realtime' : 'simulated';
  });

  // Password modal UI helpers
  const [showPasswordError, setShowPasswordError] = useState(false);
  const [showPasswordPlain, setShowPasswordPlain] = useState(false);

  // Teacher Progress Monitor selected step
  const [teacherSelectedProgressStep, setTeacherSelectedProgressStep] = useState<number>(0);

  // Student Waiting Room states
  const [activeWaitingTab, setActiveWaitingTab] = useState<'game' | 'compliment' | 'inbox'>('game');
  const [activeMiniGame, setActiveMiniGame] = useState<'memory' | 'riddle'>('memory');

  // Memory game state
  interface MemoryCard {
    id: number;
    emoji: string;
    isFlipped: boolean;
    isMatched: boolean;
  }
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [selectedCardIndices, setSelectedCardIndices] = useState<number[]>([]);
  const [memoryFlips, setMemoryFlips] = useState(0);
  const [memoryMatches, setMemoryMatches] = useState(0);
  const [isGameCompleted, setIsGameCompleted] = useState(false);

  // Consonant riddle state
  const [currentRiddleIndex, setCurrentRiddleIndex] = useState(0);
  const [riddleInput, setRiddleInput] = useState('');
  const [riddleFeedback, setRiddleFeedback] = useState<{ isCorrect: boolean; text: string } | null>(null);
  const [quizScore, setQuizScore] = useState(0);

  // Compliment states
  const [complimentTargetId, setComplimentTargetId] = useState('');
  const [selectedSticker, setSelectedSticker] = useState('💖');
  const [selectedMessageTemplate, setSelectedMessageTemplate] = useState('언제나 남을 잘 도와줘서 고마워! 🤝');
  const [lastSeenComplimentIds, setLastSeenComplimentIds] = useState<string[]>([]);
  const [newComplimentToast, setNewComplimentToast] = useState<{ senderName: string; emoji: string; message: string } | null>(null);

  // Student custom role states in Step 3
  const [isSuggestingNames, setIsSuggestingNames] = useState(false);
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);
  const [studentCustomJob, setStudentCustomJob] = useState('');
  const [studentCustomProblem, setStudentCustomProblem] = useState('trash');
  const [studentCustomName, setStudentCustomName] = useState('');
  const [studentCustomReason, setStudentCustomReason] = useState('');
  const [showStudentAddCustom, setShowStudentAddCustom] = useState(false);

  // Reset submit status on step change
  useEffect(() => {
    setIsSubmittedForStep(false);
  }, [step]);

  // Handle selecting a trait (only one per category, toggle off if clicked again)
  const handleSelectTrait = (categoryKey: string, traitId: string) => {
    setStudentTraits(prev => {
      const categoryItems = TRAITS_CATEGORIES[categoryKey as keyof typeof TRAITS_CATEGORIES].items.map(item => item.id);
      const isAlreadySelected = prev.includes(traitId);
      const cleanPrev = prev.filter(id => !categoryItems.includes(id));
      if (isAlreadySelected) {
        return cleanPrev;
      } else {
        return [...cleanPrev, traitId];
      }
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
      const q1Val = answers.q1 || 3;
      const q2Val = answers.q2 || 3;
      const q3Val = answers.q3 || 3;
      const total = q1Val + q2Val + q3Val; // max 15, min 3
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
      const q1Val = answers.q1 || 3;
      const q2Val = answers.q2 || 3;
      const q3Val = answers.q3 || 3;
      const total = q1Val + q2Val + q3Val;
      const surveyScore = Math.round((total / 15) * 100);
      return Math.round(traitsScore * 0.4 + surveyScore * 0.6);
    }

    return traitsScore;
  };

  // --- MEMORY GAME LOGIC ---
  const initMemoryGame = () => {
    const emojis = ['🗑️', '💡', '🧹', '📚', '🪴', '🥛'];
    const doubled = [...emojis, ...emojis];
    const shuffled = doubled
      .map((emoji, index) => ({ id: index, emoji, isFlipped: false, isMatched: false }))
      .sort(() => Math.random() - 0.5);
    setMemoryCards(shuffled);
    setSelectedCardIndices([]);
    setMemoryFlips(0);
    setMemoryMatches(0);
    setIsGameCompleted(false);
  };

  useEffect(() => {
    if (isSubmittedForStep && activeWaitingTab === 'game') {
      initMemoryGame();
    }
  }, [isSubmittedForStep, activeWaitingTab]);

  const handleCardClick = (clickedIndex: number) => {
    if (isGameCompleted) return;
    if (selectedCardIndices.length >= 2) return;
    if (memoryCards[clickedIndex].isFlipped || memoryCards[clickedIndex].isMatched) return;

    setMemoryCards(prev => prev.map((card, idx) => idx === clickedIndex ? { ...card, isFlipped: true } : card));

    const newSelected = [...selectedCardIndices, clickedIndex];
    setSelectedCardIndices(newSelected);

    if (newSelected.length === 2) {
      setMemoryFlips(f => f + 1);
      const [firstIdx, secondIdx] = newSelected;
      if (memoryCards[firstIdx].emoji === memoryCards[secondIdx].emoji) {
        setTimeout(() => {
          setMemoryCards(prev => prev.map((card, idx) => 
            (idx === firstIdx || idx === secondIdx) 
              ? { ...card, isMatched: true, isFlipped: true } 
              : card
          ));
          setMemoryMatches(m => {
            const updated = m + 1;
            if (updated === 6) {
              setIsGameCompleted(true);
            }
            return updated;
          });
          setSelectedCardIndices([]);
        }, 500);
      } else {
        setTimeout(() => {
          setMemoryCards(prev => prev.map((card, idx) => 
            (idx === firstIdx || idx === secondIdx) 
              ? { ...card, isFlipped: false } 
              : card
          ));
          setSelectedCardIndices([]);
        }, 1000);
      }
    }
  };

  // --- RIDDLE QUIZ LOGIC ---
  const handleRiddleSubmit = () => {
    const currentRiddle = RIDDLE_QUESTIONS[currentRiddleIndex];
    if (riddleInput.trim() === currentRiddle.a) {
      setRiddleFeedback({ isCorrect: true, text: '정답입니다! 아리가 아주 기뻐해요 🌟 (+10점)' });
      setQuizScore(s => s + 10);
      setTimeout(() => {
        setRiddleInput('');
        setRiddleFeedback(null);
        setCurrentRiddleIndex(prev => (prev + 1) % RIDDLE_QUESTIONS.length);
      }, 1500);
    } else {
      setRiddleFeedback({ isCorrect: false, text: '아쉽네요, 다시 생각해보세요! 🤔' });
      setTimeout(() => {
        setRiddleFeedback(null);
      }, 1500);
    }
  };

  // --- COMPLIMENT DELIVERY LOGIC ---
  const handleSendCompliment = async () => {
    if (!complimentTargetId) {
      alert('칭찬을 보낼 친구를 선택해 주세요!');
      return;
    }
    try {
      const code = groupId || `${studentGrade}-${studentClass}`;
      await fetch(`/api/sync?group=${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_compliment',
          targetStudentId: complimentTargetId,
          compliment: {
            senderName: studentName,
            emoji: selectedSticker,
            message: selectedMessageTemplate
          }
        })
      });
      alert('친구에게 칭찬과 스티커를 보냈습니다! 💌');
      setComplimentTargetId('');
    } catch (e) {
      console.error("Error sending compliment:", e);
      alert('칭찬 전송에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  // Detect received compliments and show live toast
  useEffect(() => {
    const myInfo = groupRealStudents[myStudentId];
    if (myInfo && Array.isArray(myInfo.receivedCompliments)) {
      const compliments = myInfo.receivedCompliments;
      if (compliments.length > 0) {
        const latest = compliments[compliments.length - 1];
        if (!lastSeenComplimentIds.includes(latest.id)) {
          setNewComplimentToast({
            senderName: latest.senderName,
            emoji: latest.emoji,
            message: latest.message
          });
          setLastSeenComplimentIds(prev => [...prev, latest.id]);
          setTimeout(() => {
            setNewComplimentToast(null);
          }, 4000);
        }
      }
    }
  }, [groupRealStudents, myStudentId, lastSeenComplimentIds]);

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
                matchDetails,
                assignmentsCapacities,
                schoolName,
                studentGrade,
                studentClass
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
    matchDetails,
    assignmentsCapacities,
    schoolName,
    studentGrade,
    studentClass
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
            // 1. Sync student status (always)
            setGroupRealStudents(serverState.students || {});
            
            // 2. Sync shared state for BOTH teacher and student
            if (Array.isArray(serverState.rolePool)) {
              setRolePool(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(serverState.rolePool)) {
                  return serverState.rolePool;
                }
                return prev;
              });
            }
            if (serverState.roleVotes) {
              setRoleVotes(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(serverState.roleVotes)) {
                  return serverState.roleVotes;
                }
                return prev;
              });
            }
            if (Array.isArray(serverState.classmates)) {
              setClassmates(prev => {
                // If classmate list has no suitability/reasons on server, merge with local ones to preserve simulated credentials
                const serverClassmates = serverState.classmates.map((sc: any) => {
                  const localC = prev.find(lc => lc.id === sc.id);
                  return {
                    ...sc,
                    suitability: sc.suitability || localC?.suitability || {},
                    reasons: sc.reasons || localC?.reasons || { first: '', second: '', third: '' },
                    pledge: sc.pledge || localC?.pledge || ''
                  };
                });
                if (JSON.stringify(prev.map((c: any) => c.id)) !== JSON.stringify(serverClassmates.map((c: any) => c.id)) || 
                    JSON.stringify(prev.map((c: any) => c.applications)) !== JSON.stringify(serverClassmates.map((c: any) => c.applications))) {
                  return serverClassmates;
                }
                return prev;
              });
            }
            if (serverState.assignments) {
              setAssignments(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(serverState.assignments)) {
                  return serverState.assignments;
                }
                return prev;
              });
            }
            if (serverState.matchDetails) {
              setMatchDetails(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(serverState.matchDetails)) {
                  return serverState.matchDetails;
                }
                return prev;
              });
            }
            if (serverState.assignmentsCapacities) {
              setAssignmentsCapacities(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(serverState.assignmentsCapacities)) {
                  return serverState.assignmentsCapacities;
                }
                return prev;
              });
            }
            if (serverState.brainstormComments) {
              setBrainstormComments(prev => {
                const localOnly = prev.filter((c: any) => !c.studentId && c.name !== studentName);
                const merged = [...localOnly, ...serverState.brainstormComments];
                if (JSON.stringify(prev) !== JSON.stringify(merged)) {
                  return merged;
                }
                return prev;
              });
            }
            if (serverState.schoolName !== undefined && serverState.schoolName !== schoolName) {
              setSchoolName(serverState.schoolName);
            }
            if (typeof serverState.studentGrade === 'number' && serverState.studentGrade !== studentGrade) {
              setStudentGrade(serverState.studentGrade);
            }
            if (typeof serverState.studentClass === 'number' && serverState.studentClass !== studentClass) {
              setStudentClass(serverState.studentClass);
            }
            if (typeof serverState.classmateCount === 'number' && serverState.classmateCount !== classmateCount) {
              setClassmateCount(serverState.classmateCount);
              setTempClassmateCount(serverState.classmateCount);
            }
            if (serverState.isAutoCapacity !== undefined && serverState.isAutoCapacity !== isAutoCapacity) {
              setIsAutoCapacity(serverState.isAutoCapacity);
            }
            if (serverState.customCapacity) {
              setCustomCapacity(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(serverState.customCapacity)) {
                  return serverState.customCapacity;
                }
                return prev;
              });
            }
            if (serverState.hasVotedSimulated !== undefined) {
              setHasVotedSimulated(!!serverState.hasVotedSimulated);
            }

            // 3. Sync student-only states (Step controls with yanking protection)
            if (viewMode === 'student') {
              if (typeof serverState.step === 'number' && serverState.step !== step) {
                // If local step is positive but server returns 0 (due to container sleep reset), protect against yanking
                if (serverState.step === 0 && step > 0) {
                  console.warn("[Sync] Server step is 0, local is positive. Protecting against ephemeral Vercel sleep resets.");
                } else {
                  setStep(serverState.step);
                  setIsSubmittedForStep(false);
                  hasDismissedAlertForStep.current = false;
                  setShowStepTransitionAlert(false);
                }
              }

              // Check if teacher reset our submitted status
              const myServerInfo = serverState.students?.[myStudentId];
              if (myServerInfo) {
                if (myServerInfo.isDone !== undefined && myServerInfo.isDone !== isSubmittedForStep) {
                  setIsSubmittedForStep(myServerInfo.isDone);
                }
              }

              // Check for step transition alert
              if (serverState.showStepTransitionAlert && !hasDismissedAlertForStep.current) {
                setShowStepTransitionAlert(true);
              } else if (!serverState.showStepTransitionAlert) {
                setShowStepTransitionAlert(false);
              }
            }
          }
        }
      } catch (e) {
        console.error("Error polling group state:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [groupId, viewMode, step, schoolName, studentGrade, studentClass, classmateCount, isAutoCapacity, isSubmittedForStep, myStudentId]);

  // Handle reset isPrintingAll after printing
  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrintingAll(false);
      document.body.classList.remove('printing-all');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handlePrintAll = () => {
    setIsPrintingAll(true);
    document.body.classList.add('printing-all');
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
        setMascotSpeech(`하고 싶은 역할을 1~3지망까지 고르고 지원서를 작성해보자! 우측 그래프에서 실시간으로 경쟁률과 친구들이 쓴 지망 사연을 확인할 수 있어. 필요하다면 언제든 마음껏 수정해도 좋아! 📊`);
        break;
      case 7:
        setMascotSpeech(`준비 완료! 모두의 선호도와 적합도를 모아서 내가 지혜롭고 공평하게 역할을 나누어 줄게. 과연 어떤 역할을 맡게 될까? 아래 배정 버튼을 눌러줘! 🎲`);
        break;
      case 8:
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
      if (rolePool.length < 4) {
        alert('최소 4개 이상의 역할이 투표에 참여해야 다음 단계로 넘어갈 수 있습니다!');
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
      // Generate simulated classmates when moving to Step 6
      if (classmates.length === 0) {
        const generated = generateClassmates(classmateCount, rolePool);
        setClassmates(generated);
      }
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
  const handleAddBrainstormComment = async () => {
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
      name: studentName,
      avatar: studentGender === 'boy' ? '👦' : '👧',
      comment: userBrainstormComment.trim(),
      problemId: probId,
      studentId: myStudentId,
      timestamp: Date.now()
    };

    if (groupId) {
      try {
        await fetch(`/api/sync?group=${encodeURIComponent(groupId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_brainstorm_comment',
            comment: newComment
          })
        });
      } catch (e) {
        console.error("Error sending brainstorm comment:", e);
      }
    } else {
      setBrainstormComments(prev => [
        ...prev,
        {
          ...newComment,
          name: studentName + ' (나)'
        }
      ]);
    }
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
초등학교 3학년이 읽고 바로 이해할 수 있도록 문장을 아주 간결하고 짧게(한 문장 15자 내외, 총 2문장 이하) 작성해주세요.
'job'(할 일)과 'reason'(필요한 이유)도 아주 직관적이고 쉬운 단어로 요약해주세요.
반드시 아래 JSON 배열 형식으로만 응답하며, 앞뒤에 다른 말이나 \`\`\`json 기호를 포함하지 말아주세요.
JSON 포맷:
[
  {
    "problemId": "매칭되는 문제의 ID (전달받은 고민 ID 목록 중 하나)",
    "name": "역할 이름 (예: 칠판 요정, 책꽂이 박사)",
    "job": "초3 수준으로 간결하고 직관적으로 쓸 것 (예: 매일 칠판을 깨끗이 닦아요)",
    "reason": "초3 수준으로 아주 쉬운 필요성 (예: 선생님의 칠판 청소를 도와드려요)"
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

  // Suggest 3 child-friendly role names based on custom job using AI
  const handleSuggestRoleNameAI = async (problemId: string, jobText: string) => {
    if (!jobText.trim()) {
      alert('하는 일을 구체적으로 적어주세요!');
      return;
    }
    setIsSuggestingNames(true);
    setSuggestedNames([]);

    const prob = PROBLEM_LIST.find(p => p.id === problemId) || customProblemsList.find(p => p.id === problemId) || { title: '교실 고민' };

    try {
      const systemPrompt = `당신은 초등학교 3~4학년 학급 경영을 돕는 친절한 AI 조수 '아리'입니다.
학생들이 교실 고민('${prob.title}')을 해결하기 위해 제안한 구체적인 활동 내용('${jobText}')에 가장 어울리고 귀여운 초등학교 3학년 맞춤형 역할 이름 3개를 지어주세요.
각 역할 이름은 2~6글자 내외의 짧고 귀여운 명칭(예: 칠판 화가, 분리수거 대장, 뽀드득 요정 등)이어야 하며, 이모지(예: 🎨, 🗑️, 🧼)를 하나씩 꼭 포함해야 합니다.
반드시 다른 설명 없이 아래 JSON 배열 포맷으로만 응답해주세요. 앞뒤에 다른 말이나 \`\`\`json 기호를 포함하지 말아주세요.
JSON 포맷:
[
  "추천 이름 1",
  "추천 이름 2",
  "추천 이름 3"
]`;
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `해결하려는 고민: ${prob.title}, 구체적인 할 일: ${jobText}` }
      ];

      const res = await sendMessageToAPI(messages as any);
      let cleaned = res.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
      }

      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSuggestedNames(parsed);
      } else {
        throw new Error('Not a valid array');
      }
    } catch (error) {
      console.error('AI Role Name Suggestion Error:', error);
      setSuggestedNames(['아리 도우미 🐥', '반짝 해결사 ✨', '행복 지킴이 💖']);
    } finally {
      setIsSuggestingNames(false);
    }
  };

  const handleStudentSuggestRole = async (name: string, job: string, problemId: string, reason?: string) => {
    if (!name.trim()) {
      alert('역할 이름을 적어주세요!');
      return;
    }
    if (!job.trim()) {
      alert('하는 일을 구체적으로 적어주세요!');
      return;
    }

    const newRole: Role = {
      id: `student-role-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      job: job.trim(),
      reason: reason?.trim() || '우리 교실의 편리함과 행복을 위해서입니다.',
      problemId: problemId,
      recommendedBy: studentName || '학생 해결사',
      votes: 0,
      capacity: 1,
      isCustom: true
    };

    setRolePool(prev => {
      if (prev.some(r => r.name === newRole.name)) {
        alert('이미 같은 이름의 역할이 존재합니다!');
        return prev;
      }
      return [...prev, newRole];
    });

    setStudentCustomName('');
    setStudentCustomJob('');
    setStudentCustomReason('');
    setSuggestedNames([]);
    setShowStudentAddCustom(false);

    if (groupId) {
      try {
        await fetch(`/api/sync?group=${encodeURIComponent(groupId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'suggest_role',
            state: { role: newRole }
          })
        });
      } catch (e) {
        console.error('Error syncing student custom role:', e);
      }
    }
  };

  const handleStudentSubmitSuggestions = () => {
    if (groupId && viewMode === 'student') {
      const mySuggestedRoles = rolePool.filter(r => r.recommendedBy === studentName);
      if (mySuggestedRoles.length === 0) {
        alert('우리 반을 위해 해결하고 싶은 역할을 최소 1개 이상 제안해 주세요! 아래 "새로운 역할 직접 제안하기"나 "아리의 아이디어 상자"에서 역할을 추가할 수 있어요.');
        return;
      }
      const confirmSubmit = window.confirm('정말로 이 역할들을 제안하고 제출하시겠습니까? 제출한 뒤에는 역할을 수정할 수 없습니다.');
      if (confirmSubmit) {
        setIsSubmittedForStep(true);
      }
    } else {
      if (rolePool.length < 4) {
        alert('최소 4개 이상의 역할이 있어야 다음 단계로 넘어갈 수 있습니다!');
        return;
      }
      nextStep();
    }
  };

  // Local Keyword Merge fallback
  const localKeywordMerge = (roles: Role[]): Role[] => {
    const merged: Role[] = [];
    const processedIds = new Set<string>();

    const categoryMap = [
      { key: 'board', words: ['칠판', '지우개', '보드마카'], name: '칠판 지킴이 🧹', job: '쉬는 시간마다 칠판을 깨끗이 지우고 분필과 지우개를 가지런히 정리합니다.', reason: '다음 수업을 깨끗하고 산뜻하게 준비하기 위해서예요.' },
      { key: 'milk', words: ['우유', '급식실 우유', '우유곽'], name: '우유 배달 요정 🥛', job: '우리 반 우유 급식을 안전하게 들고 오고 마신 우유 갑을 깨끗하게 정리합니다.', reason: '친구들이 신선한 우유를 먹고 교실을 청결히 유지하기 위해서예요.' },
      { key: 'food', words: ['급식', '배식', '반찬', '점심'], name: '행복 급식 도우미 🍱', job: '급식실에서 차례대로 줄을 서도록 돕고 식탁을 정돈하는 보조 업무를 맡습니다.', reason: '질서 있고 맛있는 점심시간을 만들기 위해서예요.' },
      { key: 'trash', words: ['쓰레기', '분리수거', '휴지통', '재활용'], name: '분리수거 히어로 ♻️', job: '재활용 쓰레기통이 넘치지 않게 정리하고 올바른 분리수거 방법을 친구들에게 안내합니다.', reason: '쓰레기를 줄이고 깨끗하고 건강한 교실 환경을 지키기 위해서예요.' },
      { key: 'clean', words: ['청소', '빗자루', '먼지', '바닥'], name: '환경 보안관 🧹', job: '교실 바닥에 떨어진 쓰레기를 줍고 교실 구석구석을 깨끗하게 정돈합니다.', reason: '우리 반 모두가 먼지 없는 상쾌한 공간에서 지내기 위해서예요.' },
      { key: 'greeting', words: ['인사', '웃음', '반갑'], name: '다정인사 지기 🙋', job: '아침에 교실에 들어오는 친구들과 선생님께 미소로 먼저 따뜻하게 인사를 나눕니다.', reason: '매일 아침 서로 반갑게 시작하며 친밀한 반 분위기를 만들기 위해서예요.' },
      { key: 'sports', words: ['체육', '축구', '피구', '운동', '체육관'], name: '신나는 체육 부장 ⚽', job: '체육 시간에 필요한 운동기구를 챙겨오고 활동이 끝나면 안전하게 정리합니다.', reason: '운동기구 분실을 예방하고 체육 활동을 원활하게 돕기 위해서예요.' },
      { key: 'book', words: ['책', '도서', '도서관', '독서'], name: '생각 쑥쑥 도서 지기 📚', job: '학급 문고의 도서들을 가나다 순서대로 예쁘게 정리하고 책 읽는 분위기를 돕습니다.', reason: '친구들이 책을 편리하게 찾아 읽으며 생각이 자라도록 하기 위해서예요.' },
      { key: 'compliment', words: ['칭찬', '편지', '마음', '고마움'], name: '마음 배달 우체부 💌', job: '친구들의 선행과 고마운 마음이 적힌 편지나 쪽지를 받아 소중하게 전달합니다.', reason: '서로 칭찬하며 친해질 수 있는 행복한 마음을 전하기 위해서예요.' },
      { key: 'energy', words: ['소등', '불', '전등', '에너지'], name: '그린 에너지 지킴이 💡', job: '아무도 없는 특별실이나 점심시간에 교실 전등을 끄고 에너지를 절약합니다.', reason: '지구 환경을 보호하고 소중한 에너지를 아끼기 위해서예요.' },
      { key: 'ventilation', words: ['환기', '창문', '공기'], name: '상쾌 환기 바람 요정 💨', job: '수업이 끝나면 창문을 열어 상쾌한 공기로 환기시키고 창문 잠금장치를 확인합니다.', reason: '머리가 맑아지는 맑은 공기를 친구들에게 선물하기 위해서예요.' }
    ];

    for (const cat of categoryMap) {
      const matchingRoles = roles.filter(r => {
        if (processedIds.has(r.id)) return false;
        const combinedText = (r.name + ' ' + r.job + ' ' + (r.reason || '')).toLowerCase();
        return cat.words.some(word => combinedText.includes(word));
      });

      if (matchingRoles.length >= 2) {
        const mergedRecommendedBy = matchingRoles.map(r => r.recommendedBy || '학생').join(' + ');
        merged.push({
          id: `merged-local-${cat.key}-${Date.now()}`,
          name: cat.name,
          job: cat.job,
          reason: cat.reason,
          problemId: matchingRoles[0].problemId || 'trash',
          recommendedBy: `${mergedRecommendedBy} (합동제안)`,
          votes: 0,
          capacity: 1
        });
        matchingRoles.forEach(r => processedIds.add(r.id));
      }
    }

    roles.forEach(r => {
      if (!processedIds.has(r.id)) {
        merged.push(r);
      }
    });

    return merged;
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
초등학교 3학년이 읽고 바로 이해할 수 있도록 문장을 아주 간결하고 짧게(한 문장 15자 내외, 총 2문장 이하) 작성해주세요.
'job'(할 일)과 'reason'(필요한 이유)도 아주 직관적이고 쉬운 단어로 요약해주세요.
통합 완료 후 정돈된 학급 역할 목록을 반드시 아래 JSON 배열 형식으로만 응답하고, 앞뒤에 다른 설명이나 \`\`\`json 기호를 일절 포함하지 마세요.
최소 4개 이상의 역할이 유지되도록 해주세요.
JSON 포맷:
[
  {
    "name": "정돈된 역할 이름",
    "job": "초3 수준으로 매우 간결하게 쓴 업무 설명",
    "reason": "초3 수준으로 아주 쉬운 필요성 이유",
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
      const mergedLocal = localKeywordMerge(rolePool);
      if (mergedLocal.length < rolePool.length) {
        setRolePool(mergedLocal);
        alert('AI 정리 도우미가 비슷한 성격의 역할들(칠판, 급식, 청소 등)을 하나로 예쁘게 모아 정돈했습니다! (로컬 백업 병합 작동 완료)');
      } else {
        alert('AI가 정리 중에 조금 고민이 길어지나 봐요. 지금 역할 목록을 그대로 사용할게요!');
      }
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

  // Step 4: Simulate classmate votes removed from direct button click

  const getDiverseFillerRoles = (currentPool: Role[], neededCount: number): Role[] => {
    const existingNames = currentPool.map(r => r.name.toLowerCase());
    const unusedPresets: any[] = [];
    
    // 1. Collect unused presets from DEFAULT_ROLES_MAP
    Object.keys(DEFAULT_ROLES_MAP).forEach(key => {
      const presets = DEFAULT_ROLES_MAP[key] || [];
      presets.forEach(p => {
        if (!existingNames.includes(p.name.toLowerCase())) {
          unusedPresets.push({ ...p, problemId: key });
        }
      });
    });

    // 2. Extra backup presets for diversity
    const backupPresets = [
      { name: '칭찬 우체부 💌', job: '친구들의 다정한 선행을 발견해 칭찬함에 넣고 일주일에 한 번씩 소개해요.', reason: '서로를 칭찬하고 배려하는 긍정적인 반 분위기를 만들기 위해서예요.', problemId: 'school' },
      { name: '인사 요정 🙋', job: '아침에 교실에 들어오는 친구들과 선생님께 웃는 얼굴로 밝게 먼저 인사를 건네며 하루를 열어요.', reason: '서로 반갑게 마주하며 기분 좋은 학급 아침 문화를 만들기 위해서예요.', problemId: 'school' },
      { name: '체육 부장 ⚽', job: '체육 시간에 쓸 운동 기구를 안전하게 준비하고, 운동이 끝난 후 다시 물품을 깨끗하게 정리해서 보관해요.', reason: '물건 분실 없이 안전하고 신나는 신체 활동을 다 함께 즐기기 위해서예요.', problemId: 'school' },
      { name: '급식 줄 지키미 🍱', job: '점심시간 급식실 앞에서 질서 있고 바르게 친구들이 줄을 설 수 있도록 친절하게 돕습니다.', reason: '차례를 지키며 다치는 친구 없이 다 함께 평화로운 점심시간을 만들기 위해서예요.', problemId: 'school' },
      { name: '우편 배달부 📢', job: '가정통신문이나 학습 교구재, 알림장 같은 인쇄물들을 모둠별로 신속하고 공평하게 나누어 줍니다.', reason: '학급과 학교의 소중한 소식을 친구들이 빠짐없이 공유받도록 돕기 위해서예요.', problemId: 'school' },
      { name: '미소 지기 🩹', job: '친구들이 다치거나 마음이 아플 때 다정하게 보건실로 안내해주고 상처 밴드를 건네며 위로해요.', reason: '교실 속 아픈 친구를 상냥하게 돌보아 마음의 상처까지 달래주기 위해서예요.', problemId: 'school' }
    ];

    backupPresets.forEach(p => {
      if (!existingNames.includes(p.name.toLowerCase()) && !unusedPresets.some(u => u.name === p.name)) {
        unusedPresets.push(p);
      }
    });

    const filler: Role[] = [];
    let idx = 0;
    while (filler.length < neededCount) {
      if (idx < unusedPresets.length) {
        const item = unusedPresets[idx];
        filler.push({
          id: `filler-role-${idx}-${Date.now()}`,
          name: item.name,
          job: item.job,
          reason: item.reason,
          problemId: item.problemId,
          recommendedBy: 'AI 아리 (부족 보충)',
          votes: 0,
          capacity: 1
        });
      } else {
        // Absolute fallback if we need even more than available presets
        const num = filler.length - unusedPresets.length + 1;
        filler.push({
          id: `filler-fallback-${num}-${Date.now()}`,
          name: `새싹 도우미 ${num} 🌱`,
          job: '교실 구석구석 정리가 필요한 사소한 일손을 돕고 정리정돈을 함께 지원해요.',
          reason: '우리 교실의 모든 구성원이 소외됨 없이 1인 1역할을 맡아 책임을 다하기 위해서예요.',
          problemId: 'trash',
          recommendedBy: 'AI 아리 (임시 보충)',
          votes: 0,
          capacity: 1
        });
      }
      idx++;
    }

    return filler;
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
초등학교 3학년이 읽고 바로 이해할 수 있도록 문장을 아주 간결하고 짧게(한 문장 15자 내외, 총 2문장 이하) 작성해주세요.
'job'(할 일)과 'reason'(필요한 이유)도 아주 직관적이고 쉬운 단어로 요약해주세요.
반드시 아래 JSON 배열 형식으로만 응답하며, 앞뒤에 다른 설명이나 \`\`\`json 기호를 포함하지 마세요.
JSON 포맷:
[
  {
    "problemId": "매칭되는 문제의 ID (전달받은 고민 ID 목록 중 하나)",
    "name": "창의적인 새로운 역할 이름 (예: 분리수거 대장, 빗자루 요정)",
    "job": "초3 수준으로 매우 간결하게 쓴 할 일",
    "reason": "초3 수준으로 아주 쉬운 필요성 이유"
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
        
        let finalPool = [...rolePool, ...extraRoles];
        // If AI returned fewer roles than needed, pad with our diverse filler roles!
        if (finalPool.length < targetCount) {
          const shortCount = targetCount - finalPool.length;
          const fillers = getDiverseFillerRoles(finalPool, shortCount);
          finalPool = [...finalPool, ...fillers];
        }
        setRolePool(finalPool);
        return finalPool;
      }
    } catch (error) {
      console.error('AI Extra Role Generation Error, falling back to diverse presets:', error);
      const fillers = getDiverseFillerRoles(rolePool, needed);
      const finalPool = [...rolePool, ...fillers];
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
    if (rolePool.length < 4) {
      alert('최소 4개 이상의 역할이 투표에 참여해야 다음 단계로 넘어갈 수 있습니다!');
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

    const finalVotes = getCurrentRoleVotes();
    let distributedCaps = { ...customCapacity };
    
    if (isAutoCapacity) {
      distributedCaps = distributeCapacitiesByVotes(currentPool, totalStudents, finalVotes);
      setCustomCapacity(distributedCaps);
    }
    
    setHasVotedSimulated(true);
    
    setRolePool(prevPool => {
      const poolToUse = currentPool.length > prevPool.length ? currentPool : prevPool;
      return poolToUse.map(r => ({
        ...r,
        votes: finalVotes[r.id] || 0,
        capacity: distributedCaps[r.id] !== undefined ? distributedCaps[r.id] : 1
      }));
    });

    nextStep();
  };

  // Step 5: Handle Fit Test Rating Question
  const handleFitTestAnswer = (roleId: string, question: 'q1' | 'q2' | 'q3', score: number) => {
    setFitTestAnswers(prev => {
      const current = prev[roleId] || { q1: 0, q2: 0, q3: 0 };
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

    // If in group mode, only sum the choices of connected real students
    let students: any[] = [];
    if (groupId) {
      students = Object.values(groupRealStudents).map((s: any) => {
        return {
          id: s.id,
          name: s.name,
          applications: s.id === myStudentId ? { ...applications } : (s.applications || { first: '', second: '', third: '' })
        };
      });
      // Ensure current user's local selection is included immediately in student view if not synced yet
      if (viewMode === 'student' && !students.some(st => st.id === myStudentId)) {
        students.push({
          id: myStudentId,
          name: studentName,
          applications: { ...applications }
        });
      }
    } else {
      // In single player/offline mode, fall back to the padded simulated classmates list
      students = getAllStudentsList();
    }

    students.forEach(st => {
      const { first, second, third } = st.applications;
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

  // Step 6: Submit application and trigger simulation modifications
  const handleStudentSubmitApplications = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!applications.first) {
      alert('1지망 역할은 꼭 선택해주셔야 해요!');
      return;
    }
    if (!applicationReasons.first.trim()) {
      alert('1지망 역할에 지원하는 이유를 적어주세요!');
      return;
    }

    if (groupId) {
      setIsSubmittedForStep(true);
    } else {
      const stats = getStats();
      const allStudentsList = getAllStudentsList();
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
    }
  };

  // Step 9: Allocation Trigger
  const handleExecuteAllocation = () => {
    setIsAssigning(true);
    
    // Map the combined list of real students and simulated classmates to match algorithm inputs
    const allStudentsList: Student[] = getAllStudentsList().map(s => ({
      id: s.id,
      name: s.name,
      isUser: s.isUser,
      isReal: s.isReal,
      applications: s.applications,
      suitability: s.suitability
    }));

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
    if (newStep >= 6 && classmates.length === 0) {
      if (rolePool.length === 0) {
        alert('이동하려는 단계에 가상 학생 데이터가 필요하나 역할 풀이 정의되지 않았습니다. 역할을 먼저 생성해주세요.');
        return;
      }
      const generated = generateClassmates(classmateCount, rolePool);
      setClassmates(generated);
    }
    // Clear alert when teacher forces step move
    fetch(`/api/sync?group=${encodeURIComponent(groupId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_state',
        state: {
          showStepTransitionAlert: false
        }
      })
    }).catch(err => console.error("Error clearing step alert:", err));

    setStep(newStep);
  };

  const handleTeacherResetStudent = async (studentId: string) => {
    try {
      await fetch(`/api/sync?group=${encodeURIComponent(groupId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_student',
          student: {
            id: studentId,
            isDone: false
          }
        })
      });
      setGroupRealStudents(prev => {
        const copy = { ...prev };
        if (copy[studentId]) {
          copy[studentId].isDone = false;
        }
        return copy;
      });
      alert('해당 학생의 제출 상태를 성공적으로 초기화했습니다! 다시 참여할 수 있습니다. 🔄');
    } catch (e) {
      console.error("Error resetting student:", e);
      alert('초기화에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  const handleSendStepTransitionAlert = async () => {
    try {
      await fetch(`/api/sync?group=${encodeURIComponent(groupId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_state',
          state: {
            showStepTransitionAlert: true
          }
        })
      });
      alert('학생들에게 단계 이동 알림을 성공적으로 전송했습니다! 🔔');
    } catch (e) {
      console.error("Error sending step alert:", e);
      alert('알림 전송에 실패했습니다. 다시 시도해 주세요.');
    }
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

  // Retrieve full list of students (User + Classmates + Group Real Students)
  const getAllStudentsList = (): DashboardStudent[] => {
    if (!groupId) {
      return [
        {
          id: 'user-student',
          name: studentName || '나',
          isUser: true,
          isReal: true,
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
          isReal: false,
          gender: c.gender,
          applications: c.applications,
          suitability: c.suitability,
          reasons: c.reasons
        }))
      ];
    }

    // In group mode:
    // 1. Gather all real students from groupRealStudents
    const realStudentsList: DashboardStudent[] = Object.values(groupRealStudents).map((s: any) => {
      const suitability: Record<string, number> = {};
      rolePool.forEach(role => {
        suitability[role.id] = calculateSuitabilityForStudent(s.traits, s.fitTestAnswers, role.id);
      });

      return {
        id: s.id,
        name: s.name,
        isUser: s.id === myStudentId,
        isReal: true,
        gender: s.gender || 'boy',
        applications: s.id === myStudentId ? { ...applications } : (s.applications || { first: '', second: '', third: '' }),
        suitability
      };
    });

    // 2. Add simulated classmates from classmate pool to pad out to classmateCount + 1
    const neededSimulated = Math.max(0, (classmateCount + 1) - realStudentsList.length);
    const simulatedList = classmates.slice(0, neededSimulated).map(c => ({
      id: c.id,
      name: c.name,
      isUser: false,
      isReal: false,
      gender: c.gender,
      applications: c.applications,
      suitability: c.suitability,
      reasons: c.reasons
    }));

    return [...realStudentsList, ...simulatedList];
  };

  const getStudentReason = (student: any, rank: 'first' | 'second' | 'third'): string => {
    if (student.id === 'user-student' || student.id === myStudentId || student.isUser) {
      return applicationReasons[rank] || '';
    }
    // If it's a real student in the group, they have applications / applicationReasons on their object
    const realStudent = groupRealStudents[student.id];
    if (realStudent && realStudent.applicationReasons) {
      return realStudent.applicationReasons[rank] || '';
    }
    // If it's a simulated classmate
    if (student.reasons) {
      return student.reasons[rank] || '';
    }
    // Fallback: search in the classmates list
    const mate = classmates.find(c => c.id === student.id);
    if (mate && mate.reasons) {
      return mate.reasons[rank] || '';
    }
    return '';
  };

  const getStudentStepStatus = (student: DashboardStudent, stepIndex: number): 'done' | 'active' | 'locked' => {
    if (groupId && groupRealStudents[student.id]) {
      const rs = groupRealStudents[student.id];
      if (rs.step > stepIndex || (rs.step === stepIndex && rs.isDone)) {
        return 'done';
      } else if (rs.step === stepIndex) {
        return 'active';
      } else {
        return 'locked';
      }
    }
    
    if (student.isUser) {
      if (step > stepIndex || (step === stepIndex && isSubmittedForStep)) {
        return 'done';
      } else if (step === stepIndex) {
        return 'active';
      } else {
        return 'locked';
      }
    }
    
    // Simulated classmates are done for steps <= current step, locked for steps > current step
    if (step > stepIndex) {
      return 'done';
    } else if (step === stepIndex) {
      return 'done';
    } else {
      return 'locked';
    }
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

  const handleTeacherClassSettingsChange = (school: string, grade: number, cls: number) => {
    setSchoolName(school);
    setStudentGrade(grade);
    setStudentClass(cls);
    const pin = generatePinFromInfo(school, grade, cls);
    setGroupId(pin);
  };

  const handleToggleKeyword = (rank: 'first' | 'second' | 'third', keyword: string) => {
    setApplicationKeywords(prev => {
      const current = prev[rank] || [];
      const updated = current.includes(keyword)
        ? current.filter(kw => kw !== keyword)
        : [...current, keyword];
      return {
        ...prev,
        [rank]: updated
      };
    });
  };

  const getCurrentRoleVotes = (): Record<string, number> => {
    const counts: Record<string, number> = {};
    rolePool.forEach(r => {
      counts[r.id] = roleVotes[r.id] || 0;
    });

    if (groupId && groupRealStudents) {
      Object.values(groupRealStudents).forEach((s: any) => {
        if (viewMode === 'student' && s.id === myStudentId) return;
        if (Array.isArray(s.userVotes)) {
          s.userVotes.forEach((roleId: string) => {
            if (counts[roleId] !== undefined) {
              counts[roleId] += 1;
            }
          });
        }
      });

      if (viewMode === 'student' && Array.isArray(userVotes)) {
        userVotes.forEach(roleId => {
          if (counts[roleId] !== undefined) {
            counts[roleId] += 1;
          }
        });
      }
    }

    return counts;
  };

  const getFinalReportData = () => {
    const list: Array<{ name: string; roleName: string; pledge: string }> = [];
    const allSts = getAllStudentsList();
    allSts.forEach(s => {
      const assignedRoleId = assignments[s.id];
      const role = rolePool.find(r => r.id === assignedRoleId);
      const roleName = role ? role.name : '학급 도우미';
      
      let studentPledge = '';
      if (s.isUser) {
        studentPledge = pledge;
      } else {
        const realStudent = groupRealStudents[s.id];
        if (realStudent && realStudent.pledge) {
          studentPledge = realStudent.pledge;
        } else {
          const classmateObj = classmates.find(c => c.id === s.id);
          if (classmateObj && classmateObj.pledge) {
            studentPledge = classmateObj.pledge;
          } else {
            studentPledge = `${roleName} 역할을 맡아 기쁘며, 우리 반을 위해 매일매일 성실하게 활동할 것을 약속합니다! 🤙`;
          }
        }
      }
      
      list.push({
        name: s.name,
        roleName,
        pledge: studentPledge || `${roleName} 역할을 정성껏 수행하겠습니다! 🤝`
      });
    });
    return list;
  };

  const getProblemInfo = (id: string) => {
    const predefined = PROBLEM_LIST.find(p => p.id === id);
    if (predefined) return predefined;
    const custom = customProblemsList.find(p => p.id === id);
    if (custom) return custom;
    return { id, emoji: '❓', title: id, desc: '새로운 우리 반 고민이에요.' };
  };

  const getAllSelectedProblems = (): string[] => {
    const problemsSet = new Set<string>();
    // Add current student's selected problems
    selectedProblems.forEach(id => problemsSet.add(id));
    // Add other synchronized students' selected problems
    Object.values(groupRealStudents).forEach((student: any) => {
      if (Array.isArray(student.selectedProblems)) {
        student.selectedProblems.forEach((id: string) => problemsSet.add(id));
      }
    });
    // Return all selected problems, fallback to default ones if empty
    const result = Array.from(problemsSet);
    return result.length > 0 ? result : ['trash', 'lights', 'floor'];
  };

  const handleStudentFinishVoting = async () => {
    if (groupId) {
      setIsSubmittedForStep(true);
    } else {
      const newVotes: Record<string, number> = {};
      rolePool.forEach(r => {
        newVotes[r.id] = userVotes.includes(r.id) ? 1 : 0;
      });
      for (let i = 0; i < classmateCount; i++) {
        const voteCount = Math.floor(Math.random() * 2) + 2;
        const shuffled = [...rolePool].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, voteCount);
        selected.forEach(r => {
          newVotes[r.id] = (newVotes[r.id] || 0) + 1;
        });
      }
      setRoleVotes(newVotes);
      setHasVotedSimulated(true);

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

      let distributedCaps = { ...customCapacity };
      if (isAutoCapacity) {
        distributedCaps = distributeCapacitiesByVotes(currentPool, totalStudents, newVotes);
        setCustomCapacity(distributedCaps);
      }
      setRolePool(prevPool => {
        const poolToUse = currentPool.length > prevPool.length ? currentPool : prevPool;
        return poolToUse.map(r => ({
          ...r,
          votes: newVotes[r.id] || 0,
          capacity: distributedCaps[r.id] !== undefined ? distributedCaps[r.id] : 1
        }));
      });
      nextStep();
    }
  };

  const renderStageFooter = (
    stepIndex: number,
    onNextClick?: () => void,
    isNextDisabled: boolean = false,
    customNextLabel?: string
  ) => {
    if (groupId && viewMode === 'student') {
      if (stepIndex === 0) {
        if (!isRegisteredInGroup) {
          return (
            <div className="stage-footer-actions" style={{ flexDirection: 'column', gap: '10px', marginTop: '24px' }}>
              <button 
                className="btn-next" 
                onClick={() => {
                  if (!studentName.trim()) {
                    alert('이름을 적어주세요!');
                    return;
                  }
                  if (studentTraits.length < 2) {
                    alert('성격 태그를 2개 이상 선택해 주세요!');
                    return;
                  }
                  setIsRegisteredInGroup(true);
                  setIsSubmittedForStep(true);
                }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                우리 반 그룹 참여하기 🎒 <ChevronRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!studentName.trim()) {
                    alert('이름을 적어주세요!');
                    return;
                  }
                  if (studentTraits.length < 2) {
                    alert('성격 태그를 2개 이상 선택해 주세요!');
                    return;
                  }
                  setGroupId('');
                  setIsRegisteredInGroup(true);
                  nextStep();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.85rem',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                혼자서 연습해보기 (연동 해제)
              </button>
            </div>
          );
        } else {
          return (
            <div className="stage-footer-actions" style={{ marginTop: '24px' }}>
              <div className="waiting-message" style={{
                textAlign: 'center',
                width: '100%',
                padding: '16px',
                background: '#eeebff',
                borderRadius: '16px',
                color: '#4f46e5',
                fontWeight: 'bold',
                border: '1px solid #dcd7ff'
              }}>
                우리 반 그룹에 연결되었습니다! 🎒 선생님께서 시작하실 때까지 기다려 주세요. 🧑‍🏫
              </div>
            </div>
          );
        }
      }

      if (stepIndex === 2) {
        return (
          <div className="stage-footer-actions" style={{ marginTop: '24px' }}>
            <div className="waiting-message" style={{
              textAlign: 'center',
              width: '100%',
              padding: '16px',
              background: '#f0fdf4',
              borderRadius: '16px',
              color: '#16a34a',
              fontWeight: 'bold',
              border: '1px solid #bbf7d0'
            }}>
              💬 친구들과 함께 토론방에서 교실 고민의 해결 방안과 새로운 역할에 대해 자유롭게 이야기 나누어 보세요! (선생님께서 다음 단계로 이동시켜 줍니다.)
            </div>
          </div>
        );
      }

      if (isSubmittedForStep) {
        return (
          <div className="stage-footer-actions" style={{ marginTop: '24px' }}>
            <div className="waiting-message animate-pulse" style={{
              textAlign: 'center',
              width: '100%',
              padding: '16px',
              background: '#e0f2fe',
              borderRadius: '16px',
              color: '#0369a1',
              fontWeight: 'bold',
              border: '1px solid #bae6fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={20} color="#0284c7" />
              <span>이번 단계 활동을 성공적으로 제출했습니다! 선생님께서 다음 단계로 이동하실 때까지 잠시 기다려 주세요. 🧑‍🏫</span>
            </div>
          </div>
        );
      }

      return (
        <div className="stage-footer-actions" style={{ marginTop: '24px' }}>
          <button 
            className="btn-next"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={isNextDisabled}
            onClick={() => {
              if (onNextClick) {
                onNextClick();
              } else {
                setIsSubmittedForStep(true);
              }
            }}
          >
            {customNextLabel || '활동 완료 제출하기 📤'}
          </button>
        </div>
      );
    }

    return (
      <div className="stage-footer-actions" style={{ marginTop: '24px' }}>
        <button className="btn-back" onClick={prevStep} disabled={stepIndex === 0}>
          <ChevronLeft size={18} /> 뒤로
        </button>
        <button 
          className="btn-next" 
          onClick={onNextClick || nextStep}
          disabled={isNextDisabled}
        >
          {customNextLabel || `${STEPS[stepIndex + 1]?.label || '다음'} 단계로`} <ChevronRight size={18} />
        </button>
      </div>
    );
  };

  const isStudentWaiting = !!(
    groupId && 
    viewMode === 'student' && 
    ((step === 0 && isRegisteredInGroup) || (step > 0 && step <= 6 && isSubmittedForStep))
  );

  return (
    <div className="role-flow-layout">
      {/* 💌 LIVE COMPLIMENT TOAST NOTIFICATION */}
      {newComplimentToast && (
        <div className="compliment-toast-overlay">
          <div className="compliment-toast-card">
            <div className="toast-emoji-bubble">
              {newComplimentToast.emoji}
            </div>
            <div className="toast-text-content">
              <div className="toast-sender">from. {newComplimentToast.senderName}</div>
              <div className="toast-message">{newComplimentToast.message}</div>
            </div>
          </div>
        </div>
      )}

      {/* 📢 TEACHER STEP WARNING BANNER */}
      {viewMode === 'student' && showStepTransitionAlert && (
        <div className="cute-warning-banner animate-slide-in" style={{
          background: '#fffbeb',
          border: '2px solid #fcd34d',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          color: '#b45309',
          boxShadow: '0 4px 10px -2px rgba(217, 119, 6, 0.15)'
        }}>
          <span style={{ fontSize: '1.8rem' }}>📢</span>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontWeight: 'bold', fontSize: '0.95rem' }}>선생님 전송 알림</h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', fontWeight: '500' }}>
              곧 다음 단계로 이동합니다! 진행 중인 활동을 얼른 완료하고 아래 버튼을 클릭해 제출해 주세요.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => {
              setShowStepTransitionAlert(false);
              hasDismissedAlertForStep.current = true;
            }} 
            style={{
              background: '#fcd34d',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              color: '#78350f',
              boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)'
            }}
          >
            확인 완료
          </button>
        </div>
      )}

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
          onClick={() => {
            setTeacherSchoolInput(schoolName);
            setTeacherGradeInput(studentGrade || 3);
            setTeacherClassInput(studentClass || 1);
            setShowTeacherPasswordModal(true);
          }}
        >
          👩‍🏫 교사 관리 탭
        </button>
      </div>
      {showTeacherPasswordModal && (
        <div className="modern-modal-overlay">
          <div className={`modern-modal-content ${showPasswordError ? 'shake-error' : ''}`} style={{ maxWidth: '440px' }}>
            <div className="modal-icon-bubble">
              <Lock size={32} />
            </div>
            <h2>교사 관리 탭 접근 및 학급 설정</h2>
            <p>담당 학교와 학년, 반 정보를 설정하고 보안 비밀번호를 입력해주세요.</p>
            
            <div className="form-group-sm" style={{ marginBottom: '12px', width: '100%', textAlign: 'left' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4a5568', display: 'block', marginBottom: '4px' }}>학교 이름</label>
              <input 
                type="text" 
                value={teacherSchoolInput} 
                onChange={(e) => setTeacherSchoolInput(e.target.value)} 
                placeholder="학교 이름을 입력하세요 (예: 성남초등학교)" 
                className="cute-input"
                style={{ padding: '8px 12px', border: '1px solid #cbd5e0', borderRadius: '10px', width: '100%', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '16px', textAlign: 'left' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4a5568', display: 'block', marginBottom: '4px' }}>학년</label>
                <select 
                  value={teacherGradeInput} 
                  onChange={(e) => setTeacherGradeInput(Number(e.target.value))} 
                  className="cute-select"
                  style={{ width: '100%', padding: '8px 12px' }}
                >
                  {[1, 2, 3, 4, 5, 6].map(g => (
                    <option key={g} value={g}>{g}학년</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4a5568', display: 'block', marginBottom: '4px' }}>반</label>
                <select 
                  value={teacherClassInput} 
                  onChange={(e) => setTeacherClassInput(Number(e.target.value))} 
                  className="cute-select"
                  style={{ width: '100%', padding: '8px 12px' }}
                >
                  {Array.from({ length: 15 }, (_, i) => i + 1).map(c => (
                    <option key={c} value={c}>{c}반</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="password-input-wrapper" style={{ marginTop: '12px' }}>
              <input
                type={showPasswordPlain ? 'text' : 'password'}
                value={teacherPasswordInput}
                onChange={(e) => setTeacherPasswordInput(e.target.value)}
                placeholder="보안 비밀번호"
                className="modern-modal-password-input"
                maxLength={10}
              />
              <button 
                type="button" 
                className="password-eye-btn"
                onClick={() => setShowPasswordPlain(!showPasswordPlain)}
              >
                {showPasswordPlain ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '-12px', marginBottom: '24px', width: '100%', textAlign: 'center' }}>
              💡 초기 비밀번호는 1234입니다.
            </p>

            <div className="modern-modal-buttons">
              <button 
                className="modern-modal-btn btn-cancel" 
                onClick={() => { 
                  setShowTeacherPasswordModal(false); 
                  setTeacherPasswordInput(''); 
                  setShowPasswordError(false);
                }}
              >
                취소
              </button>
              <button 
                className="modern-modal-btn btn-confirm" 
                onClick={() => {
                  if (!teacherSchoolInput.trim()) {
                    alert('학교 이름을 입력해주세요!');
                    return;
                  }
                  if (teacherPasswordInput === '1234') {
                    const pin = generatePinFromInfo(teacherSchoolInput, teacherGradeInput, teacherClassInput);
                    setSchoolName(teacherSchoolInput);
                    setStudentGrade(teacherGradeInput);
                    setStudentClass(teacherClassInput);
                    setGroupId(pin);
                    setViewMode('teacher');
                    setShowTeacherPasswordModal(false);
                    setTeacherPasswordInput('');
                    setShowPasswordError(false);
                  } else {
                    setShowPasswordError(true);
                    setTimeout(() => setShowPasswordError(false), 600);
                  }
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📱 MOBILE PROGRESS BAR (Visible only on mobile/tablet) */}
      <div className="mobile-step-indicator no-print">
        <div className="mobile-step-badge">
          {step + 1} / {STEPS.length}단계
        </div>
        <span className="mobile-step-name">{STEPS[step]?.label}</span>
        <div className="mobile-progress-track">
          <div 
            className="mobile-progress-fill" 
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
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

          {/* 교사 신속 네비게이션 제어 바 */}
          <div className="teacher-quick-nav-bar" style={{
            background: 'white',
            padding: '16px 20px',
            borderRadius: '20px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                className="btn-back"
                disabled={step === 0}
                onClick={() => handleForceMoveStep(step - 1)}
                style={{ height: '40px', padding: '0 16px', margin: 0 }}
              >
                <ChevronLeft size={16} /> 이전 단계로
              </button>
              <button 
                type="button" 
                className="btn-next"
                disabled={step >= STEPS.length - 1}
                onClick={() => handleForceMoveStep(step + 1)}
                style={{ height: '40px', padding: '0 16px', margin: 0 }}
              >
                다음 단계로 <ChevronRight size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {(() => {
                const connected = Object.values(groupRealStudents);
                if (connected.length > 0) {
                  const doneCount = connected.filter((s: any) => s.isDone).length;
                  const allDone = doneCount === connected.length;
                  return (
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      color: allDone ? '#10b981' : '#475569',
                      background: allDone ? '#d1fae5' : '#f1f5f9',
                      padding: '6px 12px',
                      borderRadius: '12px',
                      border: allDone ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                      marginRight: '8px'
                    }}>
                      {allDone ? '🎉 우리 반 전원 제출 완료!' : `👥 실시간 제출 현황: ${doneCount} / ${connected.length}명`}
                    </div>
                  );
                }
                return null;
              })()}
              <button
                type="button"
                className="btn-step-alert"
                onClick={handleSendStepTransitionAlert}
                style={{
                  background: '#fffbeb',
                  color: '#d97706',
                  border: '1.5px solid #fcd34d',
                  borderRadius: '12px',
                  padding: '8px 16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '40px',
                  transition: 'all 0.2s'
                }}
              >
                🔔 학생 화면에 단계 이동 알림 전송
              </button>
            </div>
          </div>

          {/* 주요 제어판 */}
          <div className="teacher-controls-section">
            {/* 🎒 학급 그룹 연동 및 실시간 참여자 (QR 코드) */}
            <div className="teacher-card control-card" style={{ gridColumn: 'span 2' }}>
              <h3>🎒 우리 반 그룹 연동 및 실시간 참여자 (QR 코드)</h3>
              <p className="card-desc text-muted">학교 이름, 학년, 반을 설정하면 6자리 고유 PIN 및 QR 코드가 자동으로 만들어집니다. 학생들에게 공유해서 연동 모드로 진행할 수 있어요!</p>
              
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '16px' }}>
                <div style={{ flex: 1.5, minWidth: '250px' }}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1.5, minWidth: '150px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4a5568', display: 'block', marginBottom: '6px' }}>학교 이름</label>
                      <input 
                        type="text"
                        className="cute-input"
                        value={schoolName}
                        onChange={(e) => handleTeacherClassSettingsChange(e.target.value, studentGrade, studentClass)}
                        placeholder="예: 성남초등학교"
                        style={{ padding: '8px 12px', border: '1px solid #cbd5e0', borderRadius: '10px', width: '100%', fontSize: '0.9rem', height: '40px' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4a5568', display: 'block', marginBottom: '6px' }}>대상 학년</label>
                      <select 
                        className="cute-select"
                        value={studentGrade}
                        onChange={(e) => handleTeacherClassSettingsChange(schoolName, Number(e.target.value), studentClass)}
                        style={{ height: '40px' }}
                      >
                        {[1, 2, 3, 4, 5, 6].map(g => (
                          <option key={g} value={g}>{g}학년</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4a5568', display: 'block', marginBottom: '6px' }}>대상 학급</label>
                      <select 
                        className="cute-select"
                        value={studentClass}
                        onChange={(e) => handleTeacherClassSettingsChange(schoolName, studentGrade, Number(e.target.value))}
                        style={{ height: '40px' }}
                      >
                        {Array.from({ length: 15 }, (_, i) => i + 1).map(c => (
                          <option key={c} value={c}>{c}반</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                    <span style={{ fontWeight: 'bold', color: '#4f46e5' }}>접속 PIN 번호: </span>
                    <span style={{ fontFamily: 'monospace', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{groupId}</span>
                    <div style={{ marginTop: '8px' }}>
                      <strong>학생 접속 주소:</strong>
                      <div style={{ color: '#0284c7', marginTop: '4px', textDecoration: 'underline' }}>
                        {window.location.origin}/?group={groupId}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(`${window.location.origin}/?group=${groupId}`)}`} 
                    alt="Class QR Code"
                    style={{ width: '130px', height: '130px' }}
                  />
                </div>

                <div style={{ flex: 1.5, minWidth: '300px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px', display: 'flex', justifyItems: 'center', gap: '6px' }}>
                    <span>👥 실시간 학생 참여 현황 (총 {Object.keys(groupRealStudents).length}명 접속)</span>
                  </h4>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '8px', background: '#f8fafc' }}>
                    {Object.values(groupRealStudents).length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                        {Object.values(groupRealStudents).map((s: any) => (
                          <div 
                            key={s.id} 
                            style={{ 
                              background: 'white', 
                              border: '1px solid #cbd5e0', 
                              borderRadius: '8px', 
                              padding: '6px 8px', 
                              fontSize: '0.8rem', 
                              display: 'flex', 
                              flexDirection: 'column',
                              gap: '4px',
                              borderLeft: s.isDone ? '4px solid #10b981' : '4px solid #94a3b8'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong>{s.name}</strong>
                              <span>{s.gender === 'boy' ? '👦' : '👧'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                              <span>{s.step + 1}단계</span>
                              {s.isDone ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>제출완료</span>
                                  <button
                                    type="button"
                                    onClick={() => handleTeacherResetStudent(s.id)}
                                    title="활동 재참여 시키기"
                                    style={{
                                      background: '#f1f5f9',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '4px',
                                      padding: '2px 4px',
                                      cursor: 'pointer',
                                      fontSize: '0.65rem',
                                      color: '#475569',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '2px'
                                    }}
                                  >
                                    🔄 재참여
                                  </button>
                                </div>
                              ) : (
                                <span>활동중</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '24px 0' }}>
                        아직 접속한 학생이 없습니다. QR코드를 보여주세요!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 🧑‍🏫 단계별 교사 제어 도구 */}
            <div className="teacher-card control-card" style={{ gridColumn: 'span 2' }}>
              <h3>🧑‍🏫 [{step + 1}단계: {STEPS[step]?.label}] - 교사 실시간 제어 도구</h3>
              <p className="card-desc text-muted">현재 단계에서 필요한 교사 전용 관리 도구들입니다. 학생 화면에는 보이지 않으며, 반 전체의 동작을 유도할 수 있습니다.</p>
              
              <div style={{ marginTop: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e0' }}>
                {step === 3 && (
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#4f46e5' }}>💡 3단계 역할 추천 & 정리 도구</h4>
                    <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>학생들 의견을 취합한 후 아래 버튼을 통해 AI 추천 역할을 생성하거나, 중복된 역할을 정리할 수 있습니다.</p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
                          background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                          color: '#4338ca',
                          border: '2.5px solid #818cf8',
                          boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.15)',
                          fontWeight: 'bold'
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
                )}

                {step === 4 && (
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#4f46e5' }}>🗳️ 4단계 투표 마감 관리</h4>
                    <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>학생들이 투표를 마치면 투표를 완료하고 다음 단계로 진행합니다. 역할이 부족한 경우 AI 추천으로 채울 수 있습니다.</p>
                    
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {rolePool.length < classmateCount + 1 && (
                        <button
                          type="button"
                          className="btn-ai-extra-roles"
                          onClick={() => handleGenerateExtraRolesAI(classmateCount + 1)}
                          disabled={isGeneratingExtraRoles}
                          style={{
                            padding: '10px 16px',
                            background: '#e8f0fe',
                            color: '#1a73e8',
                            border: '1.5px dashed #1a73e8',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          {isGeneratingExtraRoles ? '✨ 부족한 역할 생성 중...' : '✨ AI 추천으로 부족한 역할 채우기'}
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-finish-voting"
                        onClick={handleFinishVoting}
                        disabled={rolePool.length < 4}
                        style={{
                          padding: '10px 16px',
                          background: '#4f46e5',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: 'bold',
                          cursor: rolePool.length >= 4 ? 'pointer' : 'not-allowed',
                          opacity: rolePool.length >= 4 ? 1 : 0.6
                        }}
                      >
                        투표 마감하고 다음 단계로
                      </button>
                    </div>
                  </div>
                )}

                {step === 7 && (
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#4f46e5' }}>🎲 7단계 매칭 배정 실행</h4>
                    <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>모든 학생들의 지망 접수가 완료되면 배정 매칭 알고리즘을 수행하여 1인 1역할을 지정합니다.</p>
                    
                    <button 
                      className="btn-execute-match" 
                      onClick={handleExecuteAllocation}
                      disabled={isAssigning}
                      style={{ margin: 0 }}
                    >
                      {isAssigning ? '⚙️ 배정 연산 처리 중...' : '🎲 1인 1역할 최종 자동 배정 시작!'}
                    </button>
                  </div>
                )}

                {step === 8 && (
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#4f46e5' }}>💾 8단계 최종 결과 저장 및 출력</h4>
                    <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>배치표와 우리 반 학생들이 작성한 약속 다짐 서약을 모아서 인쇄하거나 PDF로 보관하세요.</p>
                    
                    <button 
                      className="btn-print-cert" 
                      onClick={handlePrintAll}
                      style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Printer size={18} /> 💾 최종 배치표 및 다짐 PDF 저장
                    </button>
                  </div>
                )}

                {step !== 3 && step !== 4 && step !== 7 && step !== 8 && (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
                    💡 이 단계에는 특별한 개별 제어 버튼이 없습니다. 진행 단계 원격 제어판을 이용해 학급 단계를 조절해 주세요.
                  </p>
                )}
              </div>
            </div>

            {/* 1. 학생 수 및 기본 설정 */}
            <div className="teacher-card control-card">
              <h3>👥 학급 인원 및 가상 데이터 관리</h3>
              <p className="card-desc text-muted">학급 전체 인원을 조절합니다. 가상 친구의 지망 데이터를 즉시 생성/재생성할 수 있습니다.</p>
              <div className="student-count-slider-box">
                <label>가상 학생 수 설정: <strong>{tempClassmateCount}명</strong></label>
                <div className="slider-wrapper">
                  <input 
                    type="range" 
                    min={5} 
                    max={40} 
                    value={tempClassmateCount} 
                    onChange={(e) => setTempClassmateCount(Number(e.target.value))} 
                    className="cute-slider"
                  />
                  <input
                    type="number"
                    min={5}
                    max={40}
                    value={tempClassmateCount}
                    onChange={(e) => setTempClassmateCount(Math.max(5, Math.min(40, Number(e.target.value))))}
                    className="cute-number-input"
                  />
                </div>
              </div>
              <button 
                className="btn-save-classmate-count" 
                onClick={async () => {
                  handleClassmateCountChange(tempClassmateCount);
                  if (groupId) {
                    try {
                      await fetch(`/api/sync?group=${encodeURIComponent(groupId)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'update_state',
                          state: { classmateCount: tempClassmateCount }
                        })
                      });
                    } catch (e) {
                      console.error('Error syncing classmate count setting:', e);
                    }
                  }
                  alert(`학급 인원수를 ${tempClassmateCount}명으로 변경하고, 가상 학생 지망 데이터를 초기화했습니다!`);
                }}
                style={{
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '8px',
                  marginBottom: '16px',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.15)'
                }}
              >
                💾 [학급 인원수 설정 저장 및 데이터 초기화]
              </button>
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

          {/* 📊 실시간 단계별 진행 상황 모니터 및 진도 매트릭스 */}
          <div className="teacher-progress-monitor">
            <div className="progress-header-row">
              <h3>📊 실시간 단계별 학생 완료 상황</h3>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                * 파란색은 현재 해당 단계를 진행 중인 학생, 초록색은 완료한 학생입니다.
              </span>
            </div>

            {/* 11단계 탭 컨트롤 */}
            <div className="step-selector-tabs-container">
              <div className="step-selector-tabs">
                {STEPS.map((s, idx) => {
                  const isCurrentClassStep = step === idx;
                  const isActive = teacherSelectedProgressStep === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`step-selector-tab-btn ${isActive ? 'active' : ''} ${isCurrentClassStep ? 'is-current-class-step' : ''}`}
                      onClick={() => setTeacherSelectedProgressStep(idx)}
                    >
                      <span>{idx + 1}단계</span>
                      <span style={{ fontSize: '0.75rem' }}>({s.label})</span>
                      {isCurrentClassStep && <span style={{ fontSize: '0.7rem', color: '#4f46e5' }}>●</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 진행률 바 */}
            {(() => {
              const students = getAllStudentsList();
              const totalCount = students.length;
              const doneCount = students.filter(st => {
                const status = getStudentStepStatus(st, teacherSelectedProgressStep);
                return status === 'done';
              }).length;
              const activeCount = students.filter(st => {
                const status = getStudentStepStatus(st, teacherSelectedProgressStep);
                return status === 'active';
              }).length;
              const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

              // Categorize students
              const doneStudents = students.filter(st => getStudentStepStatus(st, teacherSelectedProgressStep) === 'done');
              const activeStudents = students.filter(st => getStudentStepStatus(st, teacherSelectedProgressStep) === 'active');
              const lockedStudents = students.filter(st => getStudentStepStatus(st, teacherSelectedProgressStep) === 'locked');

              return (
                <>
                  <div className="progress-stats-summary">
                    <div className="progress-stats-info">
                      <span>[{teacherSelectedProgressStep + 1}단계] 진행 상황: 완료 {doneCount}명 / 진행 중 {activeCount}명 / 미진입 {lockedStudents.length}명</span>
                      <span>진척률 {percent}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>

                  <div className="student-completion-grid">
                    <div className="completion-card done-card">
                      <h4>
                        <Check size={16} /> 완료한 학생 ({doneStudents.length}명)
                      </h4>
                      <div className="completion-student-list">
                        {doneStudents.length > 0 ? (
                          doneStudents.map(st => (
                            <span key={st.id} className="student-tag-pill">
                              {st.name} {st.isUser && '(나)'}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>아직 완료한 학생이 없습니다.</span>
                        )}
                      </div>
                    </div>

                    <div className="completion-card pending-card">
                      <h4>
                        <RefreshCw size={14} className="spinning-icon" /> 진행 중인 학생 ({activeStudents.length}명)
                      </h4>
                      <div className="completion-student-list">
                        {activeStudents.length > 0 ? (
                          activeStudents.map(st => (
                            <span key={st.id} className="student-tag-pill">
                              {st.name} {st.isUser && '(나)'}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>진행 중인 학생이 없습니다.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* 전체 학급 진도 요약 매트릭스 */}
            <div className="matrix-section">
              <h4>🗺️ 학급 진도 요약 매트릭스 (바둑판 보기)</h4>
              <div className="scroll-tip-banner no-print">
                👈 가로로 밀어서 반 친구들의 진도를 확인해보세요
              </div>
              <div className="matrix-table-container">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, zIndex: 12, background: '#f1f5f9', borderRight: '2px solid #cbd5e1' }}>학생 이름</th>
                      {STEPS.map((_, idx) => (
                        <th key={idx} title={_.label}>{idx + 1}단계</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getAllStudentsList().map(st => (
                      <tr key={st.id}>
                        <td className="student-name-cell">
                          {st.name} {st.isUser && '(나)'}
                        </td>
                        {STEPS.map((_, idx) => {
                          const status = getStudentStepStatus(st, idx);
                          return (
                            <td key={idx}>
                              <span 
                                className={`matrix-dot ${status}`} 
                                title={`${st.name} - ${idx + 1}단계: ${
                                  status === 'done' ? '완료' : status === 'active' ? '진행 중' : '미진입'
                                }`}
                              ></span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 실시간 모니터링 테이블 */}
          <div className="teacher-monitoring-section" style={{ marginTop: '24px' }}>
            <div className="teacher-card monitor-card">
              <div className="monitor-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h3 style={{ margin: 0 }}>📋 실시간 학생 지원 현황 및 배정 현황</h3>
                  <button
                    type="button"
                    onClick={() => {
                      document.body.classList.add('printing-monitor');
                      setTimeout(() => {
                        window.print();
                        document.body.classList.remove('printing-monitor');
                      }, 150);
                    }}
                    className="btn-print-monitor no-print"
                    style={{
                      background: '#0ea5e9',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(14, 165, 233, 0.15)'
                    }}
                  >
                    <Printer size={14} /> 💾 실시간 현황 PDF 저장 (인쇄)
                  </button>
                </div>
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
            
            {/* 🔄 역할 수동 맞교환 (지정 맞교환) - Relocated for optimal workflow */}
            <div className="teacher-card control-card" style={{ marginTop: '24px' }}>
              <h3>🔄 역할 수동 맞교환 (지정 맞교환)</h3>
              <p className="card-desc text-muted">서로 다른 역할을 배정받은 두 학생을 골라 역할을 바꿉니다. 배정 단계가 완료된 이후에 사용 가능합니다.</p>
              
              <div className="swap-panel-inputs" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '12px' }}>
                <div className="form-group-sm" style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4a5568', display: 'block', marginBottom: '6px' }}>학생 A</label>
                  <select
                    className="cute-select"
                    value={teacherSwapA}
                    onChange={(e) => setTeacherSwapA(e.target.value)}
                    style={{ width: '100%', height: '40px' }}
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

                <div className="form-group-sm" style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4a5568', display: 'block', marginBottom: '6px' }}>학생 B</label>
                  <select
                    className="cute-select"
                    value={teacherSwapB}
                    onChange={(e) => setTeacherSwapB(e.target.value)}
                    style={{ width: '100%', height: '40px' }}
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
                    height: '40px',
                    minWidth: '120px'
                  }}
                >
                  맞교환 실행 🔄
                </button>
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
                <p>{isStudentWaiting ? '다른 친구들이 완료하기를 기다리고 있어! ⏳ 기다리는 동안 아래에서 친구들과 매칭 카드 게임을 하거나 초성 퀴즈를 풀고, 친구에게 따뜻한 칭찬도 배달해 봐! 💌' : mascotSpeech}</p>
              </div>
            </div>
          </div>

          {/* 💻 STAGE VIEWS */}
          <div className="stage-card-wrapper">
            {isStudentWaiting ? (
              <div className="waiting-land-container animate-slide-in">
                <div style={{
                  background: '#eeebff',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  color: '#4f46e5',
                  fontWeight: 'bold',
                  border: '1px solid #dcd7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  fontSize: '0.9rem'
                }}>
                  <CheckCircle2 size={18} color="#4f46e5" />
                  <span>
                    {step === 0 
                      ? '우리 반 그룹에 연결되었습니다! 선생님께서 시작하실 때까지 기다려 주세요. 🧑‍🏫'
                      : `[${step + 1}단계: ${STEPS[step]?.label}] 활동을 제출했습니다! 선생님이 다음 단계로 이동하실 때까지 기다려 주세요. 🧑‍🏫`
                    }
                  </span>
                </div>

                <h3 className="waiting-land-title">
                  <span>🏰 대기실 랜드 (Waiting Room Land)</span>
                </h3>
                <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                  🎒 우리 반 친구들을 기다리는 동안 심심하지 않게 재미있는 게임과 따뜻한 칭찬을 나눠보세요!
                </p>

                {/* 탭 메뉴 */}
                <div className="waiting-land-tabs">
                  <button 
                    type="button"
                    className={`waiting-land-tab-btn ${activeWaitingTab === 'game' ? 'active' : ''}`}
                    onClick={() => setActiveWaitingTab('game')}
                  >
                    🕹️ 미니 게임 천국
                  </button>
                  <button 
                    type="button"
                    className={`waiting-land-tab-btn ${activeWaitingTab === 'compliment' ? 'active' : ''}`}
                    onClick={() => setActiveWaitingTab('compliment')}
                  >
                    💌 칭찬 배달 요정
                  </button>
                  <button 
                    type="button"
                    className={`waiting-land-tab-btn ${activeWaitingTab === 'inbox' ? 'active' : ''}`}
                    onClick={() => setActiveWaitingTab('inbox')}
                  >
                    📬 받은 칭찬함
                    {(() => {
                      const myCompliments = groupRealStudents[myStudentId]?.receivedCompliments || [];
                      return myCompliments.length > 0 ? (
                        <span className="badge">{myCompliments.length}</span>
                      ) : null;
                    })()}
                  </button>
                </div>

                {/* 탭 콘텐츠 */}
                {activeWaitingTab === 'game' && (
                  <div className="animate-slide-in">
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'center' }}>
                      <button 
                        type="button" 
                        className={`cute-btn-sm ${activeMiniGame === 'memory' ? 'active' : ''}`}
                        onClick={() => setActiveMiniGame('memory')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '20px',
                          border: activeMiniGame === 'memory' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: activeMiniGame === 'memory' ? '#eeebff' : 'white',
                          color: activeMiniGame === 'memory' ? '#4f46e5' : '#475569',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        🎴 카드 뒤집기
                      </button>
                      <button 
                        type="button" 
                        className={`cute-btn-sm ${activeMiniGame === 'riddle' ? 'active' : ''}`}
                        onClick={() => setActiveMiniGame('riddle')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '20px',
                          border: activeMiniGame === 'riddle' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: activeMiniGame === 'riddle' ? '#eeebff' : 'white',
                          color: activeMiniGame === 'riddle' ? '#4f46e5' : '#475569',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        🧩 초성 퀴즈
                      </button>
                    </div>

                    {activeMiniGame === 'memory' ? (
                      <div className="memory-game-panel">
                        <div className="game-stats">
                          <span>뒤집은 횟수: {memoryFlips}회</span>
                          <span>찾은 짝: {memoryMatches} / 6</span>
                        </div>
                        
                        {isGameCompleted ? (
                          <div style={{ textAlign: 'center', padding: '20px' }}>
                            <h3 style={{ fontSize: '1.2rem', color: '#10b981', fontWeight: 'bold', marginBottom: '12px' }}>🎉 축하합니다! 다 맞췄어요!</h3>
                            <button 
                              type="button" 
                              onClick={initMemoryGame}
                              style={{
                                padding: '10px 20px',
                                background: '#4f46e5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                            >
                              다시 도전하기 🔄
                            </button>
                          </div>
                        ) : (
                          <div className="memory-game-grid">
                            {memoryCards.map((card, idx) => {
                              const isFlipped = card.isFlipped || card.isMatched;
                              return (
                                <div 
                                  key={card.id} 
                                  className={`memory-card-item ${isFlipped ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`}
                                  onClick={() => handleCardClick(idx)}
                                >
                                  <div className="memory-card-inner">
                                    <div className="memory-card-face memory-card-front">
                                      ❓
                                    </div>
                                    <div className="memory-card-face memory-card-back">
                                      {card.emoji}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="quiz-panel">
                        <div className="quiz-card">
                          <span className="quiz-badge">점수: {quizScore}점</span>
                          <div className="quiz-question-consonants">
                            {RIDDLE_QUESTIONS[currentRiddleIndex].q}
                          </div>
                          <div className="quiz-question-desc">
                            💡 {RIDDLE_QUESTIONS[currentRiddleIndex].hint}
                          </div>
                          
                          <div className="quiz-input-row">
                            <input 
                              type="text" 
                              placeholder="정답을 입력하세요" 
                              value={riddleInput}
                              onChange={(e) => setRiddleInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRiddleSubmit();
                              }}
                            />
                            <button type="button" onClick={handleRiddleSubmit}>
                              확인
                            </button>
                          </div>
                          
                          {riddleFeedback && (
                            <div className={`quiz-feedback ${riddleFeedback.isCorrect ? 'correct' : 'wrong'}`} style={{ marginTop: '12px' }}>
                              {riddleFeedback.text}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeWaitingTab === 'compliment' && (
                  <div className="animate-slide-in">
                    {(() => {
                      const otherRealStudents = Object.values(groupRealStudents).filter((s: any) => s.id !== myStudentId);
                      const availableTargets = [
                        ...otherRealStudents.map(s => ({ id: s.id, name: s.name, isReal: true })),
                        ...classmates.map(c => ({ id: c.id, name: c.name, isReal: false }))
                      ];

                      return (
                        <div className="compliment-panel">
                          <div className="compliment-field">
                            <label>칭찬할 친구 선택</label>
                            <select 
                              className="cute-select" 
                              value={complimentTargetId} 
                              onChange={(e) => setComplimentTargetId(e.target.value)}
                            >
                              <option value="">-- 친구 선택 --</option>
                              {availableTargets.map(target => (
                                <option key={target.id} value={target.id}>
                                  {target.name} {target.isReal ? '(실시간 접속)' : '(가상 친구)'}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="compliment-field">
                            <label>칭찬 스티커 고르기</label>
                            <div className="sticker-grid">
                              {COMPLIMENT_STICKERS.map(sticker => (
                                <button 
                                  key={sticker}
                                  type="button" 
                                  className={`sticker-btn ${selectedSticker === sticker ? 'selected' : ''}`}
                                  onClick={() => setSelectedSticker(sticker)}
                                >
                                  {sticker}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="compliment-field">
                            <label>따뜻한 격려 한마디 선택</label>
                            <div className="msg-template-list">
                              {COMPLIMENT_TEMPLATES.map(msg => (
                                <button 
                                  key={msg}
                                  type="button" 
                                  className={`msg-template-btn ${selectedMessageTemplate === msg ? 'selected' : ''}`}
                                  onClick={() => setSelectedMessageTemplate(msg)}
                                >
                                  {msg}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button 
                            type="button" 
                            className="btn-next" 
                            onClick={handleSendCompliment}
                            style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
                          >
                            칭찬 메시지 보내기 💌
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {activeWaitingTab === 'inbox' && (
                  <div className="animate-slide-in">
                    {(() => {
                      const myCompliments = groupRealStudents[myStudentId]?.receivedCompliments || [];
                      return (
                        <div className="inbox-panel">
                          {myCompliments.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0', fontSize: '0.9rem' }}>
                              아직 도착한 칭찬 카드가 없어요. 친구들에게 먼저 따뜻한 칭찬을 보내보는 건 어떨까요? 💌
                            </p>
                          ) : (
                            <div className="compliments-scroll">
                              {myCompliments.map((comp: any, idx: number) => (
                                <div key={comp.id || idx} className="compliment-inbox-card">
                                  <div className="compliment-card-emoji">
                                    {comp.emoji}
                                  </div>
                                  <div className="compliment-card-content">
                                    <div className="compliment-card-sender">
                                      from. {comp.senderName}
                                    </div>
                                    <div className="compliment-card-msg">
                                      {comp.message}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* STEP 0: WELCOME & NAME ENTRY */}
                {step === 0 && (
              <div className="stage-content animate-slide-in">
                <h2 className="stage-title">👋 안녕! 너의 정보를 알려줘</h2>
                <p className="stage-desc">친구들과 학급 역할을 고르기 전에 이름과 성별, 학년, 그리고 너의 개성있는 성격을 알려줄래?</p>
                
                {/* 🕹️ 참여 방식 선택 카드 */}
                <div className="form-group">
                  <label className="input-label">🕹️ 참여 방식 선택</label>
                  <div className="participation-mode-selector">
                    <div 
                      className={`participation-mode-card ${participationMode === 'simulated' ? 'active' : ''}`}
                      onClick={() => {
                        setParticipationMode('simulated');
                        setGroupId('');
                        setIsRegisteredInGroup(false);
                      }}
                    >
                      <div className="mode-icon">🕹️</div>
                      <h3>혼자서 해보기</h3>
                      <p>가상 시뮬레이션 모드 (친구들 없이 혼자 체험)</p>
                    </div>
                    <div 
                      className={`participation-mode-card ${participationMode === 'realtime' ? 'active' : ''}`}
                      onClick={() => {
                        setParticipationMode('realtime');
                        setGroupId('');
                        setIsRegisteredInGroup(false);
                      }}
                    >
                      <div className="mode-icon">🌐</div>
                      <h3>실시간 학급 모드</h3>
                      <p>친구들과 실시간으로 연결하여 역할 정하기</p>
                    </div>
                  </div>
                </div>

                {participationMode === 'realtime' && (
                  <div className="animate-slide-in" style={{ marginBottom: '16px' }}>
                    {groupId ? (
                      <div className="connection-status-box" style={{ background: '#f0fdf4', padding: '16px', borderRadius: '16px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#16a34a', fontWeight: 'bold', marginBottom: '8px' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#16a34a', borderRadius: '50%' }}></span>
                          <span>실시간 학급 연결 완료</span>
                        </div>
                        <p style={{ fontSize: '0.95rem', color: '#1e293b', margin: '4px 0 12px 0' }}>
                          <strong>{schoolName || '학급 정보를 불러오는 중...'}</strong> {schoolName && `${studentGrade}학년 ${studentClass}반`}
                        </p>
                        <button
                          type="button"
                          className="btn-disconnect"
                          onClick={() => {
                            setGroupId('');
                            setSchoolName('');
                            setStudentPinInput('');
                            setIsRegisteredInGroup(false);
                          }}
                          style={{
                            padding: '8px 16px',
                            background: '#fee2e2',
                            color: '#ef4444',
                            border: '1px solid #fca5a5',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          다른 학급 PIN 입력하기 (접속 해제)
                        </button>
                      </div>
                    ) : (
                      <div className="pin-entry-box" style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '8px' }}>선생님이 보여주신 6자리 PIN 번호를 입력하세요</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            type="text"
                            className="cute-input"
                            value={studentPinInput}
                            onChange={(e) => setStudentPinInput(e.target.value.replace(/[^0-9]/g, '').substring(0, 6))}
                            placeholder="6자리 PIN 번호 입력"
                            style={{ height: '44px', fontSize: '1rem', borderRadius: '12px', flex: 1, textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (studentPinInput.trim().length !== 6) {
                                alert('6자리 PIN 번호를 올바르게 입력해주세요!');
                                return;
                              }
                              setGroupId(studentPinInput.trim());
                            }}
                            style={{
                              padding: '0 20px',
                              background: '#4f46e5',
                              color: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              height: '44px'
                            }}
                          >
                            입장하기 🎒
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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

                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="input-label">내 학년</label>
                    <select
                      className="cute-input"
                      value={studentGrade}
                      disabled={participationMode === 'realtime' && !!groupId}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setStudentGrade(val);
                      }}
                      style={{ width: '100%', height: '48px', borderRadius: '14px', border: '2px solid #e2e8f0', padding: '0 12px' }}
                    >
                      {[1, 2, 3, 4, 5, 6].map(g => (
                        <option key={g} value={g}>{g}학년</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="input-label">내 반</label>
                    <select
                      className="cute-input"
                      value={studentClass}
                      disabled={participationMode === 'realtime' && !!groupId}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setStudentClass(val);
                      }}
                      style={{ width: '100%', height: '48px', borderRadius: '14px', border: '2px solid #e2e8f0', padding: '0 12px' }}
                    >
                      {Array.from({ length: 15 }, (_, i) => i + 1).map(c => (
                        <option key={c} value={c}>{c}반</option>
                      ))}
                    </select>
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
                  <label className="input-label">🌟 나의 성향 선택 (각 영역에서 1개씩 골라보세요! 최소 2개 이상 선택)</label>
                  <div className="traits-categories-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '16px',
                    marginTop: '12px'
                  }}>
                    {Object.entries(TRAITS_CATEGORIES).map(([catKey, category]) => (
                      <div 
                        key={catKey} 
                        className="trait-category-card" 
                        style={{
                          background: '#f8fafc',
                          borderRadius: '16px',
                          padding: '16px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                      >
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {category.title}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {category.items.map(t => {
                            const isSelected = studentTraits.includes(t.id);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                className={`btn-trait ${isSelected ? 'active' : ''}`}
                                onClick={() => handleSelectTrait(catKey, t.id)}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                                  borderRadius: '12px',
                                  background: isSelected ? '#eeebff' : '#ffffff',
                                  color: isSelected ? '#4f46e5' : '#4a5568',
                                  fontWeight: isSelected ? 'bold' : 'normal',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  gap: '2px',
                                  textAlign: 'left',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t.label}</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {renderStageFooter(0, undefined, !studentName.trim() || studentTraits.length < 2, '시작하기 🎒')}
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

                {renderStageFooter(1, undefined, selectedProblems.length === 0 && !customProblem.trim(), '고민 공유 및 의견 나누기')}
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
                                const isUser = c.name.includes('(나)') || c.studentId === myStudentId || (groupId && c.name === studentName);
                                const displayName = isUser && !c.name.includes('(나)') ? `${c.name} (나)` : c.name;
                                return (
                                  <div key={cIdx} className={`chat-message-bubble ${isUser ? 'user-comment' : ''}`}>
                                    <div className="comment-avatar">{c.avatar}</div>
                                    <div className="comment-text-wrapper">
                                      <span className="comment-user-name">{displayName}</span>
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

                {renderStageFooter(2, undefined, false, '역할 제안하기')}
              </div>
            )}

            {/* STEP 3: RECOMMENDED ROLES & CUSTOM ADDITION */}
            {step === 3 && (
              <div className="stage-content animate-slide-in">
                <h2 className="stage-title">💡 우리 반에 추천하는 해결사 역할</h2>
                <p className="stage-desc">골라준 문제들을 바탕으로 만들어진 역할이에요. 마음에 안 드는 것은 빼고, 새 역할을 추가해보세요.</p>

                {!(groupId && viewMode === 'student') && (
                  <div className="ai-assist-box">
                    <div className="ai-assist-badge">아리의 마법</div>
                    <p>AI 조수가 특별히 더 창의적이고 재미있는 해결사 역할을 추천해 줄 수 있어요!</p>
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
                    </div>
                  </div>
                )}

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
                                  {!(groupId && viewMode === 'student') && (
                                    <button className="btn-delete-role" onClick={() => removeRole(role.id)}>
                                      <Trash2 size={16} />
                                    </button>
                                  )}
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
                {groupId && viewMode === 'student' ? (
                  <div className="student-role-assist-container" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 1. AI 추천 역할 중 내가 마음에 드는 것 골라 추천하기 */}
                    <div className="student-preset-recommendations" style={{ background: '#f0fdf4', padding: '16px', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#16a34a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        💡 <span>아리의 아이디어 상자</span>
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: '#15803d', marginBottom: '12px' }}>아리가 미리 준비한 역할들이에요. 우리 반에 꼭 필요한 역할이라고 생각하면 버튼을 눌러 제안해 보세요!</p>
                      
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {(() => {
                          const activeProblemIds = getAllSelectedProblems();
                          const candidates: { name: string; job: string; reason: string; problemId: string }[] = [];
                          activeProblemIds.forEach(probId => {
                            const presets = DEFAULT_ROLES_MAP[probId] || [];
                            presets.forEach(p => {
                              if (!rolePool.some(r => r.name === p.name)) {
                                candidates.push({ ...p, problemId: probId });
                              }
                            });
                          });

                          if (candidates.length === 0) {
                            return <p style={{ fontSize: '0.8rem', color: '#15803d', fontStyle: 'italic' }}>추천할 만한 기본 역할이 모두 추가되어 있습니다! 새로운 역할을 아래에서 직접 만들어 보세요. ✨</p>;
                          }

                          return candidates.slice(0, 4).map((c, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="btn-preset-suggest"
                              style={{
                                background: '#ffffff',
                                border: '1px solid #bbf7d0',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                color: '#16a34a',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s'
                              }}
                              onClick={() => handleStudentSuggestRole(c.name, c.job, c.problemId, c.reason)}
                            >
                              ➕ {c.name}
                            </button>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* 2. 직접 역할 새로 만들기 + AI 이름 추천 */}
                    <div className="student-custom-builder" style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4f46e5', marginBottom: '8px' }}>🔨 우리가 직접 만드는 새로운 역할</h4>
                      <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>교실을 위해 필요한 일을 생각해서 새로운 역할을 직접 만들 수 있어요!</p>
                      
                      {!showStudentAddCustom ? (
                        <button
                          type="button"
                          className="btn-add-custom-toggle"
                          style={{ width: '100%' }}
                          onClick={() => {
                            const probs = getAllSelectedProblems();
                            setStudentCustomProblem(probs[0] || 'trash');
                            setStudentCustomReason('');
                            setShowStudentAddCustom(true);
                          }}
                        >
                          <Plus size={16} /> 새로운 역할 직접 제안하기
                        </button>
                      ) : (
                        <div className="custom-role-form animate-slide-in">
                          
                          {/* 어떤 고민을 해결할까요 */}
                          <div className="form-group-sm">
                            <label>어떤 고민을 해결하고 싶나요?</label>
                            <select
                              className="cute-select"
                              value={studentCustomProblem}
                              onChange={e => setStudentCustomProblem(e.target.value)}
                            >
                              {getAllSelectedProblems().map(probId => {
                                const prob = getProblemInfo(probId);
                                return (
                                  <option key={probId} value={probId}>{prob.emoji} {prob.title}</option>
                                );
                              })}
                            </select>
                          </div>

                          {/* 하는 구체적인 일 */}
                          <div className="form-group-sm">
                            <label>하는 구체적인 일</label>
                            <textarea
                              value={studentCustomJob}
                              onChange={e => setStudentCustomJob(e.target.value)}
                              placeholder="이 역할이 교실에서 해야 하는 일을 아주 쉽게 적어주세요. (예: 칠판을 쉬는 시간마다 깨끗이 지워요)"
                              maxLength={100}
                              rows={2}
                            />
                          </div>

                          {/* 역할 이름 + AI 추천 받기 */}
                          <div className="form-group-sm" style={{ position: 'relative' }}>
                            <label>역할 이름</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input
                                type="text"
                                value={studentCustomName}
                                onChange={e => setStudentCustomName(e.target.value)}
                                placeholder="이름을 적거나, 오른쪽 AI 버튼을 눌러 추천받으세요!"
                                maxLength={15}
                                style={{ flex: 1 }}
                              />
                              <button
                                type="button"
                                className="btn-ai-action"
                                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                disabled={isSuggestingNames || !studentCustomJob.trim()}
                                onClick={() => handleSuggestRoleNameAI(studentCustomProblem, studentCustomJob)}
                              >
                                {isSuggestingNames ? <RefreshCw className="spinning-icon" size={14} /> : <span>🪄 AI 이름 추천</span>}
                              </button>
                            </div>
                          </div>

                          {/* 필요한 이유 */}
                          <div className="form-group-sm">
                            <label>필요한 이유 (생략 가능)</label>
                            <input
                              type="text"
                              value={studentCustomReason}
                              onChange={e => setStudentCustomReason(e.target.value)}
                              placeholder="예: 깨끗한 교실에서 다치지 않고 즐겁게 생활하기 위해서예요!"
                              maxLength={100}
                            />
                          </div>

                          {/* AI 추천 이름 결과 pill들 */}
                          {suggestedNames.length > 0 && (
                            <div className="ai-suggested-names-list animate-slide-in" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px', background: '#eeebff', padding: '10px', borderRadius: '12px' }}>
                              <span style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 'bold', width: '100%' }}>아리가 제안하는 역할 이름 (클릭하면 쏙 들어갑니다):</span>
                              {suggestedNames.map((name, nIdx) => (
                                <button
                                  key={nIdx}
                                  type="button"
                                  style={{
                                    background: '#ffffff',
                                    border: '1px solid #4f46e5',
                                    padding: '6px 10px',
                                    borderRadius: '10px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    color: '#4f46e5',
                                    fontWeight: 'bold'
                                  }}
                                  onClick={() => setStudentCustomName(name)}
                                >
                                  {name}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="form-actions-sm" style={{ marginTop: '16px' }}>
                            <button
                              type="button"
                              className="btn-submit-custom"
                              disabled={!studentCustomName.trim() || !studentCustomJob.trim()}
                              onClick={() => handleStudentSuggestRole(studentCustomName, studentCustomJob, studentCustomProblem, studentCustomReason)}
                            >
                              우리 반 역할로 추가하기 ➕
                            </button>
                            <button
                              type="button"
                              className="btn-cancel-custom"
                              onClick={() => {
                                setShowStudentAddCustom(false);
                                setSuggestedNames([]);
                              }}
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
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
                )}

                {renderStageFooter(3, handleStudentSubmitSuggestions, isGeneratingRoles, '역할 제안 제출하기 📤')}
              </div>
            )}

            {/* STEP 4: ROLE VOTING & HEART RECOMMENDATIONS */}
            {step === 4 && (
              <div className="stage-content animate-slide-in">
                <h2 className="stage-title">🗳️ 좋은 아이디어에 하트 남기기 (역할 투표)</h2>
                <p className="stage-desc">우리 교실의 고민을 해결하기 위한 좋은 역할 아이디어에 하트를 꾹 눌러줘! 💖</p>

                <div className="vote-stage-layout" style={{
                  display: 'grid',
                  gridTemplateColumns: (groupId && viewMode === 'student') ? '1fr' : '2fr 1fr',
                  gap: '24px'
                }}>
                  {/* Left: Role List for Voting */}
                  <div className="vote-roles-list">
                    {rolePool.map(role => {
                      const prob = PROBLEM_LIST.find(p => p.id === role.problemId) || customProblemsList.find(p => p.id === role.problemId) || { emoji: '✨', title: '기타 고민' };
                      const isVoted = userVotes.includes(role.id);
                      const voteCount = getCurrentRoleVotes()[role.id] || 0;
                      return (
                        <div key={role.id} className={`vote-role-card ${isVoted ? 'voted' : ''}`} style={{ position: 'relative' }}>
                          <button
                            type="button"
                            className={`btn-vote-floating ${isVoted ? 'active' : ''}`}
                            onClick={() => handleToggleUserVote(role.id)}
                            title={isVoted ? '추천 취소' : '좋은 생각이에요!'}
                          >
                            <Heart size={20} fill={isVoted ? 'white' : 'none'} strokeWidth={2.5} />
                          </button>

                          <div className="vote-card-header" style={{ paddingRight: '36px' }}>
                            <span className="vote-card-category">{prob.emoji} {prob.title}</span>
                          </div>
                          
                          <h3 className="vote-card-title" style={{ paddingRight: '36px' }}>{role.name}</h3>
                          
                          <div className="vote-card-detail-box job-box">
                            <span className="detail-box-label">📋 해야 할 일</span>
                            <p className="detail-box-text">{role.job}</p>
                          </div>
                          
                          <div className="vote-card-detail-box reason-box">
                            <span className="detail-box-label">💡 필요한 이유</span>
                            <p className="detail-box-text">{role.reason}</p>
                          </div>
                          
                          <div className="vote-card-footer">
                            <span className="vote-card-recommended" style={{ fontSize: '0.85rem' }}>👤 제안: {role.recommendedBy || 'AI 아리'}</span>
                            <span className="vote-count-badge" style={{
                              background: '#ffe4e6',
                              color: '#e11d48',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontWeight: 'bold',
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              ❤️ {voteCount}표
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right: Vote Status and Control Panel */}
                  {!(groupId && viewMode === 'student') && (
                    <div className="vote-status-box">
                      <h3>🗳️ 투표 진행판</h3>
                      <p className="status-desc">학급 총원: <strong>{classmateCount + 1}명</strong></p>
                      <p className="status-desc">현재 역할 후보 수: <strong>{rolePool.length}개</strong></p>

                      {rolePool.length < classmateCount + 1 && (
                        <div style={{ padding: '10px', background: '#fff9db', border: '1px solid #ffe066', borderRadius: '8px', fontSize: '0.8rem', color: '#f59f00' }}>
                          ⚠️ 역할 후보 개수가 총원({classmateCount + 1}명)보다 적습니다. 배정 시 인원 비례로 정원이 자동 조정되지만, 역할을 더 늘리고 싶다면 아래 AI 버튼을 눌러보세요.
                        </div>
                      )}

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
                            cursor: 'pointer',
                            width: '100%'
                          }}
                        >
                          {isGeneratingExtraRoles ? '✨ 부족한 역할 생성 중...' : '✨ AI 추천으로 부족한 역할 채우기'}
                        </button>
                      )}

                      <div className="vote-rankings">
                        <h4>📊 역할 득표 실시간 순위</h4>
                        <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                          {[...rolePool]
                            .sort((a, b) => (getCurrentRoleVotes()[b.id] || 0) - (getCurrentRoleVotes()[a.id] || 0))
                            .map((r, idx) => (
                              <div key={r.id} className="rank-item">
                                <span className="rank-num">{idx + 1}</span>
                                <span className="rank-name">{r.name}</span>
                                <span className="rank-votes">❤️ {getCurrentRoleVotes()[r.id] || 0}표</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-finish-voting"
                        onClick={handleFinishVoting}
                        disabled={rolePool.length < 4}
                        style={{
                          marginTop: '12px',
                          padding: '12px',
                          background: '#4f46e5',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: rolePool.length >= 4 ? 'pointer' : 'not-allowed',
                          opacity: rolePool.length >= 4 ? 1 : 0.6,
                          width: '100%'
                        }}
                      >
                        투표 마감하고 다음 단계로
                      </button>
                    </div>
                  )}
                </div>

                {renderStageFooter(4, handleStudentFinishVoting, false, '투표 완료 제출하기 📤')}
              </div>
            )}

            {/* STEP 5: ROLE EXPLORATION & SUITABILITY TEST */}
            {step === 5 && (
              <div className="stage-content animate-slide-in">
                <h2 className="stage-title">⭐ 나와 맞춤 (적합도 진단)</h2>
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

                {renderStageFooter(5, undefined, Object.keys(fitTestAnswers).length < Math.min(3, rolePool.length), '적합도 결과 제출하기 📤')}
              </div>
            )}

            {/* STEP 6: PREFERENCE APPLICATION & COMPETITION GRAPH */}
            {step === 6 && (
              <div className="stage-content animate-slide-in">
                <h2 className="stage-title">✍️ 가고 싶은 역할 지원서 작성 및 실시간 경쟁률</h2>
                <p className="stage-desc">가장 하고 싶은 1지망, 2지망, 3지망 역할을 고르고 지원 이유를 적어줘! 우측에서 실시간 지원 현황과 친구들의 사연을 바로 볼 수 있어.</p>

                <div className="step-split-layout">
                  {/* 좌측 영역: 지원서 작성 폼 */}
                  <div className="split-left-panel">
                    <div className="applications-form-area" style={{ width: '100%' }}>
                      
                      {/* 1지망 */}
                      <div className="choice-block first-choice" style={{ margin: 0, marginBottom: '20px' }}>
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
                          <>
                            <div className="keyword-badges-wrapper" style={{ marginTop: '8px', marginBottom: '12px' }}>
                              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>🏷️ 나를 표현하는 키워드 고르기 (AI 글쓰기에 반영돼요!):</span>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {APPLICATION_KEYWORDS.map(keyword => {
                                  const isKeywordSelected = (applicationKeywords.first || []).includes(keyword);
                                  return (
                                    <button
                                      key={keyword}
                                      type="button"
                                      className={`btn-keyword-badge ${isKeywordSelected ? 'active' : ''}`}
                                      onClick={() => handleToggleKeyword('first', keyword)}
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '0.8rem',
                                        border: isKeywordSelected ? '2px solid #4f46e5' : '1px solid #cbd5e0',
                                        background: isKeywordSelected ? '#eeebff' : '#ffffff',
                                        color: isKeywordSelected ? '#4f46e5' : '#4a5568',
                                        cursor: 'pointer',
                                        fontWeight: isKeywordSelected ? 'bold' : 'normal',
                                        transition: 'all 0.15s'
                                      }}
                                    >
                                      {keyword}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

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
                          </>
                        )}
                      </div>

                      {/* 2지망 */}
                      <div className="choice-block second-choice" style={{ margin: 0, marginBottom: '20px' }}>
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
                          <>
                            <div className="keyword-badges-wrapper" style={{ marginTop: '8px', marginBottom: '12px' }}>
                              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>🏷️ 나를 표현하는 키워드 고르기 (AI 글쓰기에 반영돼요!):</span>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {APPLICATION_KEYWORDS.map(keyword => {
                                  const isKeywordSelected = (applicationKeywords.second || []).includes(keyword);
                                  return (
                                    <button
                                      key={keyword}
                                      type="button"
                                      className={`btn-keyword-badge ${isKeywordSelected ? 'active' : ''}`}
                                      onClick={() => handleToggleKeyword('second', keyword)}
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '0.8rem',
                                        border: isKeywordSelected ? '2px solid #4f46e5' : '1px solid #cbd5e0',
                                        background: isKeywordSelected ? '#eeebff' : '#ffffff',
                                        color: isKeywordSelected ? '#4f46e5' : '#4a5568',
                                        cursor: 'pointer',
                                        fontWeight: isKeywordSelected ? 'bold' : 'normal',
                                        transition: 'all 0.15s'
                                      }}
                                    >
                                      {keyword}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

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
                          </>
                        )}
                      </div>

                      {/* 3지망 */}
                      <div className="choice-block third-choice" style={{ margin: 0 }}>
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
                          <>
                            <div className="keyword-badges-wrapper" style={{ marginTop: '8px', marginBottom: '12px' }}>
                              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>🏷️ 나를 표현하는 키워드 고르기 (AI 글쓰기에 반영돼요!):</span>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {APPLICATION_KEYWORDS.map(keyword => {
                                  const isKeywordSelected = (applicationKeywords.third || []).includes(keyword);
                                  return (
                                    <button
                                      key={keyword}
                                      type="button"
                                      className={`btn-keyword-badge ${isKeywordSelected ? 'active' : ''}`}
                                      onClick={() => handleToggleKeyword('third', keyword)}
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '0.8rem',
                                        border: isKeywordSelected ? '2px solid #4f46e5' : '1px solid #cbd5e0',
                                        background: isKeywordSelected ? '#eeebff' : '#ffffff',
                                        color: isKeywordSelected ? '#4f46e5' : '#4a5568',
                                        cursor: 'pointer',
                                        fontWeight: isKeywordSelected ? 'bold' : 'normal',
                                        transition: 'all 0.15s'
                                      }}
                                    >
                                      {keyword}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

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
                          </>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* 우측 영역: 실시간 경쟁률 그래프 및 친구들 사연 피킹 창 */}
                  <div className="split-right-panel" style={{ position: 'relative', minHeight: '300px' }}>
                    {(viewMode === 'student' && !isSubmittedForStep) ? (
                      <div className="lock-overlay-panel animate-slide-in" style={{
                        background: 'linear-gradient(135deg, #fef2f2 0%, #fdf2f8 100%)',
                        border: '2px dashed #fbcfe8',
                        borderRadius: '24px',
                        padding: '40px 24px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px',
                        height: '100%',
                        boxSizing: 'border-box'
                      }}>
                        <div style={{ fontSize: '3.5rem', animation: 'wiggle 2.5s infinite' }}>🔒</div>
                        <h3 style={{ margin: 0, color: '#db2777', fontWeight: 'bold', fontSize: '1.2rem' }}>실시간 현황 엿보기 잠김!</h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#9d174d', lineHeight: '1.5', wordBreak: 'keep-all' }}>
                          내가 먼저 1지망 역할과 지원 동기를 작성해서 <strong>[활동 제출하기]</strong> 버튼을 누르면 친구들의 실시간 경쟁률과 다짐 피드가 바로 열립니다! 🚀
                        </p>
                        <span style={{ fontSize: '0.8rem', color: '#be185d', background: '#fce7f3', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
                          친구들의 선택을 보지 않고 스스로 지망해 보아요 ⭐
                        </span>
                      </div>
                    ) : (
                      <div className="stats-box-integrated" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="stats-header" style={{ borderBottom: '2px solid #eeebff', paddingBottom: '10px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            📊 실시간 경쟁률 현황
                          </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                          총 {groupId ? Object.keys(groupRealStudents).length : classmateCount + 1}명의 1지망 실시간 지원 현황입니다.
                        </p>
                      </div>

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
                          <div className="stats-charts-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {rolePool.map(role => {
                              const roleStat = stats[role.id] || { first: 0, second: 0, third: 0, total: 0 };
                              const firstChoiceCount = roleStat.first;
                              const capacity = roleCapacities[role.id] !== undefined ? roleCapacities[role.id] : 1;
                              const isOverCapacity = firstChoiceCount > capacity;
                              const compRate = capacity > 0 ? (firstChoiceCount / capacity).toFixed(1) : (firstChoiceCount > 0 ? '∞' : '0.0');

                              let statusColorClass = 'status-green';
                              let statusText = '여유로움 🍀';
                              if (firstChoiceCount === capacity) {
                                statusColorClass = 'status-yellow';
                                statusText = '적당함 👍';
                              } else if (isOverCapacity) {
                                statusColorClass = 'status-red';
                                statusText = '인기 폭발 ⚠️';
                              }

                              const maxVal = Math.max(5, ...rolePool.map(r => (stats[r.id]?.first || 0)));

                              return (
                                <div key={role.id} className="stat-row-card" style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                                  <div className="stat-row-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                                    <div className="stat-role-title" style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>{role.name}</span>
                                      <span className={`status-badge ${statusColorClass}`} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '20px' }}>
                                        {statusText}
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: '#475569', marginLeft: 'auto' }}>
                                      1지망: <strong>{firstChoiceCount}명</strong> / 정원: {capacity}명 (경쟁률 {compRate}:1)
                                    </span>
                                  </div>

                                  <div className="progress-bar-track" style={{ position: 'relative', height: '12px', background: '#cbd5e1', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
                                    <div 
                                      className={`progress-bar-fill ${statusColorClass}`}
                                      style={{ 
                                        height: '100%',
                                        width: `${Math.min(100, (firstChoiceCount / maxVal) * 100)}%`,
                                        transition: 'width 0.3s ease'
                                      }}
                                    />
                                    <div 
                                      className="capacity-marker"
                                      style={{ 
                                        position: 'absolute',
                                        top: 0,
                                        bottom: 0,
                                        width: '2px',
                                        background: '#334155',
                                        left: `${(capacity / maxVal) * 100}%` 
                                      }}
                                      title="정원 기준선"
                                    />
                                  </div>

                                  <div className="stat-peek-area">
                                    <details className="peek-details">
                                      <summary className="peek-summary" style={{ fontSize: '0.8rem', cursor: 'pointer', color: '#4f46e5', fontWeight: 'bold' }}>
                                        👀 지원한 친구들의 다짐 보기
                                      </summary>
                                      <div className="peek-content-list animate-slide-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', padding: '8px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        {applications.first === role.id && (
                                          <div className="peek-item user-peek-item" style={{ background: '#f5f3ff', padding: '8px', borderRadius: '6px', borderLeft: '3px solid #8b5cf6' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#7c3aed' }}>✨ {studentName} (나)</span>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#4b5563', fontStyle: 'italic' }}>
                                              "{applicationReasons.first || '이유를 작성하는 중...'}"
                                            </p>
                                          </div>
                                        )}

                                        {getAllStudentsList()
                                          .filter(c => c.applications.first === role.id && !c.isUser)
                                          .map(c => {
                                            const studentReason = c.isReal 
                                              ? (groupRealStudents[c.id]?.applicationReasons?.first || '이유를 작성하는 중...')
                                              : getStudentReason(c, 'first');
                                            return (
                                              <div key={c.id} className="peek-item" style={{ padding: '6px 8px', borderRadius: '6px', background: '#f8fafc', borderLeft: c.isReal ? '3px solid #10b981' : 'none' }}>
                                                <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#374151' }}>
                                                  {c.name} ({c.gender === 'boy' ? '👦' : '👧'}) {c.isReal && <span style={{ fontSize: '0.7rem', color: '#10b981', background: '#d1fae5', padding: '1px 4px', borderRadius: '4px' }}>접속함</span>}
                                                </span>
                                                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#4b5563', fontStyle: 'italic' }}>
                                                  "{studentReason}"
                                                </p>
                                              </div>
                                            );
                                          })}

                                        {getAllStudentsList().filter(c => c.applications.first === role.id).length === 0 && applications.first !== role.id && (
                                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>이 역할에 1지망으로 지원한 친구가 아직 없습니다.</p>
                                        )}
                                      </div>
                                    </details>
                                  </div>

                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

                {renderStageFooter(6, handleStudentSubmitApplications, !applications.first || !applicationReasons.first.trim(), '활동 제출하기 📤')}
              </div>
            )}
              </>
            )}

            {/* STEP 7: ALLOCATION RUNNING ANIMATION */}
            {step === 7 && (
              <div className="stage-content animate-slide-in text-center-stage">
                <h2 className="stage-title">🎲 공정하게 역할 배정 실행하기</h2>
                <p className="stage-desc">우리의 선택지(지망 순위)와 각자 작성했던 역할 적합도 진단 점수를 합쳐서, 아리가 가장 공정한 분배를 시작합니다!</p>

                {groupId && viewMode === 'student' ? (
                  <div className="assigning-animation-box animate-pulse" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                    <div className="chick-mascot-huge" style={{ fontSize: '4rem', marginBottom: '20px' }}>🐣✨</div>
                    <h3 style={{ fontSize: '1.25rem', color: '#4f46e5', fontWeight: 'bold', marginBottom: '12px' }}>역할 배정 준비 중</h3>
                    <p style={{ color: '#64748b', fontSize: '0.95rem', textAlign: 'center' }}>선생님께서 역할 배정을 진행 중이십니다. 매칭 결과가 발표될 때까지 잠시만 기다려 주세요! 🎲</p>
                  </div>
                ) : isAssigning ? (
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
                  <div className="ready-to-assign-box" style={{ background: '#f8fafc', padding: '24px', borderRadius: '24px', border: '1px solid #cbd5e1', maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <div className="chick-mascot-huge" style={{ fontSize: '3.5rem', marginBottom: '10px' }}>🐣🎩</div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#4f46e5', fontWeight: 'bold' }}>1인 1역할 최종 배정 준비 완료!</h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>알고리즘을 실행하기 전 우리 반의 지망 선호도와 정원 정합성을 미리 진단했습니다.</p>
                    </div>

                    {/* Safety Dashboard Stats */}
                    {(() => {
                      const allSts = getAllStudentsList();
                      const stats = getStats();
                      const roleCapacities = calculateDynamicCapacities(allSts, rolePool, isAutoCapacity ? undefined : customCapacity);
                      
                      const totalStudents = allSts.length;
                      const totalCapacity = Object.values(roleCapacities).reduce((a, b) => a + b, 0);
                      
                      const oversubscribed: string[] = [];
                      const emptyRoles: string[] = [];
                      
                      rolePool.forEach(role => {
                        const firstChoice = stats[role.id]?.first || 0;
                        const cap = roleCapacities[role.id] || 0;
                        if (firstChoice > cap) {
                          oversubscribed.push(`${role.name} (${firstChoice}명 지망 / 정원 ${cap}명)`);
                        }
                        if (stats[role.id]?.total === 0) {
                          emptyRoles.push(role.name);
                        }
                      });

                      const isShortfall = totalCapacity < totalStudents;

                      return (
                        <div className="safety-dashboard-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e0' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                            🛡️ 배정 매칭 안전 진단 보고서
                          </h4>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                              <span style={{ display: 'block', fontSize: '0.8rem', color: '#16a34a', fontWeight: 'bold' }}>총 학생 수</span>
                              <strong style={{ fontSize: '1.2rem', color: '#15803d' }}>{totalStudents}명</strong>
                            </div>
                            <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                              <span style={{ display: 'block', fontSize: '0.8rem', color: '#0284c7', fontWeight: 'bold' }}>설정된 역할 정원 총합</span>
                              <strong style={{ fontSize: '1.2rem', color: '#0369a1' }}>{totalCapacity}명</strong>
                            </div>
                            <div style={{ background: isShortfall ? '#fffbeb' : '#f0fdf4', padding: '12px', borderRadius: '12px', border: isShortfall ? '1px solid #fde68a' : '1px solid #bbf7d0' }}>
                              <span style={{ display: 'block', fontSize: '0.8rem', color: isShortfall ? '#d97706' : '#16a34a', fontWeight: 'bold' }}>배정 가능 여부</span>
                              <strong style={{ fontSize: '1.1rem', color: isShortfall ? '#b45309' : '#15803d' }}>
                                {isShortfall ? '⚠️ 정원 부족 (보정 실행)' : '✅ 안정 배정 가능'}
                              </strong>
                            </div>
                          </div>

                          {/* Oversubscribed roles warning */}
                          {oversubscribed.length > 0 && (
                            <div style={{ background: '#fff5f5', padding: '10px 12px', borderRadius: '10px', borderLeft: '4px solid #ef4444' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#e11d48', display: 'block', marginBottom: '4px' }}>🔥 선호 집중 역할 (경쟁 치열):</span>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {oversubscribed.map((item, idx) => (
                                  <span key={idx} style={{ fontSize: '0.75rem', color: '#be185d', background: '#ffe4e6', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Empty roles warning */}
                          {emptyRoles.length > 0 && (
                            <div style={{ background: '#fcf8e3', padding: '10px 12px', borderRadius: '10px', borderLeft: '4px solid #f0ad4e' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#c07e00', display: 'block', marginBottom: '4px' }}>💨 지원자 없음 (랜덤 배정 또는 가상 친구가 담당):</span>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {emptyRoles.map((name, idx) => (
                                  <span key={idx} style={{ fontSize: '0.75rem', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                                    {name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                      <button 
                        className="btn-execute-match" 
                        onClick={handleExecuteAllocation}
                        style={{
                          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '16px',
                          padding: '14px 32px',
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
                          transition: 'all 0.2s',
                          width: '100%',
                          textAlign: 'center'
                        }}
                      >
                        🎲 최종 1인 1역할 매칭 시작하기!
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 8: FINAL RESULT & CERTIFICATE / PLEDGE */}
            {step === 8 && (
              <div className="stage-content animate-slide-in print-wrapper">
                <h2 className="stage-title no-print">🏆 최종 배정 결과 및 위촉식</h2>
                <p className="stage-desc no-print">축하합니다! 모두가 한 학기 동안 소중하게 이끌어갈 학급 1인 1역할 배치도와 임명장입니다.</p>

                {(() => {
                  const myId = groupId ? myStudentId : 'user-student';
                  const assignedRoleId = assignments[myId];
                  const role = rolePool.find(r => r.id === assignedRoleId);
                  const detail = matchDetails[myId];
                  
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
                                제 {studentGrade}학년 {studentClass}반
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
                              {studentGrade}학년 {studentClass}반 AI 조수 아리 & 담임교사 백
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

                      {/* ✍️ PLEDGE SECTION OR PLACEMENT BOARD */}
                      {(viewMode === 'student' && !isSubmittedForStep) ? (
                        <div className="pledge-section animate-slide-in" style={{
                          background: '#fffbeb',
                          border: '2px solid #fcd34d',
                          borderRadius: '24px',
                          padding: '24px',
                          marginTop: '24px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px'
                        }}>
                          <h3 style={{ margin: 0, color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>🪴 나의 다짐 약속 적기</h3>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#78350f', lineHeight: '1.4' }}>
                            멋진 <strong>{role ? role.name : '학급 도우미'}</strong> 역할을 수행하기 위해 지킬 나만의 책임감 넘치는 다짐 약속을 한마디 적어줘! 다짐을 적고 제출하면 우리 반 최종 다짐 배치표(약속판)가 활짝 열려! ⭐
                          </p>
                          
                          <div className="pledge-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <input
                              type="text"
                              className="cute-pledge-input"
                              value={pledge}
                              onChange={(e) => setPledge(e.target.value)}
                              placeholder="예: 매일 수업 끝나고 칠판을 뽀드득 소리가 나게 깨끗이 닦겠습니다! 🧹"
                              style={{
                                padding: '12px 16px',
                                border: '2px solid #fde68a',
                                borderRadius: '16px',
                                fontSize: '0.95rem',
                                width: '100%',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            />
                            {pledge.trim() && (
                              <div className="pledge-signature animate-slide-in" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#fef3c7',
                                padding: '6px 12px',
                                borderRadius: '10px',
                                fontSize: '0.85rem',
                                color: '#b45309',
                                fontWeight: 'bold',
                                alignSelf: 'flex-start'
                              }}>
                                <Heart size={16} fill="#f43f5e" stroke="none" /> <strong>{studentName}</strong> 약속함 ✍️
                              </div>
                            )}
                            
                            <button
                              type="button"
                              className="btn-submit-pledge"
                              disabled={!pledge.trim()}
                              onClick={() => {
                                if (!pledge.trim()) {
                                  alert('다짐 약속을 꼭 적어주세요!');
                                  return;
                                }
                                setIsSubmittedForStep(true);
                                alert('다짐 서약이 완료되었습니다! 🎉 우리 반의 전체 다짐 배치표를 확인해 보세요.');
                              }}
                              style={{
                                background: pledge.trim() ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#cbd5e1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '16px',
                                padding: '14px 24px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: pledge.trim() ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s',
                                boxShadow: pledge.trim() ? '0 4px 6px -1px rgba(16, 185, 129, 0.2)' : 'none',
                                textAlign: 'center',
                                marginTop: '12px'
                              }}
                            >
                              ✍️ 다짐 서약서 제출하고 전체 배치표 보기 📤
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="animate-slide-in">
                          {/* 🏫 CLASSROOM ROLE PLACEMENT BOARD (GORGEOUS POLAROID DESIGN) */}
                          <div className="class-pledge-board">
                            <h3 className="placement-board-title no-print">🤝 우리 반 1인 1역할 최종 다짐 약속판</h3>
                            <p className="pledge-board-subtitle no-print">
                              서로 책임을 다하고 배려하며 더 행복한 교실을 만들어 갈 우리들의 아름다운 약속입니다. 💖
                            </p>
                            
                            <div className="pledge-grid">
                              {getAllStudentsList().map(student => {
                                const assignedRoleId = assignments[student.id];
                                const r = rolePool.find(item => item.id === assignedRoleId);
                                if (!r) return null;
                                
                                const isMyCard = student.id === (groupId ? myStudentId : 'user-student');
                                const studentPledge = student.id === myStudentId 
                                  ? pledge 
                                  : (groupRealStudents[student.id]?.pledge || student.pledge || `${r.name} 역할을 정성껏 수행하겠습니다! 🤝`);

                                return (
                                  <div key={student.id} className={`pledge-polaroid-card ${isMyCard ? 'my-polaroid' : ''}`}>
                                    <div className="polaroid-header">
                                      <span className="polaroid-role-badge">⭐ {r.name}</span>
                                    </div>
                                    <div className="polaroid-student-info">
                                      <span className="polaroid-name">{student.name}</span>
                                      <span className="polaroid-gender">{student.gender === 'boy' ? '👦' : '👧'}</span>
                                      {student.isReal && student.id !== myStudentId && (
                                        <span style={{ fontSize: '0.65rem', color: '#10b981', background: '#d1fae5', padding: '1px 4px', borderRadius: '4px', marginLeft: 'auto', fontWeight: 'bold' }}>접속함</span>
                                      )}
                                    </div>
                                    <div className="polaroid-job-box">
                                      <span className="polaroid-label">📋 해야 할 일</span>
                                      <p className="polaroid-text">{r.job}</p>
                                    </div>
                                    <div className="polaroid-pledge-box">
                                      <span className="polaroid-label">✍️ 나의 다짐 약속</span>
                                      <p className="polaroid-pledge-text">"{studentPledge}"</p>
                                    </div>
                                    <div className="polaroid-signature">
                                      <span className="signature-date">{new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}</span>
                                      <span className="signature-handwritten">{student.name} 약속함 🤝</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 💡 NOTICE CARD FOR ROLE SWAP */}
                          <div className="alert-box-info no-print" style={{ margin: '20px 0', background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}>
                            <AlertCircle size={18} />
                            <span>💡 <strong>역할을 바꾸고 싶나요?</strong> 친구와 동의한 후 선생님께 말씀드려보세요! 선생님께서 교사 관리 탭에서 역할을 맞바꿔 주실 수 있습니다.</span>
                          </div>

                          {/* 🏫 CLASSROOM ROLE PLACEMENT BOARD (BACKUP SIMPLE BOARD FOR COMPATIBILITY) */}
                          <div className="class-placement-board no-print" style={{ display: 'none' }}>
                            <h3 className="placement-board-title">🏫 우리 반 1인 1역할 최종 배치표</h3>
                            <div className="placement-grid">
                              {rolePool.map(r => {
                                const assignedToThisRole: string[] = [];
                                const allSts = getAllStudentsList();
                                const myId = groupId ? myStudentId : 'user-student';
                                allSts.forEach(s => {
                                  if (assignments[s.id] === r.id) {
                                    assignedToThisRole.push(s.name + (s.id === myId ? ' ⭐' : ''));
                                  }
                                });

                                const maxCapacity = assignmentsCapacities[r.id] ?? r.capacity ?? 1;

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
                                        ({assignedToThisRole.length}/{maxCapacity}명)
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

                          {/* 📋 FINAL REPORT TABLE (Only visible when printing all or explicitly) */}
                          <div className="final-report-table-wrapper" style={{ marginTop: '32px' }}>
                            <h3 className="placement-board-title" style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>📋 우리 반 역할 배정 및 다짐 서약서</h3>
                            <table className="teacher-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                              <thead>
                                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e0' }}>
                                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>이름</th>
                                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>역할</th>
                                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>나의 다짐 한마디 🤝</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getFinalReportData().map((item, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.name}</td>
                                    <td style={{ padding: '12px' }}>
                                      <span className="assigned-role-badge" style={{ display: 'inline-block' }}>{item.roleName}</span>
                                    </td>
                                    <td style={{ padding: '12px', fontStyle: 'italic', color: '#475569' }}>{item.pledge}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {isPrintingAll && (
                        <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }} className="no-print">
                          인쇄 모드가 준비되었습니다.
                        </div>
                      )}

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
