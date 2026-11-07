import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import { buildReading, isUnder18, type ReadingChart, type ReadingSection } from './reading.ts';

const require = createRequire(import.meta.url);
const { astro } = require('../../../lib/index.js') as {
  astro: {
    bySolar: (date: string, timeIndex: number, gender: string) => ReadingChart & { lunarDate: string };
  };
};

const AS_OF = new Date(2026, 10, 7);
const SCARE = /灾祸|破产|死亡|夭折|离婚|破裂|克夫|克妻|绝症|大凶|倒霉/;

const chartOf = (date: string, timeIndex: number, gender: string): ReadingChart =>
  astro.bySolar(date, timeIndex, gender);

const section = (chart: ReadingChart, id: ReadingSection['id'], asOf = AS_OF): ReadingSection => {
  const found = buildReading(chart, asOf).sections.find((item) => item.id === id);
  assert.ok(found);
  return found;
};

const starsIn = (chart: ReadingChart, palaceName: string) => {
  const palace = chart.palaces.find((item) => item.name === palaceName);
  assert.ok(palace);
  return [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars];
};

describe('传统命盘解读', () => {
  it('不同命盘的解读不同，并且依据星曜确实在该宫', () => {
    const first = chartOf('2000-8-16', 2, '女');
    const second = chartOf('1988-5-20', 2, '女');
    const readingA = buildReading(first, AS_OF);
    const readingB = buildReading(second, AS_OF);
    assert.notEqual(
      readingA.sections.map((item) => item.summary).join('\n'),
      readingB.sections.map((item) => item.summary).join('\n'),
    );
    assert.equal(readingA.sections.length, 5);

    readingA.sections.forEach((item) => {
      item.evidence.forEach((entry) => {
        const actual = starsIn(first, entry.palace);
        entry.stars.forEach((star) => {
          const found = actual.find((candidate) => candidate.name === star.name);
          assert.ok(found, `${entry.palace} 没有 ${star.name}`);
          assert.equal(star.mutagen ?? '', found.mutagen ?? '');
          assert.equal(star.brightness ?? '', found.brightness ?? '');
        });
      });
    });
  });

  it('示例盘引用命宫主星，财务段引用实际四化', () => {
    const chart = chartOf('2000-8-16', 2, '女');
    const personality = section(chart, 'personality');
    const money = section(chart, 'money');
    assert.match(personality.summary, /命宫/);
    assert.match(personality.summary, /紫微/);
    const wealthStars = starsIn(chart, '财帛');
    const mutated = wealthStars.find((star) => star.mutagen);
    assert.ok(mutated);
    assert.match(money.summary, new RegExp(mutated.name));
    assert.match(money.summary, new RegExp(`化${mutated.mutagen}`));
    assert.equal(
      money.evidence.some((entry) => entry.stars.some((star) => star.name === mutated.name && star.mutagen === mutated.mutagen)),
      true,
    );
  });

  it('无主星不当成缺陷，对宫星不写成本宫星', () => {
    const chart = chartOf('1990-1-15', 0, '女');
    const personality = section(chart, 'personality');
    const soul = chart.palaces.find((palace) => palace.name === '命宫');
    assert.ok(soul);
    assert.equal(soul.majorStars.length, 0);
    assert.match(personality.summary, /没有主星/);
    assert.match(personality.summary, /不是缺陷/);
    assert.doesNotMatch(personality.summary, /残缺|不好|失败/);
    const opposite = chart.palaces.find((palace) => palace.index === (soul.index + 6) % 12);
    assert.ok(opposite);
    if (opposite.majorStars.length > 0) {
      assert.match(personality.summary, /对宫/);
      assert.match(personality.summary, new RegExp(opposite.majorStars[0].name));
      const own = personality.evidence.find((entry) => entry.relation === '本宫' && entry.palace === '命宫');
      assert.ok(own);
      assert.equal(
        own.stars.some((star) => star.name === opposite.majorStars[0].name),
        false,
      );
    }
  });

  it('化忌只说明在意，陷也不写成凶象', () => {
    const chart = chartOf('1996-11-3', 2, '女');
    const personality = section(chart, 'personality');
    assert.match(personality.summary, /廉贞/);
    assert.match(personality.summary, /化忌/);
    assert.match(personality.summary, /不说明结果好坏/);
    assert.doesNotMatch(personality.summary, SCARE);

    const dim = chartOf('1990-1-15', 0, '女');
    const relation = section(dim, 'relation');
    assert.match(relation.summary, /天梁/);
    assert.match(relation.summary, /陷/);
    assert.match(relation.summary, /不是缺陷/);
    assert.doesNotMatch(relation.summary, SCARE);
    assert.doesNotMatch(relation.summary, /婚姻破裂|必然/);
  });

  it('未成年人使用观察口吻，不贴人格、智力或职业命运标签', () => {
    const chart = chartOf('2015-6-1', 2, '女');
    const reading = buildReading(chart, AS_OF);
    assert.equal(reading.minor, true);
    assert.match(reading.notice, /未满十八岁/);
    const personality = section(chart, 'personality');
    const career = section(chart, 'career');
    assert.equal(personality.title, '待人与做事的观察');
    assert.match(personality.summary, /不写成固定性格/);
    assert.match(career.summary, /不写成未来职业/);
    const joined = reading.sections.map((item) => item.summary).join('');
    assert.doesNotMatch(joined, /智力|智商|注定|命运|天才/);
    assert.match(section(chart, 'relation').summary, /太阴/);
    assert.match(section(chart, 'relation').summary, /化忌/);
    assert.doesNotMatch(section(chart, 'relation').summary, SCARE);
  });

  it('满十八岁与未满十八岁的界线按公历生日计算', () => {
    assert.equal(isUnder18('2008-11-8', new Date(2026, 10, 7)), true);
    assert.equal(isUnder18('2008-11-8', new Date(2026, 10, 8)), false);
    assert.equal(buildReading(chartOf('2000-8-16', 2, '女'), AS_OF).minor, false);
  });

  it('同一张盘重复生成一致，换出生资料后解读跟着变', () => {
    const chart = chartOf('2000-8-16', 2, '男');
    const again = buildReading(chart, AS_OF);
    assert.deepEqual(buildReading(chart, AS_OF), again);
    const other = buildReading(chartOf('2000-8-16', 10, '男'), AS_OF);
    assert.notEqual(again.sections[0].summary, other.sections[0].summary);
  });

  it('不编写今年运势', () => {
    const reading = buildReading(chartOf('2000-8-16', 2, '女'), AS_OF);
    reading.sections.forEach((item) => {
      assert.doesNotMatch(item.summary, /今年|流年/);
    });
    assert.match(reading.notice, /不写今年运势/);
  });
});
