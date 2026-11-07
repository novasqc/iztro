import './style.css';
import { astro, data } from 'iztro';
import { LunarYear } from 'lunar-typescript';

type StarLike = { name: string; brightness?: string; mutagen?: string };
type PalaceLike = {
  index: number;
  name: string;
  isBodyPalace: boolean;
  isOriginalPalace: boolean;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: StarLike[];
  minorStars: StarLike[];
  adjectiveStars: StarLike[];
  decadal: { range: [number, number] };
};
type ChartLike = {
  gender: string;
  solarDate: string;
  lunarDate: string;
  chineseDate: string;
  time: string;
  timeRange: string;
  sign: string;
  zodiac: string;
  earthlyBranchOfSoulPalace: string;
  earthlyBranchOfBodyPalace: string;
  soul: string;
  body: string;
  fiveElementsClass: string;
  palaces: PalaceLike[];
  copyright: string;
};

const HOUR_NAMES = [
  '早子时',
  '丑时',
  '寅时',
  '卯时',
  '辰时',
  '巳时',
  '午时',
  '未时',
  '申时',
  '酉时',
  '戌时',
  '亥时',
  '晚子时',
];

const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];

const PALACE_PLACE: Record<number, { row: number; column: number }> = {
  0: { row: 4, column: 1 },
  1: { row: 3, column: 1 },
  2: { row: 2, column: 1 },
  3: { row: 1, column: 1 },
  4: { row: 1, column: 2 },
  5: { row: 1, column: 3 },
  6: { row: 1, column: 4 },
  7: { row: 2, column: 4 },
  8: { row: 3, column: 4 },
  9: { row: 4, column: 4 },
  10: { row: 4, column: 3 },
  11: { row: 4, column: 2 },
};

const RING_ORDER = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];

const MUTAGEN_CLASS: Record<string, string> = {
  禄: 'lu',
  权: 'quan',
  科: 'ke',
  忌: 'ji',
};

const form = document.querySelector<HTMLFormElement>('#chart-form');
const solarFields = document.querySelector<HTMLElement>('#solar-fields');
const lunarFields = document.querySelector<HTMLElement>('#lunar-fields');
const solarDateInput = document.querySelector<HTMLInputElement>('#solar-date');
const lunarYearInput = document.querySelector<HTMLInputElement>('#lunar-year');
const lunarMonthInput = document.querySelector<HTMLSelectElement>('#lunar-month');
const lunarDayInput = document.querySelector<HTMLInputElement>('#lunar-day');
const lunarLeapInput = document.querySelector<HTMLInputElement>('#lunar-leap');
const timeInput = document.querySelector<HTMLSelectElement>('#time-index');
const timeHint = document.querySelector<HTMLElement>('#time-hint');
const lateRatInput = document.querySelector<HTMLInputElement>('#late-rat-same-day');
const errorBox = document.querySelector<HTMLElement>('#form-error');
const resultBox = document.querySelector<HTMLElement>('#result');
const exampleButton = document.querySelector<HTMLButtonElement>('#fill-example');

if (
  !form ||
  !solarFields ||
  !lunarFields ||
  !solarDateInput ||
  !lunarYearInput ||
  !lunarMonthInput ||
  !lunarDayInput ||
  !lunarLeapInput ||
  !timeInput ||
  !timeHint ||
  !lateRatInput ||
  !errorBox ||
  !resultBox ||
  !exampleButton
) {
  throw new Error('排盘页面结构不完整。');
}

if (HOUR_NAMES.length !== data.TIME_RANGE.length || HOUR_NAMES.length !== data.CHINESE_TIME.length) {
  throw new Error('时辰列表与排盘库不一致。');
}

LUNAR_MONTHS.forEach((name, index) => {
  const option = document.createElement('option');
  option.value = String(index + 1);
  option.textContent = `${name}月`;
  lunarMonthInput.append(option);
});

HOUR_NAMES.forEach((name, index) => {
  const option = document.createElement('option');
  option.value = String(index);
  option.textContent = `${name}（${data.TIME_RANGE[index]}）`;
  timeInput.append(option);
});

const selectedCalendar = (): 'solar' | 'lunar' => {
  const selected = form.querySelector<HTMLInputElement>('input[name="calendar"]:checked');
  return selected?.value === 'lunar' ? 'lunar' : 'solar';
};

const syncCalendarFields = (): void => {
  const lunar = selectedCalendar() === 'lunar';
  solarFields.hidden = lunar;
  lunarFields.hidden = !lunar;
};

const showTimeHint = (): void => {
  const index = Number(timeInput.value);
  if (!Number.isInteger(index) || index < 0 || index > 12) {
    timeHint.textContent = '请按钟表时间选择。本页不能把出生地经度换算成真太阳时。';
    return;
  }
  const range = data.TIME_RANGE[index];
  if (index === 12 && !lateRatInput.checked) {
    timeHint.textContent = `${HOUR_NAMES[index]}是 ${range}。默认按次日早子时排盘，公历生日仍保留你选的这一天。`;
    return;
  }
  if (index === 12) {
    timeHint.textContent = `${HOUR_NAMES[index]}是 ${range}。你已选择晚子时仍算当天。`;
    return;
  }
  timeHint.textContent = `${HOUR_NAMES[index]}对应钟表 ${range}。这不是真太阳时。`;
};

