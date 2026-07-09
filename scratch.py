import os

file_path = 'src/components/AnalyticsDashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variable
state_find = "  const [filterClass, setFilterClass] = useState<string>('all');"
state_replace = """  const [filterClass, setFilterClass] = useState<string>('all');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);"""
content = content.replace(state_find, state_replace)

# 2. Update filteredSessions logic
filter_find = """  const filteredSessions = sessions.filter((sess) => {
    if (filterClass === 'all') return true;
    return sess.studentClass === filterClass;
  });"""
filter_replace = """  // Filtered session list
  const filteredSessions = sessions.filter((sess) => {
    if (filterClass !== 'all' && sess.studentClass !== filterClass) return false;
    if (selectedExamId && sess.examId !== selectedExamId) return false;
    return true;
  });"""
content = content.replace(filter_find, filter_replace)

# 3. Update exam item rendering (including the createdAt fix)
exam_find = """              exams.slice().reverse().map((exam) => (
                <div key={exam.id} className="flex flex-col gap-1.5 p-3 bg-blue-50/50 border border-blue-100/50 rounded-xl">
                  <div className="font-semibold text-blue-800 leading-tight text-xs">{exam.title}</div>
                  <div className="flex items-center justify-between text-slate-500 text-[10px] mt-0.5">
                    <span className="bg-white px-2 py-0.5 rounded shadow-xs border border-slate-100">{exam.questions.length} câu hỏi</span>
                    <span>{new Date(exam.dateCreated).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              ))"""
exam_replace = """              exams.slice().reverse().map((exam) => {
                const isSelected = selectedExamId === exam.id;
                return (
                  <div 
                    key={exam.id} 
                    onClick={() => setSelectedExamId(isSelected ? null : exam.id)}
                    className={`flex flex-col gap-1.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm text-slate-700'
                    }`}
                  >
                    <div className={`font-semibold leading-tight text-xs ${isSelected ? 'text-white' : 'text-blue-800'}`}>
                      {exam.title}
                    </div>
                    <div className={`flex items-center justify-between text-[10px] mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      <span className={`px-2 py-0.5 rounded shadow-xs border ${isSelected ? 'bg-blue-700 border-blue-500' : 'bg-slate-50 border-slate-100'}`}>
                        {exam.questions.length} câu hỏi
                      </span>
                      <span>{exam.createdAt ? new Date(exam.createdAt).toLocaleDateString('vi-VN') : 'Mới tạo'}</span>
                    </div>
                  </div>
                );
              })"""
content = content.replace(exam_find, exam_replace)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
