const fs = require('fs');
const file = 'src/components/ExamGenerator.tsx';
let code = fs.readFileSync(file, 'utf-8');

const startMarker = '{sourceConfigs.map((config, index) => (';
const endMarker = 'Thêm cấu hình nguồn';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `{sourceConfigs.map((config, index) => (
                    <div key={config.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative group">
                      {sourceConfigs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSourceConfigs(prev => prev.filter(c => c.id !== config.id))}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-200 z-10"
                        >
                          <X size={12} />
                        </button>
                      )}
                      
                      <select
                        value={config.bankId}
                        onChange={(e) => {
                          const newConfigs = [...sourceConfigs];
                          newConfigs[index].bankId = e.target.value;
                          setSourceConfigs(newConfigs);
                        }}
                        className="w-full text-sm p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700 truncate pr-6"
                      >
                        <option value="all">Tất cả các nguồn đã tải lên</option>
                        {questionBanks.map(bank => (
                          <option key={bank.id} value={bank.id}>
                            {bank.name}
                          </option>
                        ))}
                      </select>

                      <div className="flex gap-2">
                        <div className="flex-1 flex flex-col items-center">
                          <label className="block text-[10px] font-bold text-emerald-600/70 mb-1 tracking-wider whitespace-nowrap" title="Trắc nghiệm nhiều lựa chọn - Dễ">[B] DỄ</label>
                          <input
                            type="number"
                            value={config.easy}
                            onChange={(e) => {
                              const newConfigs = [...sourceConfigs];
                              newConfigs[index].easy = Math.max(0, Number(e.target.value));
                              setSourceConfigs(newConfigs);
                            }}
                            className="w-full text-center text-sm p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-all text-emerald-600 font-bold"
                          />
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <label className="block text-[10px] font-bold text-amber-600/70 mb-1 tracking-wider whitespace-nowrap" title="Trắc nghiệm nhiều lựa chọn - Trung bình">[H] TB</label>
                          <input
                            type="number"
                            value={config.medium}
                            onChange={(e) => {
                              const newConfigs = [...sourceConfigs];
                              newConfigs[index].medium = Math.max(0, Number(e.target.value));
                              setSourceConfigs(newConfigs);
                            }}
                            className="w-full text-center text-sm p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100 transition-all text-amber-600 font-bold"
                          />
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <label className="block text-[10px] font-bold text-rose-600/70 mb-1 tracking-wider whitespace-nowrap" title="Trắc nghiệm nhiều lựa chọn - Khó">[VD] KHÓ</label>
                          <input
                            type="number"
                            value={config.hard}
                            onChange={(e) => {
                              const newConfigs = [...sourceConfigs];
                              newConfigs[index].hard = Math.max(0, Number(e.target.value));
                              setSourceConfigs(newConfigs);
                            }}
                            className="w-full text-center text-sm p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all text-rose-600 font-bold"
                          />
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <label className="block text-[10px] font-bold text-purple-600/70 mb-1 tracking-wider whitespace-nowrap" title="Trắc nghiệm Đúng/Sai">[DS] Đ/S</label>
                          <input
                            type="number"
                            value={config.tf || 0}
                            onChange={(e) => {
                              const newConfigs = [...sourceConfigs];
                              newConfigs[index].tf = Math.max(0, Number(e.target.value));
                              setSourceConfigs(newConfigs);
                            }}
                            className="w-full text-center text-sm p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition-all text-purple-600 font-bold"
                          />
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <label className="block text-[10px] font-bold text-blue-600/70 mb-1 tracking-wider whitespace-nowrap" title="Trắc nghiệm Trả lời ngắn">[TLN] T.LUẬN</label>
                          <input
                            type="number"
                            value={config.short || 0}
                            onChange={(e) => {
                              const newConfigs = [...sourceConfigs];
                              newConfigs[index].short = Math.max(0, Number(e.target.value));
                              setSourceConfigs(newConfigs);
                            }}
                            className="w-full text-center text-sm p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all text-blue-600 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setSourceConfigs(prev => [
                        ...prev,
                        { id: Math.random().toString(36).substring(2, 9), bankId: 'all', easy: 5, medium: 3, hard: 2, tf: 0, short: 0 }
                      ]);
                    }}
                    className="w-full py-2.5 mt-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors text-slate-500 hover:text-slate-700"
                  >
                    <Plus size={14} />
                    Thêm cấu hình nguồn`;

  code = code.substring(0, startIndex) + replacement + code.substring(endIndex + 'Thêm cấu hình nguồn'.length);
  fs.writeFileSync(file, code);
  console.log('UI Repaired and Updated!');
} else {
  console.error('Could not find markers');
}
