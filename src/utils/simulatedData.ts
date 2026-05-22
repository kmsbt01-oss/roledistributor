export interface Classmate {
  id: string;
  name: string;
  gender: 'boy' | 'girl';
  applications: {
    first: string;
    second: string;
    third: string;
  };
  suitability: Record<string, number>; // roleId -> score (0 to 100)
  reasons: {
    first: string;
    second: string;
    third: string;
  };
  pledge?: string;
}

const BOY_NAMES = ['민준', '예준', '주원', '도윤', '시우', '지호', '지후', '준서', '건우', '우진', '선우', '현우', '민재', '연우', '준우', '정우'];
const GIRL_NAMES = ['서연', '서윤', '지우', '하은', '윤서', '채원', '민서', '서현', '수아', '다은', '예은', '지아', '지원', '수빈', '소율', '예원'];

const GENERIC_REASONS = [
  "우리 반을 위해 제가 할 수 있는 일을 찾아서 끝까지 책임감 있게 해내고 싶어요!",
  "평소에 꼼꼼한 성격이라 이 역할을 잘 수행할 수 있을 것 같아요.",
  "친구들이 깨끗하고 기분 좋은 교실에서 공부할 수 있게 돕고 싶어서 지원했습니다.",
  "제가 조금 귀찮더라도 매일 성실히 노력해서 우리 반을 빛내고 싶어요!",
  "어려워 보이지만 새로운 일을 도전해보고 배우고 싶은 마음이 큽니다."
];

const ROLE_SPECIFIC_REASONS: Record<string, string[]> = {
  "칠판": [
    "칠판이 깨끗하면 선생님도 친구들도 수업할 때 기분이 아주 좋을 것 같아서 칠판을 윤기 나게 닦아보고 싶어요!",
    "선생님이 수업 끝나고 바쁘실 때 제가 대신 칠판을 깨끗이 지워드리는 듬직한 도우미가 되겠습니다.",
    "친구들이 다음 수업을 깨끗하게 시작할 수 있도록 칠판을 관리하고 싶어요."
  ],
  "에너지": [
    "낭비되는 전등 불빛이나 선풍기를 끄는 에너지를 절약해서 지구와 우리 학교를 지키고 싶습니다!",
    "친구들이 교실을 비울 때 제가 꼼꼼하게 불이 켜져 있는지 확인하고 끄겠습니다.",
    "에너지를 아끼는 습관을 기르고 우리 반의 전력 낭비를 막고 싶어요."
  ],
  "분리수거": [
    "분리수거함 주변이 지저분한 것을 보면 마음이 안 좋았어요. 제가 깔끔하게 매일 정리하겠습니다!",
    "페트병이랑 플라스틱을 올바르게 분리배출해서 우리 반 쓰레기 처리를 돕고 싶어요.",
    "정리정돈을 좋아하는 성격을 살려 쓰레기 분리수거함을 가장 깨끗하게 관리해보겠습니다."
  ],
  "창문": [
    "미세먼지가 심하거나 비가 올 때 창문을 꼼꼼하게 닫아서 교실 공기와 안전을 지키고 싶어요!",
    "체육 시간이나 쉬는 시간 끝난 뒤 환기를 잘 시켜서 맑은 공기 속에서 공부할 수 있게 돕겠습니다.",
    "바람이 너무 세게 불거나 할 때 창문 단속을 철저히 해서 교실 온도를 지킬게요."
  ],
  "바닥": [
    "지우개 가루나 종이 조각이 뒹구는 바닥을 보면 빗자루로 싹 쓸어서 매일 깨끗한 바닥을 만들고 싶어요!",
    "친구들이 쾌적한 교실 바닥에서 뒹굴거나 뛰어놀 수 있도록 바닥 청소 대장이 되겠습니다.",
    "청소하는 시간을 좋아해서 우리 반 바닥을 가장 깨끗하게 유지해보고 싶어요."
  ],
  "도서": [
    "책꽂이의 책들이 뒤섞여 있으면 책을 찾기 힘들어요. 번호나 크기대로 예쁘게 정리해두겠습니다!",
    "책 읽는 것을 아주 좋아해서, 친구들에게 재미있는 책을 추천해주고 책꽂이도 예쁘게 관리하고 싶어요.",
    "매일 쉬는 시간마다 책장 정리를 꼼꼼하게 해서 깔끔한 독서 공간을 유지하겠습니다."
  ],
  "식물": [
    "식물을 아주 좋아해요! 물을 제때 주어서 시들지 않고 예쁜 초록색 잎이 무럭무럭 자라게 할게요.",
    "화분에 싹이 트고 꽃이 피는 과정을 관찰하는 것이 좋아서 화분 돌보기 역할을 꼭 해보고 싶습니다.",
    "매일 아침 교실에 오자마자 식물들의 건강을 살피고 물을 주는 다정한 식물 집사가 되겠습니다."
  ],
  "우유": [
    "아침에 배달된 우유를 친구들이 번호대로 쉽고 편하게 가져갈 수 있도록 줄을 예쁘게 세워둘게요!",
    "우유 상자가 무거울 수도 있지만, 힘이 센 제가 씩씩하게 배달 상자를 정돈해보고 싶습니다.",
    "우유를 매일 마시는 친구들이 기분 좋게 하루를 시작할 수 있게 정돈하겠습니다."
  ]
};

