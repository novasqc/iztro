export type ReadingStar = {
  name: string;
  brightness?: string;
  mutagen?: string;
};

export type ReadingPalace = {
  index: number;
  name: string;
  isBodyPalace: boolean;
  majorStars: ReadingStar[];
  minorStars: ReadingStar[];
  adjectiveStars: ReadingStar[];
};

export type ReadingChart = {
  solarDate: string;
  palaces: ReadingPalace[];
};

export type ReadingEvidence = {
  palace: string;
  relation: '本宫' | '身宫' | '对宫参照';
  stars: ReadingStar[];
};

export type ReadingSection = {
  id: 'personality' | 'career' | 'money' | 'relation' | 'inner';
  title: string;
  summary: string;
  evidence: ReadingEvidence[];
};

export type ChartReading = {
  minor: boolean;
  notice: string;
  sections: ReadingSection[];
};

const MAJOR_TRAIT: Record<string, string> = {
  紫微: '在意统筹，喜欢先把事情的位置和顺序定下来',
  天机: '想得细，习惯先盘算再行动',
  太阳: '愿意向外说明，在意事情有没有被看见',
  武曲: '看重可执行的结果，倾向把资源算清楚',
  天同: '在意气氛是否和缓，希望少些硬碰硬',
  廉贞: '心里有自己的规矩，遇到含糊会想先划清',
  天府: '倾向先留出余地，再慢慢安排',
  太阴: '感受细，很多判断先在心里过一遍',
  贪狼: '容易被新的兴趣带动，想多试一种做法',
  巨门: '靠提问和分辨来理解，话会说得比较细',
  天相: '在意双方能不能接上，常站在配合的位置',
  天梁: '愿意给原则和照应，也在意事情是否说得通',
  七杀: '遇到事情倾向直接处理，不喜欢一直拖着',
  破军: '不满足于只维持现状，会想调整原来的做法',
};

const MINOR_TRAIT: Record<string, string> = {
  左辅: '旁边容易出现协助或补充',
  右弼: '事情常需要有人从旁接上',
  文昌: '文书、学习和书面表达的痕迹比较明显',
  文曲: '口头表达、才艺或灵活的说法比较明显',
  禄存: '在意把已经有的资源守住',
  天马: '走动、变动会比较多',
  擎羊: '行动或说话偏直接',
  陀罗: '会反复琢磨，节奏偏慢',
  火星: '反应来得快',
  铃星: '内心催促感比较明显',
  天魁: '容易遇到提点或被引荐的情境',
  天钺: '私下的帮助或引荐比较常被提到',
  地空: '想法容易跳开原来的安排',
  地劫: '既有计划容易被打断，需要再核对',
};

const NOTICE =
  '下面按这张盘实际出现的宫位、星曜、亮度和四化作传统文化象征说明，没有科学预测效力，不能代替投资、医疗或法律决定。不推断疾病、寿命和具体事件，也不断言感情或婚姻的结果。这里没有流年资料，所以不写今年运势。出生时间仍按你选择的钟表时辰，不含真太阳时或时区换算。';

const MINOR_NOTICE = '未满十八岁只写成观察和沟通建议，不贴固定人格、智力或职业命运标签。';

export const isUnder18 = (solarDate: string, asOf: Date): boolean => {
  const matched = /^(\d{1,4})-(\d{1,2})-(\d{1,2})$/.exec(solarDate.trim());
  if (!matched) return false;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const adultAt = new Date(year + 18, month - 1, day);
  const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  return today < adultAt;
};

const cleanStar = (star: ReadingStar): ReadingStar => ({
  name: star.name,
  brightness: star.brightness ? star.brightness : undefined,
  mutagen: star.mutagen ? star.mutagen : undefined,
});

