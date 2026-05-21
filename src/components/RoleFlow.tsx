import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, CheckCircle2, Compass, FileText, BarChart3, 
  RefreshCw, Award, ChevronRight, ChevronLeft, User, 
  Smile, Meh, Frown, Plus, Trash2, AlertCircle, Check, 
  RotateCcw, Printer, Heart, Volume2
} from 'lucide-react';
import { sendMessageToAPI } from '../api/chat';
import { generateClassmates } from '../utils/simulatedData';
import type { Classmate } from '../utils/simulatedData';
import { runMatchAlgorithm, calculateDynamicCapacities } from '../utils/matchAlgorithm';
import type { Student } from '../utils/matchAlgorithm';

// Define steps info
const STEPS = [
  { label: '시작', icon: User },
  { label: '실태 파악', icon: AlertCircle },
  { label: '역할 추천', icon: Compass },
  { label: '나와 맞춤', icon: Smile },
  { label: '역할 지원', icon: FileText },
  { label: '경쟁률 확인', icon: BarChart3 },
  { label: '생각 수정', icon: RefreshCw },
  { label: '역할 배정', icon: Sparkles },
  { label: '최종 발표', icon: Award }
];

// Predefined classroom problems (3-4th grade level)
const PROBLEM_LIST = [
  { id: 'trash', emoji: '🗑️', title: '분리수거 쓰레기통 주변이 늘 지저분해요', desc: '종이컵과 플라스틱이 마구 섞여 버려지거나 바닥에 떨어져 있어요.' },
  { id: 'lights', emoji: '💡', title: '교실 불과 선풍기가 헛되이 켜져 있어요', desc: '이동 수업을 가거나 체육 시간일 때 전등이 그대로 켜져 낭비돼요.' },
  { id: 'floor', emoji: '🧹', title: '바닥에 지우개 가루나 쓰레기가 뒹굴어요', desc: '공부하고 나면 책상 주변 바닥이나 사물함 앞이 지저분해요.' },
  { id: 'windows', emoji: '🚪', title: '창문이 계속 열려 있어 바람이나 먼지가 들어와요', desc: '비가 올 때 창문이 열려 물이 들이치거나 환기 단속이 잘 안 돼요.' },
  { id: 'books', emoji: '📚', title: '학급문고 책꽂이가 엉망으로 섞여 있어요', desc: '책이 뒤죽박죽 꽂혀 있어서 내가 읽고 싶은 책을 찾기 어려워요.' },
  { id: 'plants', emoji: '🪴', title: '교실 화분의 초록이들이 목말라 시들어가요', desc: '화분에 물을 주는 친구가 없어서 흙이 바짝 마르고 잎이 아파해요.' },
  { id: 'milk', emoji: '🥛', title: '아침 우유 상자가 흐트러져 있어 가져가기 불편해요', desc: '우유가 섞여서 내 번호를 찾기 어렵고 우유 곽이 쓰러져 있어요.' },
  { id: 'board', emoji: '🖍️', title: '쉬는 시간마다 칠판이 지저분하게 낙서돼 있어요', desc: '수업이 끝나도 칠판이 닦이지 않아 다음 시간에 선생님 글씨가 잘 안 보여요.' }
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
  'board': [{ name: '칠판 지우개 천사', job: '매 교시 수업이 끝난 후 칠판을 칠판지우개와 크리너로 닦아 먼지가 안 나게 하얗게 정리해두어요.', reason: '다음 수업 때 선생님이 칠판에 쓰시는 내용이 한눈에 쏙쏙 들어오도록 돕고 먼지 날림을 방지해요.' }]
};

