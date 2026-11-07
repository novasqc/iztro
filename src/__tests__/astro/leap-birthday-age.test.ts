import { astro } from '../../index';

const birthdayChart = () =>
  astro.withOptions({
    type: 'solar',
    dateStr: '2000-3-20',
    timeIndex: 10,
    gender: '女',
    config: { ageDivide: 'birthday' },
  });

const leapBirthdayChart = () =>
  astro.withOptions({
    type: 'solar',
    dateStr: '2004-4-4',
    timeIndex: 6,
    gender: '女',
    config: { ageDivide: 'birthday' },
  });

const ageSnapshot = (chart: ReturnType<typeof birthdayChart>, solarDate: string) => {
  const horoscope = chart.horoscope(solarDate, 0);
  const decadalPalace = chart.palace(horoscope.decadal.index);
  const agePalace = chart.palace(horoscope.age.index);

  return {
    lunarDate: horoscope.lunarDate,
    nominalAge: horoscope.age.nominalAge,
    agePalace: agePalace?.name,
    decadalPalace: decadalPalace?.name,
    decadalRange: decadalPalace?.decadal.range,
    decadalStem: horoscope.decadal.heavenlyStem,
    palaceStem: decadalPalace?.heavenlyStem,
  };
};

describe('生日分界遇到闰月', () => {
  beforeEach(() => {
    astro.resetConfig();
  });

  test('平月二月十五进入闰二月后，虚岁、小限和大限不退回', () => {
    const chart = birthdayChart();

    expect(chart.lunarDate).toBe('二〇〇〇年二月十五');
    expect(chart.fiveElementsClass).toBe('金四局');

    const before = ageSnapshot(chart, '2023-3-5');
    const onBirthday = ageSnapshot(chart, '2023-3-6');
    const dayAfter = ageSnapshot(chart, '2023-3-7');
    const regularMonthEnd = ageSnapshot(chart, '2023-3-21');
    const leapFirst = ageSnapshot(chart, '2023-3-22');
    const leapSameDay = ageSnapshot(chart, '2023-4-5');
    const nextMonth = ageSnapshot(chart, '2023-4-20');

    expect(before).toMatchObject({
      lunarDate: '二〇二三年二月十四',
      nominalAge: 23,
      agePalace: '疾厄',
      decadalPalace: '兄弟',
      decadalRange: [14, 23],
    });
    expect(onBirthday.nominalAge).toBe(23);
    expect(onBirthday.decadalPalace).toBe('兄弟');
    expect(dayAfter).toMatchObject({
      lunarDate: '二〇二三年二月十六',
      nominalAge: 24,
      agePalace: '迁移',
      decadalPalace: '夫妻',
      decadalRange: [24, 33],
    });
    expect(regularMonthEnd.nominalAge).toBe(24);
    expect(leapFirst).toMatchObject({
      lunarDate: '二〇二三年闰二月初一',
      nominalAge: 24,
      agePalace: '迁移',
      decadalPalace: '夫妻',
      decadalRange: [24, 33],
    });
    expect(leapSameDay.lunarDate).toBe('二〇二三年闰二月十五');
    expect(leapSameDay.nominalAge).toBe(24);
    expect(leapSameDay.decadalPalace).toBe('夫妻');
    expect(nextMonth.nominalAge).toBe(24);
    expect(leapFirst.decadalStem).toBe(leapFirst.palaceStem);
    expect(astro.getConfig().ageDivide).toBe('normal');
  });

  test('闰二月十五在同年平月后半月不加岁，过了闰月生日才加岁', () => {
    const chart = leapBirthdayChart();

    expect(chart.lunarDate).toBe('二〇〇四年闰二月十五');
    expect(chart.fiveElementsClass).toBe('金四局');

    const regularSameDay = ageSnapshot(chart, '2023-3-6');
    const regularDayAfter = ageSnapshot(chart, '2023-3-7');
    const regularMonthEnd = ageSnapshot(chart, '2023-3-21');
    const leapFirst = ageSnapshot(chart, '2023-3-22');
    const onBirthday = ageSnapshot(chart, '2023-4-5');
    const dayAfter = ageSnapshot(chart, '2023-4-6');

    expect(regularSameDay).toMatchObject({ lunarDate: '二〇二三年二月十五', nominalAge: 19 });
    expect(regularDayAfter).toMatchObject({ lunarDate: '二〇二三年二月十六', nominalAge: 19 });
    expect(regularMonthEnd.nominalAge).toBe(19);
    expect(leapFirst).toMatchObject({ lunarDate: '二〇二三年闰二月初一', nominalAge: 19 });
    expect(onBirthday).toMatchObject({ lunarDate: '二〇二三年闰二月十五', nominalAge: 19 });
    expect(dayAfter).toMatchObject({
      lunarDate: '二〇二三年闰二月十六',
      nominalAge: 20,
      decadalRange: [14, 23],
    });
    expect(regularDayAfter.agePalace).toBe(regularSameDay.agePalace);
    expect(dayAfter.agePalace).not.toBe(onBirthday.agePalace);
  });

  test('没有对应闰月的年份仍按月和日比较，自然年分界不受影响', () => {
    const chart = birthdayChart();
    const leapBorn = leapBirthdayChart();

    expect(ageSnapshot(chart, '2022-3-17')).toMatchObject({ lunarDate: '二〇二二年二月十五', nominalAge: 22 });
    expect(ageSnapshot(chart, '2022-3-18')).toMatchObject({ lunarDate: '二〇二二年二月十六', nominalAge: 23 });
    expect(ageSnapshot(leapBorn, '2022-3-17').nominalAge).toBe(18);
    expect(ageSnapshot(leapBorn, '2022-3-18')).toMatchObject({ lunarDate: '二〇二二年二月十六', nominalAge: 19 });
    expect(ageSnapshot(leapBorn, '2024-3-24').nominalAge).toBe(20);
    expect(ageSnapshot(leapBorn, '2024-3-25').nominalAge).toBe(21);

    const natural = astro.withOptions({
      type: 'solar',
      dateStr: '2000-3-20',
      timeIndex: 10,
      gender: '女',
      config: { ageDivide: 'normal' },
    });

    expect(natural.horoscope('2023-3-21', 0).age.nominalAge).toBe(24);
    expect(natural.horoscope('2023-3-22', 0).age.nominalAge).toBe(24);
    expect(natural.horoscope('2023-4-6', 0).age.nominalAge).toBe(24);
  });
});
