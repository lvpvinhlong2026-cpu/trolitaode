import os

# 1. Update AnalyticsDashboard.tsx
file_path_1 = 'src/components/AnalyticsDashboard.tsx'
with open(file_path_1, 'r', encoding='utf-8') as f:
    content_1 = f.read()

# Add prop
prop_find = '  onClearSessions: () => void;\n}'
prop_replace = '  onClearSessions: () => void;\n  onDeleteExam?: (id: string) => void;\n}'
content_1 = content_1.replace(prop_find, prop_replace)

# Add destructured prop
destruct_find = '  onClearSessions\n}: AnalyticsDashboardProps)'
destruct_replace = '  onClearSessions,\n  onDeleteExam\n}: AnalyticsDashboardProps)'
content_1 = content_1.replace(destruct_find, destruct_replace)

# Replace the title div with a flex container holding the title and the delete button
title_find = '                    <div className={`font-semibold leading-tight text-xs ${isSelected ? \'text-white\' : \'text-blue-800\'}`}>\n                      {exam.title}\n                    </div>'
title_replace = """                    <div className="flex justify-between items-start gap-2">
                      <div className={`font-semibold leading-tight text-xs ${isSelected ? 'text-white' : 'text-blue-800'}`}>
                        {exam.title}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDeleteExam) onDeleteExam(exam.id);
                        }}
                        className={`p-1 -mt-1 -mr-1 rounded-md transition-colors flex-shrink-0 ${
                          isSelected ? 'text-blue-200 hover:bg-blue-700 hover:text-white' : 'text-slate-300 hover:bg-red-50 hover:text-red-500'
                        }`}
                        title="Xóa đề kiểm tra"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>"""
content_1 = content_1.replace(title_find, title_replace)

with open(file_path_1, 'w', encoding='utf-8') as f:
    f.write(content_1)


# 2. Update App.tsx
file_path_2 = 'src/App.tsx'
with open(file_path_2, 'r', encoding='utf-8') as f:
    content_2 = f.read()

# Add handleDeleteExam function
func_add = """
  const handleDeleteExam = (id: string) => {
    if (!appData) return;
    const newExams = appData.exams.filter(e => e.id !== id);
    updateAppDataState({ ...appData, exams: newExams });
  };
"""
if 'const handleUpdateQuestion = ' in content_2:
    idx = content_2.find('const handleUpdateQuestion = ')
    content_2 = content_2[:idx] + func_add + '\n  ' + content_2[idx:]

# Pass onDeleteExam to AnalyticsDashboard
comp_find = """                  onDeleteSession={handleDeleteSession}
                  onClearSessions={() => updateAppDataState({ ...appData, sessions: [] })}
                />"""
comp_replace = """                  onDeleteSession={handleDeleteSession}
                  onClearSessions={() => updateAppDataState({ ...appData, sessions: [] })}
                  onDeleteExam={handleDeleteExam}
                />"""
content_2 = content_2.replace(comp_find, comp_replace)

with open(file_path_2, 'w', encoding='utf-8') as f:
    f.write(content_2)

print('Updated both files')