const showError = (message: string): void => {
  errorBox.hidden = false;
  errorBox.textContent = message;
  resultBox.hidden = true;
  errorBox.focus();
};

const clearError = (): void => {
  errorBox.hidden = true;
  errorBox.textContent = '';
};

const friendlyError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('invalid lunar date')) {
    return '这个农历日期不存在。请检查年份、月份和日期，例如小月没有三十。';
  }
  if (message.includes('invalid solar date') || message.includes('invalid date')) {
    return '这个公历日期无效。1582年10月5日至14日在历法切换中不存在，也不能填写不存在的月日。';
  }
  if (message.includes('invalid gender')) return '请选择性别。';
  if (message.includes('invalid timeIndex')) return '请选择出生时辰。';
  return '没能排成这张盘。请检查日期、性别和时辰后再试。';
};

const readInteger = (value: string): number | undefined => {
  if (!/^\d+$/.test(value.trim())) return undefined;
  return Number(value.trim());
};

const buildChart = (): ChartLike => {
  const genderInput = form.querySelector<HTMLInputElement>('input[name="gender"]:checked');
  const gender = genderInput?.value;
  if (gender !== '男' && gender !== '女') {
    throw new Error('请选择性别。');
  }
  const timeIndex = Number(timeInput.value);
  if (!Number.isInteger(timeIndex) || timeIndex < 0 || timeIndex > 12) {
    throw new Error('请选择出生时辰。');
  }

  const calendar = selectedCalendar();
  let dateStr = '';
  let isLeapMonth = false;
  if (calendar === 'solar') {
    dateStr = solarDateInput.value;
    if (!dateStr) throw new Error('请填写公历生日。');
  } else {
    const year = readInteger(lunarYearInput.value);
    const month = Number(lunarMonthInput.value);
    const day = readInteger(lunarDayInput.value);
    if (year === undefined || year < 1 || year > 9999) throw new Error('请填写 1 到 9999 之间的农历年份。');
    if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('请选择农历月份。');
    if (day === undefined || day < 1 || day > 30) throw new Error('农历日期要填 1 到 30 之间的整数。');
    isLeapMonth = lunarLeapInput.checked;
    if (isLeapMonth) {
      const leapMonth = LunarYear.fromYear(year).getLeapMonth();
      const monthName = LUNAR_MONTHS[month - 1];
      if (leapMonth === 0) {
        throw new Error(`农历${year}年没有闰月。请取消“这一天在闰月”。`);
      }
      if (leapMonth !== month) {
        throw new Error(`农历${year}年的闰月是闰${LUNAR_MONTHS[leapMonth - 1]}月，不是闰${monthName}月。`);
      }
    }
    dateStr = `${year}-${month}-${day}`;
  }

  return astro.withOptions({
    type: calendar,
    dateStr,
    timeIndex,
    gender,
    isLeapMonth,
    fixLeap: true,
    language: 'zh-CN',
    config: {
      language: 'zh-CN',
      dayDivide: lateRatInput.checked ? 'current' : 'forward',
    },
  }) as ChartLike;
};

const appendStars = (parent: HTMLElement, stars: StarLike[], kind: string): void => {
  stars.forEach((star) => {
    const item = document.createElement('span');
    item.className = `star ${kind}`;
    const name = document.createElement('span');
    name.className = 'star-name';
    name.textContent = star.name;
    item.append(name);
    if (star.brightness) {
      const brightness = document.createElement('span');
      brightness.className = 'brightness';
      brightness.textContent = star.brightness;
      item.append(brightness);
    }
    if (star.mutagen) {
      const mutagen = document.createElement('span');
      mutagen.className = `mutagen ${MUTAGEN_CLASS[star.mutagen] ?? ''}`.trim();
      mutagen.textContent = `化${star.mutagen}`;
      item.append(mutagen);
    }
    parent.append(item);
  });
};

const createPalace = (palace: PalaceLike): HTMLElement => {
  const card = document.createElement('article');
  card.className = 'palace';
  if (palace.name === '命宫') card.classList.add('soul');
  if (palace.isBodyPalace) card.classList.add('body');
  card.dataset.palace = palace.name;
  const place = PALACE_PLACE[palace.index];
  if (place) card.classList.add(`at-${palace.index}`);

  const heading = document.createElement('header');
  const title = document.createElement('h3');
  title.textContent = palace.name;
  heading.append(title);
  if (palace.isBodyPalace) {
    const badge = document.createElement('span');
    badge.className = 'badge body-badge';
    badge.textContent = '身宫';
    heading.append(badge);
  }
  if (palace.isOriginalPalace) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = '来因';
    heading.append(badge);
  }
  card.append(heading);

  const stem = document.createElement('p');
  stem.className = 'stem';
  stem.textContent = `${palace.heavenlyStem}${palace.earthlyBranch}`;
  card.append(stem);

  const majors = document.createElement('div');
  majors.className = 'stars majors';
  if (palace.majorStars.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'empty-star';
    empty.textContent = '无主星';
    majors.append(empty);
  } else {
    appendStars(majors, palace.majorStars, 'major');
  }
  card.append(majors);

  if (palace.minorStars.length > 0) {
    const minors = document.createElement('div');
    minors.className = 'stars minors';
    appendStars(minors, palace.minorStars, 'minor');
    card.append(minors);
  }

  if (palace.adjectiveStars.length > 0) {
    const adjectives = document.createElement('div');
    adjectives.className = 'stars adjectives';
    appendStars(adjectives, palace.adjectiveStars, 'adjective');
    card.append(adjectives);
  }

  const decadal = document.createElement('p');
  decadal.className = 'decadal';
  decadal.textContent = `大限 ${palace.decadal.range[0]}–${palace.decadal.range[1]} 岁`;
  card.append(decadal);
  return card;
};

