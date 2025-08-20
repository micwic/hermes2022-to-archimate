# language: fr
Fonctionnalité: extraction des phases HERMES2022

  Scénario: validation des phases HERMES2022
    Etant donné un fichier intermédiaire de données conforme et valable dans `config/extraction-config.json`
    Quand Je valide les phases HERMES2022
    Alors l'ensemble des phases attendus selon la méthodologie HERMES2022 sont présents dans le fichier intermédiaire de données
    Et l'ordre des phases est conforme à l'ordre attendu selon la méthodologie HERMES2022
