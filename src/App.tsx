import { useEffect, useMemo, useState } from 'react';
import './App.css';

type TabKey = 'calculator' | 'history' | 'settings';

type FormState = {
  venue: string;
  date: string;
  courtFee: string;
  shuttleFee: string;
  shuttleItems: ShuttleItem[];
  maleCount: string;
  femaleCount: string;
  femaleDiscount: string;
  showDetail: boolean;
};

type ShuttleItem = {
  id: string;
  brand: string;
  count: string;
  unitPrice: string;
};

type Settings = {
  version: number;
  defaultVenue: string;
  defaultFemaleDiscount: string;
  defaultShowDetail: boolean;
  selectedTemplateId: string;
};

type CalculationResult = {
  totalFee: number;
  totalPeople: number;
  malePay: number;
  femalePay: number;
};

type HistoryRecord = {
  id: string;
  venue: string;
  date: string;
  courtFee: number;
  shuttleFee: number;
  shuttleItems: SavedShuttleItem[];
  maleCount: number;
  femaleCount: number;
  femaleDiscount: number;
  totalFee: number;
  totalPeople: number;
  malePay: number;
  femalePay: number;
  showDetail: boolean;
  createdAt: string;
};

type SavedShuttleItem = {
  brand: string;
  count: number;
  unitPrice: number;
};

type CopyTemplate = {
  id: string;
  name: string;
  content: string;
};

const HISTORY_KEY = 'badminton_activity_helper_history';
const SETTINGS_KEY = 'badminton_activity_helper_settings';
const BRANDS_KEY = 'badminton_activity_helper_brands';
const TEMPLATES_KEY = 'badminton_activity_helper_copy_templates';
const SETTINGS_VERSION = 3;
const DEFAULT_TEMPLATE_ID = 'default';
const DEFAULT_BRANDS = ['亚C', '亚S', '红超'];
const DEFAULT_TEMPLATE_CONTENT = `本次羽毛球费用：

日期：{{date}}
{{venueLine}}{{shuttleLine}}参与人数：男生 {{maleCount}} 人，女生 {{femaleCount}} 人
女生优惠：{{femaleDiscount}} 元/人


男生每人：{{malePay}} 元
女生每人：{{femalePay}} 元


感谢大家的参与~[嘿哈]`;

const defaultTemplates: CopyTemplate[] = [
  {
    id: DEFAULT_TEMPLATE_ID,
    name: '默认文案',
    content: DEFAULT_TEMPLATE_CONTENT,
  },
];

const today = () => new Date().toISOString().slice(0, 10);

const defaultSettings: Settings = {
  version: SETTINGS_VERSION,
  defaultVenue: '凤凰山全民运动中心',
  defaultFemaleDiscount: '5',
  defaultShowDetail: false,
  selectedTemplateId: DEFAULT_TEMPLATE_ID,
};

const makeInitialForm = (settings: Settings): FormState => ({
  venue: settings.defaultVenue,
  date: today(),
  courtFee: '',
  shuttleFee: '',
  shuttleItems: [],
  maleCount: '',
  femaleCount: '',
  femaleDiscount: settings.defaultFemaleDiscount,
  showDetail: settings.defaultShowDetail,
});

const money = (value: number) => {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0)
    ? '0'
    : rounded.toLocaleString('en-US', {
        maximumFractionDigits: 2,
        useGrouping: false,
      });
};

const makeShuttleItem = (brand = DEFAULT_BRANDS[0]): ShuttleItem => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  brand,
  count: '',
  unitPrice: '',
});

const parseMoney = (value: string) => {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseCount = (value: string) => {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const parseOptionalCount = (value: string) => {
  if (value.trim() === '') return 0;
  return parseCount(value);
};

const parseOptionalMoney = (value: string) => {
  if (value.trim() === '') return 0;
  return parseMoney(value);
};

const sortHistory = (records: HistoryRecord[]) =>
  [...records].sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });

const normalizeHistoryRecord = (record: HistoryRecord): HistoryRecord => ({
  ...record,
  shuttleItems: Array.isArray(record.shuttleItems) ? record.shuttleItems : [],
});

const safeLoadHistory = (): HistoryRecord[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortHistory(parsed.map(normalizeHistoryRecord)) : [];
  } catch {
    return [];
  }
};

const safeLoadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const isCurrentVersion = parsed.version === SETTINGS_VERSION;
    return {
      version: SETTINGS_VERSION,
      defaultVenue:
        typeof parsed.defaultVenue === 'string' && (isCurrentVersion || parsed.defaultVenue)
          ? parsed.defaultVenue
          : defaultSettings.defaultVenue,
      defaultFemaleDiscount:
        typeof parsed.defaultFemaleDiscount === 'string' &&
        (isCurrentVersion || parsed.defaultFemaleDiscount !== '0')
          ? parsed.defaultFemaleDiscount
          : defaultSettings.defaultFemaleDiscount,
      defaultShowDetail: Boolean(parsed.defaultShowDetail),
      selectedTemplateId:
        typeof parsed.selectedTemplateId === 'string'
          ? parsed.selectedTemplateId
          : defaultSettings.selectedTemplateId,
    };
  } catch {
    return defaultSettings;
  }
};

const safeLoadBrands = () => {
  try {
    const raw = localStorage.getItem(BRANDS_KEY);
    if (!raw) return DEFAULT_BRANDS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_BRANDS;
    const merged = [...DEFAULT_BRANDS, ...parsed.filter((item) => typeof item === 'string')];
    return Array.from(new Set(merged.map((item) => item.trim()).filter(Boolean)));
  } catch {
    return DEFAULT_BRANDS;
  }
};

const safeLoadTemplates = () => {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) return defaultTemplates;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultTemplates;
    const customTemplates = parsed.filter(
      (item): item is CopyTemplate =>
        typeof item?.id === 'string' &&
        typeof item?.name === 'string' &&
        typeof item?.content === 'string',
    );
    const hasDefault = customTemplates.some((item) => item.id === DEFAULT_TEMPLATE_ID);
    return hasDefault ? customTemplates : [...defaultTemplates, ...customTemplates];
  } catch {
    return defaultTemplates;
  }
};

const getShuttleSummary = (items: SavedShuttleItem[]) =>
  items
    .filter((item) => item.brand && item.count > 0)
    .map((item) => `${item.brand} ${item.count}个`)
    .join('，');

const getTemplateVariables = (record: HistoryRecord) => {
  const venueLine = record.venue.trim() ? `场地：${record.venue.trim()}\n` : '';
  const shuttleLine = getShuttleSummary(record.shuttleItems);
  const shuttleText = shuttleLine ? `用球：${shuttleLine}\n` : '';

  return {
    date: record.date,
    venue: record.venue.trim(),
    venueLine,
    shuttleSummary: shuttleLine,
    shuttleLine: shuttleText,
    courtFee: money(record.courtFee),
    shuttleFee: money(record.shuttleFee),
    totalFee: money(record.totalFee),
    totalPeople: String(record.totalPeople),
    maleCount: String(record.maleCount),
    femaleCount: String(record.femaleCount),
    femaleDiscount: money(record.femaleDiscount),
    malePay: money(record.malePay),
    femalePay: money(record.femalePay),
  };
};

const buildCopyText = (record: HistoryRecord, templateContent = DEFAULT_TEMPLATE_CONTENT) => {
  const variables = getTemplateVariables(record);
  return templateContent.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in variables ? variables[key as keyof typeof variables] : match,
  );
};