export const RoleFlow = () => {
  // --- STATE VARIABLES ---
  const [step, setStep] = useState(0);
  const [studentName, setStudentName] = useState('');
  const [studentGrade, setStudentGrade] = useState<number>(3);
  const [studentGender, setStudentGender] = useState<'boy' | 'girl'>('boy');
  
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [customProblem, setCustomProblem] = useState('');
  
  interface Role {
    id: string;
    name: string;
    job: string;
    reason: string;
    isCustom?: boolean;
  }
  const [rolePool, setRolePool] = useState<Role[]>([]);
  const [isGeneratingRoles, setIsGeneratingRoles] = useState(false);
  
  // Custom role state
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleJob, setNewRoleJob] = useState('');
  const [newRoleReason, setNewRoleReason] = useState('');
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
  const [matchDetails, setMatchDetails] = useState<any>({});
  const [isAssigning, setIsAssigning] = useState(false);
  const [pledge, setPledge] = useState('');
  const [assignmentsCapacities, setAssignmentsCapacities] = useState<Record<string, number>>({});

  // Mascot guide speech list
  const [mascotSpeech, setMascotSpeech] = useState('안녕! 나는 우리 반 역할 배정을 도와줄 다정한 조수 아리(Ari)야! 우선 너의 멋진 이름을 알려줄래? 👋');

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Update mascot speech on step change
  useEffect(() => {
    switch (step) {
      case 0:
        setMascotSpeech(`안녕! 나는 우리 반 역할 지정을 도와줄 귀여운 조수 아리(Ari)야. 우리 같이 1인 1역할을 정해볼까? 먼저 이름을 적어줘!`);
        break;
      case 1:
        setMascotSpeech(`${studentName}아, 반가워! 1단계는 우리 반의 작은 고민들을 찾아보는 거야. 평소 교실에서 불편했던 점이나 정돈이 필요한 것들을 골라볼래?`);
        break;
      case 2:
        setMascotSpeech(`골라준 고민들을 해결하기 위한 역할들을 만들었어! AI가 추천한 것 중에 마음에 드는 걸 고르거나, 우리 반만의 특별한 역할을 더 만들어봐도 좋아! ✨`);
        break;
      case 3:
        setMascotSpeech(`각 역할이 어떤 일을 하는지 살펴보고, 나와 얼마나 잘 맞는지 '적합도 검사'를 해보자! 최소 3개 이상의 역할을 클릭해 스마일 스티커를 붙여줘! ⭐`);
        break;
      case 4:
        setMascotSpeech(`이제 하고 싶은 역할을 1지망부터 3지망까지 고를 시간이야! 왜 이 역할을 잘할 수 있는지 마음을 담아 써보자. 쓰기가 힘들면 내 🪄 AI 마술봉을 눌러봐!`);
        break;
      case 5:
        setMascotSpeech(`우와! 우리 반 친구 24명의 지원서가 모두 들어왔어! 역할별로 경쟁률이 어떨지 그래프를 보면서 확인해보자. 친구들이 쓴 지망 이유도 읽어볼 수 있어!`);
        break;
      case 6:
        setMascotSpeech(`친구들의 경쟁률을 보니 어때? 혹시 다른 역할에 가보고 싶어 졌니? 지망을 바꾸고 싶다면 '딱 한 번만' 수정할 기회를 줄게! 그대로 두어도 좋아.`);
        break;
      case 7:
        setMascotSpeech(`준비 완료! 모두의 선호도와 적합도를 모아서 내가 지혜롭고 공평하게 역할을 나누어 줄게. 과연 어떤 역할을 맡게 될까? 아래 배정 버튼을 눌러줘! 🎲`);
        break;
      case 8:
        setMascotSpeech(`축하해! 🎉 우리 교실의 고민을 멋지게 해결해줄 역할로 선정되었어! 임명장을 확인하고, 이번 학기 동안 어떤 마음으로 활동할지 다짐을 적어 서명해봐!`);
        break;
      default:
        setMascotSpeech('만나서 반가워! 역할을 골라보자!');
    }
  }, [step, studentName]);

  // Calculate suitability score in stars (1 to 5)
  const calculateStars = (roleId: string): number => {
    const answers = fitTestAnswers[roleId];
    if (!answers) return 0;
    const total = answers.q1 + answers.q2 + answers.q3; // max 15, min 3
    // scale to 1-5 stars
    return Math.round((total / 15) * 5);
  };

  const calculatePercent = (roleId: string): number => {
    const answers = fitTestAnswers[roleId];
    if (!answers) return 0;
    const total = answers.q1 + answers.q2 + answers.q3;
    return Math.round((total / 15) * 100);
  };

  // --- ACTIONS ---

  // Handle step navigation
  const nextStep = () => {
    if (step === 0) {
      if (!studentName.trim()) {
        alert('이름을 입력해주세요!');
        return;
      }
    }
    if (step === 1) {
      if (selectedProblems.length === 0 && !customProblem.trim()) {
        alert('최소 하나의 고민을 선택하거나 입력해주세요!');
        return;
      }
      // Initialize roles from selected problems
      generateRolesFromProblems();
    }
    if (step === 3) {
      // Must test at least 3 roles
      const testedCount = Object.keys(fitTestAnswers).length;
      if (testedCount < Math.min(3, rolePool.length)) {
        alert(`나와의 적합도를 알아보기 위해 최소 ${Math.min(3, rolePool.length)}개 이상의 역할에 스마일 스티커를 붙여주세요! (현재 ${testedCount}개 완료)`);
        return;
      }
    }
    if (step === 4) {
      if (!applications.first) {
        alert('1지망 역할은 꼭 선택해주셔야 해요!');
        return;
      }
      if (!applicationReasons.first.trim()) {
        alert('1지망 역할에 지원하는 이유를 적어주세요!');
        return;
      }
      // Generate simulated classmates when moving to Step 5
      const generatedClassmates = generateClassmates(24, rolePool);
      setClassmates(generatedClassmates);
    }
    if (step === 5) {
      // Moving to modification step
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

  // Step 2 helper: Generate Roles based on selected problems
  const generateRolesFromProblems = async () => {
    // If roles are already generated and not empty, don't overwrite unless user wants to.
    if (rolePool.length > 0) return;

    setIsGeneratingRoles(true);
    let generated: Role[] = [];

    // Prepopulate some default matching roles
    const problemKeys = selectedProblems.length > 0 ? selectedProblems : ['trash', 'lights', 'floor'];
    problemKeys.forEach((key, index) => {
      const match = DEFAULT_ROLES_MAP[key];
      if (match) {
        match.forEach((r, idx) => {
          generated.push({
            id: `role-${key}-${idx}-${index}`,
            name: r.name,
            job: r.job,
            reason: r.reason
          });
        });
      }
    });

    // Handle custom problem if typed
    if (customProblem.trim()) {
      generated.push({
        id: 'role-custom-p',
        name: '우리 반 특수 도우미',
        job: `[${customProblem}] 문제와 관련해 교실을 스스로 정돈하고 청결하게 돌보는 활동을 해요.`,
        reason: `학급에서 발견된 '${customProblem}' 문제를 책임지고 성실히 해결해 나가기 위해서예요.`
      });
    }

    // Ensure at least 4 roles
    if (generated.length < 4) {
      const allKeys = Object.keys(DEFAULT_ROLES_MAP);
      for (const k of allKeys) {
        if (!problemKeys.includes(k)) {
          const match = DEFAULT_ROLES_MAP[k][0];
          generated.push({
            id: `role-fill-${k}`,
            name: match.name,
            job: match.job,
            reason: match.reason
          });
          if (generated.length >= 4) break;
        }
      }
    }

    setRolePool(generated);
    setIsGeneratingRoles(false);
  };

  // Ask AI to generate creative roles based on selected problems
  const handleAskAIRoles = async () => {
    setIsGeneratingRoles(true);
    const problemsText = [
      ...selectedProblems.map(id => PROBLEM_LIST.find(p => p.id === id)?.title),
      customProblem ? `직접 입력한 문제: ${customProblem}` : ''
    ].filter(Boolean).join(', ');

    try {
      const systemPrompt = `당신은 초등학교 3~4학년 학급 경영을 돕는 친절한 AI 조수 '아리'입니다.
학생들이 선택한 학급 문제점들을 해결하기 위한 귀엽고 창의적인 1인 1역할을 4~5개 추천해주세요.
반드시 아래 JSON 배열 형식으로만 응답하며, 앞뒤에 다른 말이나 \`\`\`json 기호를 포함하지 말아주세요.
JSON 포맷:
[
  {
    "name": "역할 이름",
    "job": "어린이가 알아듣기 쉬운 말로, 매일 실천할 구체적인 활동 내용",
    "reason": "왜 이 역할이 교실에 필요한지 어린이가 납득할 수 있는 친근한 이유"
  }
]`;
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `우리 반의 문제점: ${problemsText}` }
      ];

      const res = await sendMessageToAPI(messages as any);
      
      // Clean backticks or markdown JSON wrapper
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
          reason: r.reason || '우리 학급의 쾌적한 환경을 유지하기 위해서예요.'
        }));
        setRolePool(mappedRoles);
      } else {
        throw new Error('Not a valid array');
      }
    } catch (error) {
      console.error('AI Role Generation Error:', error);
      alert('AI가 바쁜 것 같아요! 기본 생활 도우미 역할 목록으로 먼저 채워줄게요. 대신 우리가 직접 역할을 만들어 추가할 수도 있어요!');
      // Trigger default fallback roles
      generateRolesFromProblems();
    } finally {
      setIsGeneratingRoles(false);
    }
  };

  // Add a user custom role in Step 2
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
      isCustom: true
    };
    setRolePool(prev => [...prev, newRole]);
    setNewRoleName('');
    setNewRoleJob('');
    setNewRoleReason('');
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

  // Step 3: Handle Fit Test Rating Question
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

  // Step 4: AI Draft Helper for Application Reasons
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

    // Add user application
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

    // Add classmates
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

  // Step 6: Modifications logic
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

    // Dynamic reaction: 2-3 classmates shift choices away from very high competition roles
    // to less competitive ones to increase their chances. This makes the simulation feel alive!
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
    const roleCapacities = calculateDynamicCapacities(allStudentsList, rolePool);

    const updatedClassmates = classmates.map((mate) => {
      // 10% chance for some classmates to change their choices if their 1지망 is extremely overcrowded
      const firstRoleCount = stats[mate.applications.first]?.first || 0;
      const capacity = roleCapacities[mate.applications.first] || 1;
      if (firstRoleCount > capacity + 1 && Math.random() < 0.3) {
        // Find under-populated roles
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

  // Step 7: Allocation Trigger
  const handleExecuteAllocation = () => {
    setIsAssigning(true);
    
    // Create Student objects
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
      const matchResult = runMatchAlgorithm(allStudentsList, rolePool);
      setAssignments(matchResult.assignments);
      setMatchDetails(matchResult.details);
      setAssignmentsCapacities(matchResult.roleCapacities);
      setIsAssigning(false);
      nextStep();
    }, 3000); // 3-second fun animation delay
  };

  // Reset the process
  const handleReset = () => {
    setStep(0);
    setStudentName('');
    setSelectedProblems([]);
    setCustomProblem('');
    setRolePool([]);
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

  return (
    <div className="role-flow-layout">
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
              <p className="stage-desc">친구들과 학급 역할을 고르기 전에 이름과 성별, 학년을 입력해볼까?</p>
              
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

              <div className="stage-footer-actions">
                <button className="btn-next" onClick={nextStep} disabled={!studentName.trim()}>
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
                {PROBLEM_LIST.map(p => {
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
                <input
                  type="text"
                  className="cute-input"
                  value={customProblem}
                  onChange={(e) => setCustomProblem(e.target.value)}
                  placeholder="예: 보드게임 상자가 엉망으로 섞여 있어요 (직접 적어보세요)"
                  maxLength={40}
                />
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
                  고민 해결 역할 만들기 <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: RECOMMENDED ROLES & CUSTOM ADDITION */}
          {step === 2 && (
            <div className="stage-content animate-slide-in">
              <h2 className="stage-title">💡 우리 반에 추천하는 해결사 역할</h2>
              <p className="stage-desc">골라준 문제들을 바탕으로 만들어진 역할이에요. 마음에 안 드는 것은 빼고, 새 역할을 추가해보세요.</p>

              <div className="ai-assist-box">
                <div className="ai-assist-badge">아리의 마법</div>
                <p>AI 조수가 특별히 더 창의적이고 재미있는 해결사 역할을 추천해주길 바라나요?</p>
                <button 
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

              <h3 className="sub-section-title">📦 현재 역할 목록 (최소 4개 필요)</h3>
              
              {isGeneratingRoles ? (
                <div className="loading-placeholder">
                  <div className="bouncing-chick">🐣</div>
                  <p>역할을 예쁘게 다듬는 중이에요. 조금만 기다려주세요...</p>
                </div>
              ) : (
                <div className="roles-pool-grid">
                  {rolePool.map(role => (
                    <div key={role.id} className="role-pool-card">
                      <div className="role-pool-header">
                        <h4>⭐ {role.name}</h4>
                        <button className="btn-delete-role" onClick={() => removeRole(role.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="role-pool-body">
                        <p className="role-job"><strong>할 일:</strong> {role.job}</p>
                        <p className="role-reason"><strong>이유:</strong> {role.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Custom Role Section */}
              <div className="custom-role-builder">
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
                  나와의 적합도 알아보기 <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ROLE EXPLORATION & SUITABILITY TEST */}
          {step === 3 && (
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

          {/* STEP 4: PREFERENCE APPLICATION (지망 및 이유) */}
          {step === 4 && (
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
                          <option key={r.id} value={r.id}>{r.name} (적합도: {calculateStars(r.id)}★)</option>
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
                          <option key={r.id} value={r.id}>{r.name} (적합도: {calculateStars(r.id)}★)</option>
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
                          <option key={r.id} value={r.id}>{r.name} (적합도: {calculateStars(r.id)}★)</option>
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

          {/* STEP 5: VIEW STATISTICS & COMPETITION (경쟁률 확인) */}
          {step === 5 && (
            <div className="stage-content animate-slide-in">
              <h2 className="stage-title">📊 우리 반 친구들의 실시간 지원 통계</h2>
              <p className="stage-desc">가상 친구 24명을 포함해 총 25명의 1지망 지원 현황입니다. 각 역할을 클릭해서 경쟁자 명단과 지원 이유를 살펴보세요.</p>

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
                const roleCapacities = calculateDynamicCapacities(allStudentsList, rolePool);

                return (
                  <div className="stats-layout">
                    {/* Stat Bars */}
                    <div className="stats-charts-list">
                      {rolePool.map(role => {
                        const roleStat = stats[role.id] || { first: 0, second: 0, third: 0, total: 0 };
                        const firstChoiceCount = roleStat.first;
                        const capacity = roleCapacities[role.id] || 1;
                        const isOverCapacity = firstChoiceCount > capacity;
                        const compRate = (firstChoiceCount / capacity).toFixed(1);

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

          {/* STEP 6: ONE-TIME MODIFICATION STEP (지망 수정 기회) */}
          {step === 6 && (
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
                        <option key={r.id} value={r.id}>{r.name} (적합도: {calculateStars(r.id)}★)</option>
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
                        <option key={r.id} value={r.id}>{r.name} (적합도: {calculateStars(r.id)}★)</option>
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
                        <option key={r.id} value={r.id}>{r.name} (적합도: {calculateStars(r.id)}★)</option>
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

          {/* STEP 7: ALLOCATION RUNNING ANIMATION */}
          {step === 7 && (
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
                  <p className="assigning-text-status">🐣 알이가 공평하고 정밀하게 매칭 주사위를 굴리고 있어요! 🐣</p>
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

          {/* STEP 8: FINAL RESULT & CERTIFICATE / PLEDGE */}
          {step === 8 && (
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
                    <div className="pledge-section no-print">
                      <h3>🪴 나의 다짐 약속 적기</h3>
                      <p>이 역할을 멋지게 수행하기 위해 지킬 다짐을 한마디 적어줘!</p>
                      
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

                    {/* 🏫 CLASSROOM ROLE PLACEMENT BOARD */}
                    <div className="class-placement-board no-print">
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
                                  ({assignedToThisRole.length}/{assignmentsCapacities[r.id] || 1}명)
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
    </div>
  );
};
