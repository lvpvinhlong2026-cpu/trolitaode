import os

filepath = r'd:/HOC_AI_lE_VINH_PHUC/1_TAO_DE_KTTX/src/components/ExamGenerator.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove TABS HEADER
start_tabs = content.find('      {/* TABS HEADER */}')
end_tabs = content.find('      {/* EXAM CREATION PANEL */}')
if start_tabs != -1 and end_tabs != -1:
    content = content[:start_tabs] + content[end_tabs:]

# 2. Change grid-cols-1 to grid-cols-1 xl:grid-cols-3
content = content.replace('<div className="grid grid-cols-1 gap-6">', '<div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">')

# 3. Extract the three blocks
gen_start = content.find('{/* TAB 1: Generate Action')
config_start = content.find('{/* TAB 2: Configuration')
manage_start = content.find('{/* TAB 3: AI Generation')
manage_end = content.find('      {/* GENERATED EXAM PRINTING PREVIEW SECTION */}')

if gen_start != -1 and config_start != -1 and manage_start != -1:
    gen_block = content[gen_start:config_start]
    config_block = content[config_start:manage_start]
    manage_block = content[manage_start:manage_end]
    
    # Clean up gen_block
    gen_block = gen_block.replace("{activeTab === 'generate' && (", "")
    gen_block = gen_block.replace("max-w-xl mx-auto w-full ", "w-full ")
    # Remove the last )} in gen_block
    gen_block = gen_block.rstrip()
    if gen_block.endswith(")}"):
        gen_block = gen_block[:-2] + "\n\n"
        
    # Clean up config_block
    config_block = config_block.replace("{activeTab === 'config' && (", "")
    config_block = config_block.replace("max-w-xl mx-auto w-full ", "w-full ")
    # Remove the last )} in config_block
    config_block = config_block.rstrip()
    if config_block.endswith(")}"):
        config_block = config_block[:-2] + "\n\n"
        
    # Clean up manage_block
    manage_block = manage_block.replace("{activeTab === 'manage' && (", "")
    manage_block = manage_block.replace("max-w-3xl mx-auto w-full", "w-full")
    # Remove the last )} in manage_block
    manage_block = manage_block.rstrip()
    if manage_block.endswith(")}"):
        manage_block = manage_block[:-2] + "\n\n"
        
    # Reassemble in order: Config, Generate, Manage
    new_panels = config_block + "\n" + gen_block + "\n" + manage_block + "      "
    
    content = content[:gen_start] + new_panels + content[manage_end:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
