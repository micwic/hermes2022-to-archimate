# language: fr
Fonctionnalité: hermes2022-concepts (en-tête commun aux concepts correspondant à la méthodologie HERMES2022)

  Scénario: nouvelle extraction des concepts HERMES2022
    Etant donné un site de référence, la langue et la description du site de référence définis dans le fichier de configuration `config/extraction-config.json`
    Quand l'utilisateur a demandé une extraction des concepts HERMES2022 dans le chat IA intégré à Cursor sur la base de ces indications
    Alors le fichier intermédiaire de données est conforme et valable aux schémas de données définis dans `shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json`
    Et le fichier sidecar d'approbation est conforme et valable aux schémas de données définis dans `shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts-approval.json`
    Et les status des concepts extraits sont tous à "pending"
