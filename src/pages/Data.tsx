const stats = [
  { label: '产业年产值', value: '508.9', unit: '亿元', note: '2024 年数据' },
  { label: '规上企业数', value: '431', unit: '家', note: '浏阳片区' },
  { label: '相关专利', value: '3721', unit: '项', note: '近十年累计' },
  { label: '出口国家', value: '100+', unit: '国', note: '常年稳定' },
];

const companies = [
  { name: '待接入', type: '规上企业', location: '浏阳', status: '数据源配置中' },
];

export default function Data() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">产业数据 · 企业名录</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-400">
          宏观数据来源于浏阳市统计公报、湖南省工信厅及公开年报。企业名录后续将从公开政府数据源和 API 抓取更新，
          并支持按主营、资质、出口能力筛选。
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs text-neutral-500">{s.label}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-amber-300">{s.value}</span>
              <span className="text-sm text-neutral-400">{s.unit}</span>
            </div>
            <div className="mt-1 text-[11px] text-neutral-600">{s.note}</div>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-semibold">企业名录</h2>
          <span className="text-xs text-neutral-500">占位 · API 接入后生效</span>
        </div>
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-neutral-400">
              <tr>
                <th className="px-4 py-2">名称</th>
                <th className="px-4 py-2">类型</th>
                <th className="px-4 py-2">地区</th>
                <th className="px-4 py-2">状态</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c, i) => (
                <tr key={i} className="border-t border-white/5 text-neutral-300">
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2 text-neutral-400">{c.type}</td>
                  <td className="px-4 py-2 text-neutral-400">{c.location}</td>
                  <td className="px-4 py-2 text-neutral-500">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          规划：接入政府公开数据（浏阳市工信局公示、工信部企业名录）+ 商业 API（天眼查/企查查），
          展示公司主营、资质、出口国、近期动态。
        </p>
      </section>
    </div>
  );
}
