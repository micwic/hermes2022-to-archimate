import re
import glob

# Trouver le fichier de log le plus récent
log_files = glob.glob("test-output-debug-*.log")
if not log_files:
    print("❌ Aucun fichier de log trouvé")
    exit(1)
log_file = max(log_files, key=lambda f: f)
print(f"📄 Utilisation du fichier de log : {log_file}")

with open(log_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

prompts = []
current_prompt = None
current_content = []
in_prompt = False

for i, line in enumerate(lines):
    if 'PROMPT COMPLET pour' in line:
        # Extraire le json pointer
        match = re.search(r'PROMPT COMPLET pour ([^\s]+)', line)
        if match:
            if current_prompt:
                prompts.append((current_prompt, '\n'.join(current_content)))
            current_prompt = match.group(1)
            current_content = []
            in_prompt = True
    elif 'FIN PROMPT' in line:
        if current_prompt and current_content:
            prompts.append((current_prompt, '\n'.join(current_content)))
        current_prompt = None
        current_content = []
        in_prompt = False
    elif in_prompt and current_prompt:
        # Nettoyer les lignes de log Jest
        if 'console.log' not in line and 'at log' not in line and 'at Object' not in line:
            cleaned = line.strip()
            if cleaned and not cleaned.startswith('('):
                current_content.append(cleaned)

# Créer le fichier markdown
output_file = "prompts-nuextract-test.md"
with open(output_file, 'w', encoding='utf-8') as f:
    f.write("# Prompts NuExtract pour test manuel sur la plateforme SaaS\n\n")
    f.write(f"**Date d'extraction** : 2025-11-14\n")
    f.write(f"**Nombre de prompts** : {len(prompts)}\n\n")
    f.write("---\n\n")
    
    for i, (json_pointer, prompt) in enumerate(prompts, 1):
        f.write(f"## Prompt {i} : {json_pointer}\n\n")
        f.write("### Instructions pour tester sur NuExtract.ai\n\n")
        f.write("1. Aller sur https://nuextract.ai\n")
        f.write("2. Créer un nouveau projet ou utiliser le projet existant\n")
        f.write("3. Utiliser l'API `/api/projects/{projectId}/infer-text` ou l'interface web\n")
        f.write("4. Coller le prompt complet ci-dessous\n\n")
        f.write("### Prompt complet\n\n")
        f.write(prompt)
        f.write("\n\n")
        f.write("---\n\n")

print(f"✅ Fichier créé : {output_file}")
print(f"   {len(prompts)} prompts extraits")
for json_ptr, _ in prompts:
    print(f"   - {json_ptr}")