const brightnessClause = (brightness?: string): string => {
  if (!brightness) return '';
  if (brightness === '庙' || brightness === '旺') {
    return `亮度是${brightness}，只表示这个特点比较容易显出来。`;
  }
  if (brightness === '不' || brightness === '陷') {
    return `亮度是${brightness}，只表示这个特点不那么外放，不是缺陷，也不表示事情变糟。`;
  }
  return `亮度是${brightness}，特点在，不必加重。`;
};

const mutagenClause = (star: ReadingStar): string => {
  if (star.mutagen === '禄') return `${star.name}化禄，表示“够用、顺手”的感觉更明显，不是收益保证。`;
  if (star.mutagen === '权') return `${star.name}化权，表示更想自己做主、把事情定下来。`;
  if (star.mutagen === '科') return `${star.name}化科，表示文书、学习或被看见的一面更常被提到。`;
  if (star.mutagen === '忌') return `${star.name}化忌，表示这个主题容易被反复核对，只说明在意，不说明结果好坏。`;
  return '';
};

const traitOf = (name: string): string | undefined => MAJOR_TRAIT[name] ?? MINOR_TRAIT[name];

const starSentence = (star: ReadingStar): string => {
  const trait = traitOf(star.name);
  if (!trait) return '';
  return `${star.name}的象征是${trait}。${brightnessClause(star.brightness)}${mutagenClause(star)}`;
};

const findPalace = (chart: ReadingChart, name: string): ReadingPalace | undefined =>
  chart.palaces.find((palace) => palace.name === name);

const oppositePalace = (chart: ReadingChart, palace: ReadingPalace): ReadingPalace | undefined =>
  chart.palaces.find((item) => item.index === (palace.index + 6) % 12);

const knownAndUnknown = (stars: ReadingStar[]): { known: ReadingStar[]; unknown: ReadingStar[] } => {
  const known: ReadingStar[] = [];
  const unknown: ReadingStar[] = [];
  stars.map(cleanStar).forEach((star) => {
    if (traitOf(star.name)) known.push(star);
    else unknown.push(star);
  });
  return { known, unknown };
};

const describePalace = (
  chart: ReadingChart,
  palace: ReadingPalace,
  relation: ReadingEvidence['relation'],
  minor: boolean,
  topicLead: string,
): { text: string; evidence: ReadingEvidence } => {
  const majors = palace.majorStars.map(cleanStar);
  const minors = knownAndUnknown(palace.minorStars);
  const adjectives = palace.adjectiveStars.map(cleanStar);
  const described = [...majors, ...minors.known].map(starSentence).filter(Boolean);
  const cited = [...majors, ...minors.known, ...minors.unknown];
  const sentences: string[] = [topicLead];

  if (majors.length === 0) {
    sentences.push(`${palace.name}没有主星。没有主星不是缺陷，也不表示这宫缺少内容。`);
    const opposite = oppositePalace(chart, palace);
    const oppositeMajors = opposite?.majorStars.map(cleanStar) ?? [];
    if (opposite && oppositeMajors.length > 0) {
      const names = oppositeMajors.map((star) => star.name).join('、');
      sentences.push(
        `对宫是${opposite.name}，实际主星是${names}。这里只标明对宫有这些星，不把它们写成${palace.name}自己的星。`,
      );
    }
  }

  if (described.length > 0) {
    sentences.push(minor ? `可以观察到：${described.join('')}` : described.join(''));
  }

  if (minors.unknown.length > 0) {
    const names = minors.unknown.map((star) => star.name).join('、');
    sentences.push(`另有辅星${names}，只列名，不另作解释。`);
  }

  if (majors.length === 0 && described.length === 0 && adjectives.length > 0) {
    const names = adjectives.map((star) => star.name).join('、');
    sentences.push(`本宫杂曜有${names}，只记录它们在场，不另作象征发挥。`);
    cited.push(...adjectives);
  }

  if (described.length === 0 && majors.length === 0 && minors.unknown.length === 0 && adjectives.length === 0) {
    sentences.push('本宫没有可引用的星曜，因此不下进一步判断。');
  }

  return {
    text: sentences.join(''),
    evidence: { palace: palace.name, relation, stars: cited },
  };
};