const renderChart = (chart: ChartLike): void => {
  resultBox.replaceChildren();
  const timeIndex = Number(timeInput.value);
  const summary = document.createElement('div');
  summary.className = 'summary';
  summary.id = 'chart-summary';

  const title = document.createElement('h2');
  title.textContent = '十二宫命盘';
  summary.append(title);

  const note = document.createElement('p');
  note.className = 'note';
  if (timeIndex === 12 && !lateRatInput.checked) {
    note.textContent = '晚子时已按次日排盘。下面的公历日期仍是你输入的那一天，农历和星曜与次日早子时一致。';
  } else if (timeIndex === 12) {
    note.textContent = '晚子时按当天计算，没有进到次日。';
  } else {
    note.textContent = '可以改上面的日期或时辰，再点一次“生成命盘”。';
  }
  summary.append(note);

  const facts = document.createElement('dl');
  facts.className = 'facts';
  const rows: Array<[string, string]> = [
    ['性别', chart.gender],
    ['公历', chart.solarDate],
    ['农历', chart.lunarDate],
    ['四柱', chart.chineseDate],
    ['时辰', `${chart.time} ${chart.timeRange}`],
    ['生肖', chart.zodiac],
    ['星座', chart.sign],
    ['命宫', chart.earthlyBranchOfSoulPalace],
    ['身宫', chart.earthlyBranchOfBodyPalace],
    ['命主', chart.soul],
    ['身主', chart.body],
    ['五行局', chart.fiveElementsClass],
  ];
  rows.forEach(([label, value]) => {
    const pair = document.createElement('div');
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = value;
    pair.append(term, detail);
    facts.append(pair);
  });
  summary.append(facts);
  resultBox.append(summary);

  const grid = document.createElement('div');
  grid.className = 'chart-grid';
  grid.setAttribute('aria-label', '十二宫盘面');
  chart.palaces.forEach((palace) => grid.append(createPalace(palace)));
  const center = document.createElement('div');
  center.className = 'center';
  const centerTitle = document.createElement('p');
  centerTitle.className = 'center-title';
  centerTitle.textContent = `${chart.fiveElementsClass} · ${chart.zodiac}`;
  const centerBody = document.createElement('p');
  centerBody.textContent = `命宫${chart.earthlyBranchOfSoulPalace} · 身宫${chart.earthlyBranchOfBodyPalace}`;
  const centerDate = document.createElement('p');
  centerDate.textContent = chart.lunarDate;
  center.append(centerTitle, centerBody, centerDate);
  grid.append(center);
  resultBox.append(grid);

  const list = document.createElement('div');
  list.className = 'palace-list';
  const listTitle = document.createElement('h3');
  listTitle.textContent = '逐宫查看';
  list.append(listTitle);
  RING_ORDER.forEach((index) => {
    const palace = chart.palaces.find((item) => item.index === index);
    if (palace) list.append(createPalace(palace));
  });
  resultBox.append(list);

  const copyright = document.createElement('p');
  copyright.className = 'copyright';
  copyright.textContent = chart.copyright;
  resultBox.append(copyright);
  resultBox.hidden = false;
  resultBox.scrollIntoView({ block: 'start' });
};

const generate = (): void => {
  try {
    clearError();
    renderChart(buildChart());
  } catch (error) {
    const message = error instanceof Error && !error.message.startsWith('invalid') ? error.message : friendlyError(error);
    showError(message || friendlyError(error));
  }
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  generate();
});

form.querySelectorAll<HTMLInputElement>('input[name="calendar"]').forEach((input) => {
  input.addEventListener('change', syncCalendarFields);
});
timeInput.addEventListener('change', showTimeHint);
lateRatInput.addEventListener('change', showTimeHint);

exampleButton.addEventListener('click', () => {
  const solar = form.querySelector<HTMLInputElement>('input[name="calendar"][value="solar"]');
  const female = form.querySelector<HTMLInputElement>('input[name="gender"][value="女"]');
  if (solar) solar.checked = true;
  if (female) female.checked = true;
  solarDateInput.value = '2000-08-16';
  lunarLeapInput.checked = false;
  lateRatInput.checked = false;
  timeInput.value = '2';
  syncCalendarFields();
  showTimeHint();
  generate();
});

syncCalendarFields();
showTimeHint();
