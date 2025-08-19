# language: fr
Fonctionnalité: hermes2022-concepts (en-tête commun aux concepts correspondant à la méthodologie HERMES2022)

  Scénario: nouvelle extraction des concepts HERMES2022
    Etant donné un site de référence, la langue et la description du site de référence définis dans le fichier de configuration `config/extraction-source.json`
    Quand l'utilisateur a demandé une extraction des concepts HERMES2022 dans le chat IA intégré à Cursor sur la base de ces indications
    Alors le fichier de données est conforme et valable aux schémas de données définis dans `shared/hermes2022-extraction-files/config/json-schemas/hermes2022-concepts.json`

  Scénario: Validité des données extraites - version HERMES2022
    Etant donné un fichier de données issu de l'extraction des concepts HERMES2022 déjà existant dans `shared/hermes2022-extraction-files/data`
    Quand je valide la verions HERMES2022
    Alors 