function App() {
  const [settings, setSettings] = useState<Settings>(() => safeLoadSettings());
  const [form, setForm] = useState<FormState>(() => makeInitialForm(safeLoadSettings()));
  const [history, setHistory] = useState<HistoryRecord[]>(() => safeLoadHistory());
  const [brands, setBrands] = useState<string[]>(() => safeLoadBrands());
  const [templates, setTemplates] = useState<CopyTemplate[]>(() => safeLoadTemplates());
  const [activeTab, setActiveTab] = useState<TabKey>('calculator');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [manualCopyText, setManualCopyText] = useState('');
  const [copyDraft, setCopyDraft] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [detailRecordId, setDetailRecordId] = useState<string | null>(null);

  const selectedTemplate =
    templates.find((item) => item.id === settings.selectedTemplateId) ?? templates[0];

  const keepInputVisible = (element: HTMLElement) => {
    window.setTimeout(() => {
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 250);
  };

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      setNotice('历史记录保存失败，请检查浏览器存储权限。');
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      setNotice('设置保存失败，请检查浏览器存储权限。');
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(BRANDS_KEY, JSON.stringify(brands));
    } catch {
      setNotice('品牌保存失败，请检查浏览器存储权限。');
    }
  }, [brands]);

  useEffect(() => {
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    } catch {
      setNotice('文案样式保存失败，请检查浏览器存储权限。');
    }
  }, [templates]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setTemplateName(selectedTemplate.name);
    setTemplateContent(selectedTemplate.content);
  }, [selectedTemplate]);

  const currentRecord = useMemo<HistoryRecord | null>(() => {
    if (!result) return null;
    const courtFee = parseMoney(form.courtFee) ?? 0;
    const shuttleFee = parseMoney(form.shuttleFee) ?? 0;
    const shuttleItems = form.shuttleItems
      .map((item) => ({
        brand: item.brand.trim(),
        count: parseOptionalCount(item.count) ?? 0,
        unitPrice: parseOptionalMoney(item.unitPrice) ?? 0,
      }))
      .filter((item) => item.brand && item.count > 0);
    const maleCount = parseCount(form.maleCount) ?? 0;
    const femaleCount = parseCount(form.femaleCount) ?? 0;
    const femaleDiscount = parseMoney(form.femaleDiscount) ?? 0;

    return {
      id: '',
      venue: form.venue.trim(),
      date: form.date,
      courtFee,
      shuttleFee,
      shuttleItems,
      maleCount,
      femaleCount,
      femaleDiscount,
      totalFee: result.totalFee,
      totalPeople: result.totalPeople,
      malePay: result.malePay,
      femalePay: result.femalePay,
      showDetail: form.showDetail,
      createdAt: '',
    };
  }, [form, result]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
    setNotice('');
    setManualCopyText('');
  };

  const updateShuttleItem = <K extends keyof ShuttleItem>(
    id: string,
    key: K,
    value: ShuttleItem[K],
  ) => {
    setForm((prev) => {
      const shuttleItems = prev.shuttleItems.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      );
      const shuttleFee = String(
        shuttleItems.reduce((sum, item) => {
          const count = parseOptionalCount(item.count);
          const unitPrice = parseOptionalMoney(item.unitPrice);
          if (count === null || unitPrice === null) return sum;
          return sum + count * unitPrice;
        }, 0),
      );
      return { ...prev, shuttleItems, shuttleFee };
    });
    setError('');
    setNotice('');
    setManualCopyText('');
  };

  const addShuttleItem = () => {
    setForm((prev) => ({ ...prev, shuttleItems: [...prev.shuttleItems, makeShuttleItem()] }));
  };

  const removeShuttleItem = (id: string) => {
    setForm((prev) => {
      const shuttleItems = prev.shuttleItems.filter((item) => item.id !== id);
      const shuttleFee = String(
        shuttleItems.reduce((sum, item) => {
          const count = parseOptionalCount(item.count);
          const unitPrice = parseOptionalMoney(item.unitPrice);
          if (count === null || unitPrice === null) return sum;
          return sum + count * unitPrice;
        }, 0),
      );
      return { ...prev, shuttleItems, shuttleFee };
    });
  };

  const addBrand = () => {
    const brand = newBrand.trim();
    if (!brand) return;
    setBrands((prev) => (prev.includes(brand) ? prev : [...prev, brand]));
    setNewBrand('');
    setNotice('品牌已新增。');
  };

  const validateAndCalculate = () => {
    setNotice('');
    setManualCopyText('');

    const courtFee = parseMoney(form.courtFee);
    const shuttleFee = parseMoney(form.shuttleFee);
    const maleCount = parseCount(form.maleCount);
    const femaleCount = parseCount(form.femaleCount);
    const femaleDiscount = parseMoney(form.femaleDiscount);
    const hasInvalidShuttleItem = form.shuttleItems.some((item) => {
      const count = parseOptionalCount(item.count);
      const unitPrice = parseOptionalMoney(item.unitPrice);
      return count === null || unitPrice === null || count < 0 || unitPrice < 0;
    });

    if (courtFee === null) return setError('请填写有效的场地费。');
    if (shuttleFee === null) return setError('请填写有效的球费。');
    if (hasInvalidShuttleItem) return setError('请填写有效的用球数量和单价，不能小于 0。');
    if (maleCount === null) return setError('请填写有效的男生数量，人数必须是整数。');
    if (femaleCount === null) return setError('请填写有效的女生数量，人数必须是整数。');
    if (femaleDiscount === null) return setError('请填写有效的女生优惠金额。');
    if (courtFee < 0 || shuttleFee < 0 || femaleDiscount < 0) {
      return setError('场地费、球费、女生优惠金额不能小于 0。');
    }
    if (maleCount < 0 || femaleCount < 0) {
      return setError('男生数量、女生数量不能小于 0。');
    }

    const totalPeople = maleCount + femaleCount;
    if (totalPeople === 0) return setError('总人数不能为 0。');

    const totalFee = courtFee + shuttleFee;
    const malePay = (totalFee + femaleCount * femaleDiscount) / totalPeople;
    const femalePay = malePay - femaleDiscount;

    if (!Number.isFinite(malePay) || !Number.isFinite(femalePay)) {
      return setError('计算结果异常，请检查输入。');
    }
    if (femalePay < 0) {
      return setError('女生优惠金额过高，导致女生应付款小于 0，请降低优惠金额。');
    }

    setError('');
    setResult({ totalFee, totalPeople, malePay, femalePay });
    window.setTimeout(() => {
      setCopyDraft(buildCopyText({
        id: '',
        venue: form.venue.trim(),
        date: form.date,
        courtFee,
        shuttleFee,
        shuttleItems: form.shuttleItems
          .map((item) => ({
            brand: item.brand.trim(),
            count: parseOptionalCount(item.count) ?? 0,
            unitPrice: parseOptionalMoney(item.unitPrice) ?? 0,
          }))
          .filter((item) => item.brand && item.count > 0),
        maleCount,
        femaleCount,
        femaleDiscount,
        totalFee,
        totalPeople,
        malePay,
        femalePay,
        showDetail: form.showDetail,
        createdAt: '',
      }, selectedTemplate.content));
    }, 0);
  };

  const resetForm = () => {
    setForm(makeInitialForm(settings));
    setResult(null);
    setError('');
    setNotice('');
    setManualCopyText('');
    setCopyDraft('');
  };

  const saveRecord = () => {
    if (!currentRecord) return;
    const record: HistoryRecord = {
      ...currentRecord,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    setHistory((prev) => sortHistory([record, ...prev]));
    setNotice('本次记录已保存。');
  };

  const copyWithFallback = async (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', 'true');
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    try {
      return document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const copyText = async (text: string) => {
    setManualCopyText('');
    try {
      const copied = await copyWithFallback(text);
      if (!copied) throw new Error('Copy command failed');
      setNotice('收款文案已复制。');
    } catch {
      setNotice('复制失败，请手动长按复制下方文案。');
      setManualCopyText(text);
    }
  };

  const copyCurrent = () => {
    if (currentRecord) void copyText(copyDraft || buildCopyText(currentRecord));
  };

  const refillFromHistory = (record: HistoryRecord) => {
    setForm({
      venue: record.venue,
      date: record.date,
      courtFee: String(record.courtFee),
      shuttleFee: String(record.shuttleFee),
      shuttleItems: record.shuttleItems.map((item) => ({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        brand: item.brand,
        count: String(item.count),
        unitPrice: String(item.unitPrice),
      })),
      maleCount: String(record.maleCount),
      femaleCount: String(record.femaleCount),
      femaleDiscount: String(record.femaleDiscount),
      showDetail: record.showDetail,
    });
    setResult({
      totalFee: record.totalFee,
      totalPeople: record.totalPeople,
      malePay: record.malePay,
      femalePay: record.femalePay,
    });
    setError('');
    setNotice('已回填历史记录。');
    setManualCopyText('');
    setCopyDraft(buildCopyText(record, selectedTemplate.content));
    setActiveTab('calculator');
  };

  const deleteRecord = (id: string) => {
    if (!window.confirm('确认删除这条历史记录吗？')) return;
    setHistory((prev) => prev.filter((item) => item.id !== id));
    setNotice('历史记录已删除。');
  };

  const clearAllHistory = () => {
    if (!history.length) return setNotice('暂无历史记录可清空。');
    if (!window.confirm('确认清空全部历史记录吗？此操作不可恢复。')) return;
    setHistory([]);
    setNotice('全部历史记录已清空。');
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setNotice('设置已保存。');
  };

  const selectTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setSettings((prev) => ({ ...prev, selectedTemplateId: templateId }));
    setTemplateName(template.name);
    setTemplateContent(template.content);
    setNotice('文案样式已切换。');
  };

  const saveTemplate = () => {
    if (!selectedTemplate) return;
    const name = templateName.trim() || selectedTemplate.name;
    setTemplates((prev) =>
      prev.map((item) =>
        item.id === selectedTemplate.id ? { ...item, name, content: templateContent } : item,
      ),
    );
    setNotice('文案样式已保存。');
  };

  const saveAsTemplate = () => {
    const name = templateName.trim() || '新文案样式';
    const template: CopyTemplate = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      content: templateContent,
    };
    setTemplates((prev) => [...prev, template]);
    setSettings((prev) => ({ ...prev, selectedTemplateId: template.id }));
    setNotice('新文案样式已保存。');
  };

  const deleteTemplate = () => {
    if (!selectedTemplate || selectedTemplate.id === DEFAULT_TEMPLATE_ID) {
      setNotice('默认文案样式不能删除。');
      return;
    }
    if (!window.confirm('确认删除当前文案样式吗？')) return;
    setTemplates((prev) => prev.filter((item) => item.id !== selectedTemplate.id));
    setSettings((prev) => ({ ...prev, selectedTemplateId: DEFAULT_TEMPLATE_ID }));
    setNotice('文案样式已删除。');
  };

  return (
    <div className="app-shell">
      <main className="app-main">
        {activeTab === 'calculator' && (
          <section className="page">
            <header className="hero">
              <p className="eyebrow">羽毛球活动助手</p>
              <h1>算费用</h1>
              <p>快速计算本次男生、女生应付金额</p>
            </header>

            <div className="card form-card">
              <label>
                场地名称
                <input
                  value={form.venue}
                  onFocus={(event) => keepInputVisible(event.currentTarget)}
                  onChange={(event) => updateForm('venue', event.target.value)}
                  placeholder="可选，如奥体中心"
                />
              </label>
              <label>
                打球日期
                <input
                  type="date"
                  value={form.date}
                  onFocus={(event) => keepInputVisible(event.currentTarget)}
                  onChange={(event) => updateForm('date', event.target.value)}
                />
              </label>
              <div className="grid-two">
                <label>
                  场地费
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.courtFee}
                    onFocus={(event) => keepInputVisible(event.currentTarget)}
                    onChange={(event) => updateForm('courtFee', event.target.value)}
                    placeholder="0.00"
                  />
                </label>
                <label>
                  球费总额（可手动修改）
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.shuttleFee}
                    onFocus={(event) => keepInputVisible(event.currentTarget)}
                    onChange={(event) => updateForm('shuttleFee', event.target.value)}
                    placeholder="0.00"
                  />
                </label>
              </div>
              <div className="shuttle-section">
                <div className="section-title">
                  <strong>用球明细</strong>
                  <button type="button" onClick={addShuttleItem}>
                    新增用球
                  </button>
                </div>
                {form.shuttleItems.map((item) => (
                  <div className="shuttle-item" key={item.id}>
                    <label>
                      品牌
                      <select
                        value={item.brand}
                        onChange={(event) =>
                          updateShuttleItem(item.id, 'brand', event.target.value)
                        }
                      >
                        {brands.map((brand) => (
                          <option value={brand} key={brand}>
                            {brand}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      个数
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={item.count}
                        onFocus={(event) => keepInputVisible(event.currentTarget)}
                        onChange={(event) =>
                          updateShuttleItem(item.id, 'count', event.target.value)
                        }
                        placeholder="0"
                      />
                    </label>
                    <label>
                      单价
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={item.unitPrice}
                        onFocus={(event) => keepInputVisible(event.currentTarget)}
                        onChange={(event) =>
                          updateShuttleItem(item.id, 'unitPrice', event.target.value)
                        }
                        placeholder="0"
                      />
                    </label>
                    <button
                      type="button"
                      className="danger icon-action"
                      onClick={() => removeShuttleItem(item.id)}
                    >
                      删除
                    </button>
                  </div>
                ))}
                <div className="brand-add">
                  <input
                    value={newBrand}
                    onFocus={(event) => keepInputVisible(event.currentTarget)}
                    onChange={(event) => setNewBrand(event.target.value)}
                    placeholder="新增品牌"
                  />
                  <button type="button" className="secondary" onClick={addBrand}>
                    添加
                  </button>
                </div>
              </div>
              <div className="grid-two">
                <label>
                  男生数量
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={form.maleCount}
                    onFocus={(event) => keepInputVisible(event.currentTarget)}
                    onChange={(event) => updateForm('maleCount', event.target.value)}
                    placeholder="0"
                  />
                </label>
                <label>
                  女生数量
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={form.femaleCount}
                    onFocus={(event) => keepInputVisible(event.currentTarget)}
                    onChange={(event) => updateForm('femaleCount', event.target.value)}
                    placeholder="0"
                  />
                </label>
              </div>
              <label>
                女生优惠金额
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.femaleDiscount}
                  onFocus={(event) => keepInputVisible(event.currentTarget)}
                  onChange={(event) => updateForm('femaleDiscount', event.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label className="switch-row">
                <span>展示详细计算过程</span>
                <input
                  type="checkbox"
                  checked={form.showDetail}
                  onChange={(event) => updateForm('showDetail', event.target.checked)}
                />
              </label>
            </div>

            <div className="action-row">
              <button className="primary" onClick={validateAndCalculate}>
                计算
              </button>
              <button className="secondary" onClick={resetForm}>
                重置
              </button>
            </div>

            {error && <div className="message error">{error}</div>}
            {notice && <div className="message success">{notice}</div>}

            {result && currentRecord && (
              <div className="card result-card">
                <div className="result-grid">
                  <div>
                    <span>本次总费用</span>
                    <strong>{money(result.totalFee)} 元</strong>
                  </div>
                  <div>
                    <span>总人数</span>
                    <strong>{result.totalPeople} 人</strong>
                  </div>
                </div>
                <div className="pay-panel">
                  <div>
                    <span>男生每人</span>
                    <b>{money(result.malePay)} 元</b>
                  </div>
                  <div>
                    <span>女生每人</span>
                    <b>{money(result.femalePay)} 元</b>
                  </div>
                </div>

                {form.showDetail && (
                  <div className="detail-box">
                    <p>
                      总费用 = 场地费 + 球费 = {money(currentRecord.courtFee)} +{' '}
                      {money(currentRecord.shuttleFee)} = {money(result.totalFee)} 元
                    </p>
                    <p>
                      总人数 = 男生数量 + 女生数量 = {currentRecord.maleCount} +{' '}
                      {currentRecord.femaleCount} = {result.totalPeople} 人
                    </p>
                    <p>
                      男生每人应付 = (总费用 + 女生数量 × 女生优惠金额) ÷ 总人数
                      <br />= ({money(result.totalFee)} + {currentRecord.femaleCount} ×{' '}
                      {money(currentRecord.femaleDiscount)}) ÷ {result.totalPeople}
                      <br />= {money(result.malePay)} 元
                    </p>
                    <p>
                      女生每人应付 = 男生每人应付 - 女生优惠金额
                      <br />= {money(result.malePay)} - {money(currentRecord.femaleDiscount)}
                      <br />= {money(result.femalePay)} 元
                    </p>
                  </div>
                )}

                <div className="action-row stacked">
                  <button className="primary" onClick={saveRecord}>
                    保存本次记录
                  </button>
                  <button className="secondary" onClick={copyCurrent}>
                    复制收款文案
                  </button>
                </div>
                <div className="copy-editor">
                  <h2>收款文案</h2>
                  <textarea
                    value={copyDraft || buildCopyText(currentRecord, selectedTemplate.content)}
                    onChange={(event) => setCopyDraft(event.target.value)}
                  />
                </div>
              </div>
            )}

            {manualCopyText && (
              <div className="card">
                <h2>手动复制文案</h2>
                <textarea readOnly value={manualCopyText} />
              </div>
            )}
          </section>
        )}

        {activeTab === 'history' && (
          <section className="page">
            <header className="page-head">
              <h1>历史记录</h1>
              <p>已保存的每次打球费用记录</p>
            </header>
            {notice && <div className="message success">{notice}</div>}

            {!history.length && (
              <div className="empty card">
                <h2>暂无历史记录</h2>
                <p>计算并保存后，会在这里展示每次打球记录。</p>
              </div>
            )}

            <div className="history-list">
              {history.map((record) => (
                <article className="card history-item" key={record.id}>
                  <div className="history-title">
                    <strong>
                      {record.date}｜{record.venue || '未填写场地'}
                    </strong>
                  </div>
                  <p>
                    总费用：{money(record.totalFee)} 元｜男 {record.maleCount} 人 女{' '}
                    {record.femaleCount} 人
                  </p>
                  <p>
                    男生：{money(record.malePay)} 元｜女生：{money(record.femalePay)} 元
                  </p>

                  {detailRecordId === record.id && (
                    <div className="detail-box compact">
                      <p>场地费：{money(record.courtFee)} 元</p>
                      <p>球费：{money(record.shuttleFee)} 元</p>
                      {getShuttleSummary(record.shuttleItems) && (
                        <p>用球：{getShuttleSummary(record.shuttleItems)}</p>
                      )}
                      <p>女生优惠：{money(record.femaleDiscount)} 元/人</p>
                      <p>总人数：{record.totalPeople} 人</p>
                      <p>创建时间：{new Date(record.createdAt).toLocaleString()}</p>
                    </div>
                  )}

                  <div className="mini-actions">
                    <button
                      onClick={() =>
                        setDetailRecordId(detailRecordId === record.id ? null : record.id)
                      }
                    >
                      查看详情
                    </button>
                    <button
                      onClick={() => void copyText(buildCopyText(record, selectedTemplate.content))}
                    >
                      复制文案
                    </button>
                    <button onClick={() => refillFromHistory(record)}>再次计算</button>
                    <button className="danger" onClick={() => deleteRecord(record.id)}>
                      删除
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {manualCopyText && (
              <div className="card">
                <h2>手动复制文案</h2>
                <textarea readOnly value={manualCopyText} />
              </div>
            )}
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="page">
            <header className="page-head">
              <h1>我的设置</h1>
              <p>设置默认值，减少每次填写</p>
            </header>
            {notice && <div className="message success">{notice}</div>}
            <div className="card form-card">
              <label>
                默认场地名称
                <input
                  value={settings.defaultVenue}
                  onFocus={(event) => keepInputVisible(event.currentTarget)}
                  onChange={(event) => updateSetting('defaultVenue', event.target.value)}
                  placeholder="可选"
                />
              </label>
              <label>
                默认女生优惠金额
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={settings.defaultFemaleDiscount}
                  onFocus={(event) => keepInputVisible(event.currentTarget)}
                  onChange={(event) =>
                    updateSetting('defaultFemaleDiscount', event.target.value)
                  }
                  placeholder="0.00"
                />
              </label>
              <label className="switch-row">
                <span>默认展示详细计算过程</span>
                <input
                  type="checkbox"
                  checked={settings.defaultShowDetail}
                  onChange={(event) =>
                    updateSetting('defaultShowDetail', event.target.checked)
                  }
                />
              </label>
              <button className="danger full" onClick={clearAllHistory}>
                清空全部历史记录
              </button>
            </div>

            <div className="card form-card">
              <div className="section-title">
                <strong>文案样式</strong>
              </div>
              <label>
                当前样式
                <select
                  value={selectedTemplate.id}
                  onChange={(event) => selectTemplate(event.target.value)}
                >
                  {templates.map((template) => (
                    <option value={template.id} key={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                样式名称
                <input
                  value={templateName}
                  onFocus={(event) => keepInputVisible(event.currentTarget)}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="如微信群收款文案"
                />
              </label>
              <label>
                模板内容
                <textarea
                  className="template-textarea"
                  value={templateContent}
                  onFocus={(event) => keepInputVisible(event.currentTarget)}
                  onChange={(event) => setTemplateContent(event.target.value)}
                />
              </label>
              <div className="variable-list">
                <span>{'{{date}}'}</span>
                <span>{'{{venueLine}}'}</span>
                <span>{'{{shuttleLine}}'}</span>
                <span>{'{{maleCount}}'}</span>
                <span>{'{{femaleCount}}'}</span>
                <span>{'{{femaleDiscount}}'}</span>
                <span>{'{{malePay}}'}</span>
                <span>{'{{femalePay}}'}</span>
              </div>
              <div className="mini-actions">
                <button onClick={saveTemplate}>保存样式</button>
                <button onClick={saveAsTemplate}>另存为新样式</button>
                <button className="danger" onClick={deleteTemplate}>
                  删除样式
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-tabs" aria-label="主导航">
        <button
          className={activeTab === 'calculator' ? 'active' : ''}
          onClick={() => setActiveTab('calculator')}
        >
          算费用
        </button>
        <button
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          历史记录
        </button>
        <button
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          我的设置
        </button>
      </nav>
    </div>
  );
}

export default App;