export const generateClassmates = (
  count: number,
  rolePool: Array<{ id: string; name: string }>
): Classmate[] => {
  const classmates: Classmate[] = [];
  
  // Create mixed genders
  const shuffledBoys = [...BOY_NAMES].sort(() => 0.5 - Math.random());
  const shuffledGirls = [...GIRL_NAMES].sort(() => 0.5 - Math.random());
  
  for (let i = 0; i < count; i++) {
    const isBoy = i % 2 === 0;
    const baseName = isBoy 
      ? shuffledBoys[Math.floor(i / 2) % shuffledBoys.length]
      : shuffledGirls[Math.floor(i / 2) % shuffledGirls.length];
    
    // Add unique suffix if we exceed standard array length
    const duplicationFactor = Math.floor(i / 2 / 16);
    const suffix = duplicationFactor > 0 ? String(duplicationFactor + 1) : '';
    const name = baseName + suffix;
    
    // Choose 3 distinct roles randomly
    const shuffledRoles = [...rolePool].sort(() => 0.5 - Math.random());
    const firstRole = shuffledRoles[0]?.id || '';
    const secondRole = shuffledRoles[1]?.id || '';
    const thirdRole = shuffledRoles[2]?.id || '';
    
    // Suitability dictionary
    const suitability: Record<string, number> = {};
    rolePool.forEach(role => {
      // Random suitability score between 40 and 100
      suitability[role.id] = Math.floor(Math.random() * 61) + 40;
    });

    const getReason = (roleName: string) => {
      let reasonPool = GENERIC_REASONS;
      for (const keyword of Object.keys(ROLE_SPECIFIC_REASONS)) {
        if (roleName.includes(keyword)) {
          reasonPool = ROLE_SPECIFIC_REASONS[keyword];
          break;
        }
      }
      return reasonPool[Math.floor(Math.random() * reasonPool.length)];
    };

    const reasons = {
      first: firstRole ? getReason(rolePool.find(r => r.id === firstRole)?.name || '') : '',
      second: secondRole ? getReason(rolePool.find(r => r.id === secondRole)?.name || '') : '',
      third: thirdRole ? getReason(rolePool.find(r => r.id === thirdRole)?.name || '') : ''
    };

    classmates.push({
      id: `classmate-${i + 1}`,
      name,
      gender: isBoy ? 'boy' : 'girl',
      applications: {
        first: firstRole,
        second: secondRole,
        third: thirdRole
      },
      suitability,
      reasons
    });
  }

  return classmates;
};
