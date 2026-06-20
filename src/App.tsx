import { useEffect, useMemo, useState } from 'react';
import './App.css';

type TabKey = 'calculator' | 'history' | 'settings';

type FormState = {
  venue: string;
  date: string;
  courtFee: string;
  shuttleFee: string;
  maleCount: string;
  femaleCount: string;
  femaleDiscount: string;
  showDetail: boolean;
};

type Settings = {
  defaultVenue: string;
  defaultFemaleDiscount: string;
  defaultShowDetail: boolean;
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

const HISTORY_KEY = 'badminton_activity_helper_history';
const SETTINGS_KEY = 'badminton_activity_helper_settings';

const today = () => new Date().toISOString().slice(0, 10);

const defaultSettings: Settings = {
  defaultVenue: '',
  defaultFemaleDiscount: '0',
  defaultShowDetail: false,
};

const makeInitialForm = (settings: Settings): FormState => ({
  venue: settings.defaultVenue,
  date: today(),
  courtFee: '',
  shuttleFee: '',
  maleCount: '',
  femaleCount: '',
  femaleDiscount: settings.defaultFemaleDiscount,
  showDetail: settings.defaultShowDetail,
});

const money = (value: number) => value.toFixed(2);

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

const sortHistory = (records: HistoryRecord[]) =>
  [...records].sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });

const safeLoadHistory = (): HistoryRecord[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortHistory(parsed) : [];
  } catch {
    return [];
  }
};

const safeLoadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      defaultVenue: typeof parsed.defaultVenue === 'string' ? parsed.defaultVenue : '',
      defaultFemaleDiscount:
        typeof parsed.defaultFemaleDiscount === 'string'
          ? parsed.defaultFemaleDiscount
          : '0',
      defaultShowDetail: Boolean(parsed.defaultShowDetail),
    };
  } catch {
    return defaultSettings;
  }
};

const buildCopyText = (record: HistoryRecord) => {
  const venueLine = record.venue.trim() ? `场地：${record.venue.trim()}\n` : '';

  if (!record.showDetail) {
    return `本次羽毛球费用：

日期：${record.date}
${venueLine}
场地费：${money(record.courtFee)} 元
球费：${money(record.shuttleFee)} 元
总费用：${money(record.totalFee)} 元

参与人数：男生 ${record.maleCount} 人，女生 ${record.femaleCount} 人
女生优惠：${money(record.femaleDiscount)} 元/人

男生每人：${money(record.malePay)} 元
女生每人：${money(record.femalePay)} 元`;
  }

  return `本次羽毛球费用：

日期：${record.date}
${venueLine}
场地费：${money(record.courtFee)} 元
球费：${money(record.shuttleFee)} 元
总费用：${money(record.courtFee)} + ${money(record.shuttleFee)} = ${money(record.totalFee)} 元

男生 ${record.maleCount} 人，女生 ${record.femaleCount} 人，共 ${record.totalPeople} 人
女生每人优惠：${money(record.femaleDiscount)} 元

男生每人：
(${money(record.totalFee)} + ${record.femaleCount} × ${money(record.femaleDiscount)}) ÷ ${record.totalPeople} = ${money(record.malePay)} 元

女生每人：
${money(record.malePay)} - ${money(record.femaleDiscount)} = ${money(record.femalePay)} 元

最终：
男生每人：${money(record.malePay)} 元
女生每人：${money(record.femalePay)} 元`;
};

function App() {
  const [settings, setSettings] = useState<Settings>(() => safeLoadSettings());
  const [form, setForm] = useState<FormState>(() => makeInitialForm(safeLoadSettings()));
  const [history, setHistory] = useState<HistoryRecord[]>(() => safeLoadHistory());
  const [activeTab, setActiveTab] = useState<TabKey>('calculator');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [manualCopyText, setManualCopyText] = useState('');
  const [detailRecordId, setDetailRecordId] = useState<string | null>(null);

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

  const currentRecord = useMemo<HistoryRecord | null>(() => {
    if (!result) return null;
    const courtFee = parseMoney(form.courtFee) ?? 0;
    const shuttleFee = parseMoney(form.shuttleFee) ?? 0;
    const maleCount = parseCount(form.maleCount) ?? 0;
    const femaleCount = parseCount(form.femaleCount) ?? 0;
    const femaleDiscount = parseMoney(form.femaleDiscount) ?? 0;

    return {
      id: '',
      venue: form.venue.trim(),
      date: form.date,
      courtFee,
      shuttleFee,
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

  const validateAndCalculate = () => {
    setNotice('');
    setManualCopyText('');

    const courtFee = parseMoney(form.courtFee);
    const shuttleFee = parseMoney(form.shuttleFee);
    const maleCount = parseCount(form.maleCount);
    const femaleCount = parseCount(form.femaleCount);
    const femaleDiscount = parseMoney(form.femaleDiscount);

    if (courtFee === null) return setError('请填写有效的场地费。');
    if (shuttleFee === null) return setError('请填写有效的球费。');
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
  };

  const resetForm = () => {
    setForm(makeInitialForm(settings));
    setResult(null);
    setError('');
    setNotice('');
    setManualCopyText('');
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
    if (currentRecord) void copyText(buildCopyText(currentRecord));
  };

  const refillFromHistory = (record: HistoryRecord) => {
    setForm({
      venue: record.venue,
      date: record.date,
      courtFee: String(record.courtFee),
      shuttleFee: String(record.shuttleFee),
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
                  球费
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
                    <button onClick={() => void copyText(buildCopyText(record))}>复制文案</button>
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