const personalityLead = (palaceName: string, minor: boolean, sameBody: boolean): string => {
  if (minor) {
    return sameBody
      ? `${palaceName}同时是身宫。未满十八岁不把这里写成固定性格，只看作待人、做事时可以一起观察的地方。`
      : `${palaceName}不写成固定性格，只看作待人、做事时可以观察的地方。`;
  }
  return sameBody
    ? `${palaceName}同时是身宫，看待人和做事的倾向，不是对人下判决。`
    : `${palaceName}看待人和做事的倾向，不是对人下判决。`;
};

const topicLead = (id: ReadingSection['id'], palaceName: string, minor: boolean): string => {
  if (id === 'career') {
    return minor
      ? `${palaceName}不写成未来职业，只看做事和安排事务的方式，方便沟通。`
      : `${palaceName}看事务和职责上的习惯，不是职业成败的判决。`;
  }
  if (id === 'money') {
    return `${palaceName}看使用和安排资源的习惯，不是发财或亏损的判断。`;
  }
  if (id === 'relation') {
    return palaceName === '夫妻'
      ? `${palaceName}看亲近关系里的相处方式，不断言感情或婚姻的结果。`
      : `${palaceName}看与同伴、协助者沟通时的方式。`;
  }
  return `${palaceName}看内在感受和自我安顿的方式，不是情绪或健康诊断。`;
};

const sectionFromPalaces = (
  chart: ReadingChart,
  id: ReadingSection['id'],
  title: string,
  names: string[],
  minor: boolean,
): ReadingSection => {
  const parts = names
    .map((name) => {
      const palace = findPalace(chart, name);
      if (!palace) return undefined;
      return describePalace(chart, palace, '本宫', minor, topicLead(id, name, minor));
    })
    .filter((part): part is { text: string; evidence: ReadingEvidence } => Boolean(part));

  if (parts.length === 0) {
    return {
      id,
      title,
      summary: '这张盘里没有找到对应宫位，因此这一段不编写解读。',
      evidence: [],
    };
  }

  return {
    id,
    title,
    summary: parts.map((part) => part.text).join(''),
    evidence: parts.map((part) => part.evidence),
  };
};

export const buildReading = (chart: ReadingChart, asOf: Date = new Date()): ChartReading => {
  const minor = isUnder18(chart.solarDate, asOf);
  const soul = findPalace(chart, '命宫');
  const body = chart.palaces.find((palace) => palace.isBodyPalace);
  const personalityParts: { text: string; evidence: ReadingEvidence }[] = [];

  if (soul) {
    personalityParts.push(
      describePalace(chart, soul, '本宫', minor, personalityLead(soul.name, minor, body?.name === soul.name)),
    );
  }
  if (body && body.name !== soul?.name) {
    personalityParts.push(
      describePalace(
        chart,
        body,
        '身宫',
        minor,
        minor
          ? `身宫在${body.name}，只表示精力常被放在这个位置，不写成职业或人格标签。`
          : `身宫在${body.name}，表示精力常被用在这个位置，仍不是判决。`,
      ),
    );
  }

  const personality: ReadingSection = {
    id: 'personality',
    title: minor ? '待人与做事的观察' : '性格与做事',
    summary:
      personalityParts.map((part) => part.text).join('') || '这张盘里没有找到命宫，因此这一段不编写解读。',
    evidence: personalityParts.map((part) => part.evidence),
  };

  return {
    minor,
    notice: minor ? `${NOTICE}${MINOR_NOTICE}` : NOTICE,
    sections: [
      personality,
      sectionFromPalaces(chart, 'career', '事业', ['官禄'], minor),
      sectionFromPalaces(chart, 'money', '财务习惯', ['财帛'], minor),
      sectionFromPalaces(chart, 'relation', '关系与沟通', ['夫妻', '仆役'], minor),
      sectionFromPalaces(chart, 'inner', '内在感受', ['福德'], minor),
    ],
  };
};
