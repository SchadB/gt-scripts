# gt-scripts — Scripts Guerre Tribale par Schadrac

Scripts avancés pour Guerre Tribale (Tribal Wars), développés et maintenus par **Schadrac**.

## Scripts disponibles

| Script | Description | Écran requis |
|--------|-------------|--------------|
| [OP Planner](./opPlanner.js) | Planificateur d'opération coordonnée multi-villages | Profil joueur (`info_player`) |
| [TDG Simulator](./tdgSimulator.js) | Simulateur de portée des Tours de Guet sur la carte | Carte (`map`) |
| [Conquest Tracker](./conquestTracker.js) | Overlay de conquêtes récentes sur la carte | Carte (`map`) |
| [Show Looted Resources](./slr.js) | Ressources entrantes de tous tes villages | Aperçu village (`overview`) |

## Installation

### Méthode recommandée — Raccourci dans la barre GT

1. Dans Guerre Tribale, va dans **Paramètres → Barre de raccourcis**
2. Crée un nouveau raccourci avec ce code (remplace `NOM_DU_SCRIPT` par le nom voulu) :

```
javascript:$.getScript('https://cdn.jsdelivr.net/gh/schadb/gt-scripts@main/NOM_DU_SCRIPT.js');
```

### Raccourcis directs

**OP Planner**
```
javascript:$.getScript('https://cdn.jsdelivr.net/gh/schadb/gt-scripts@main/opPlanner.js');
```

**TDG Simulator**
```
javascript:$.getScript('https://cdn.jsdelivr.net/gh/schadb/gt-scripts@main/tdgSimulator.js');
```

**Conquest Tracker**
```
javascript:$.getScript('https://cdn.jsdelivr.net/gh/schadb/gt-scripts@main/conquestTracker.js');
```

**Show Looted Resources**
```
javascript:$.getScript('https://cdn.jsdelivr.net/gh/schadb/gt-scripts@main/slr.js');
```

> **Note :** Si le raccourci ne fonctionne pas avec des apostrophes, remplace `'` par `%27` :
> `javascript:$.getScript(%27https://cdn.jsdelivr.net/gh/schadb/gt-scripts@main/opPlanner.js%27);`

## Forcer la mise à jour (vider le cache jsDelivr)

Après avoir modifié un fichier sur GitHub, le CDN peut mettre quelques minutes à se mettre à jour. Pour forcer immédiatement :

```
https://purge.jsdelivr.net/gh/schadb/gt-scripts@main/NOM_DU_SCRIPT.js
```

## Auteur

**Schadrac** — Scripts développés pour Guerre Tribale (marché `.fr`)

## Licence

Scripts publiés pour usage personnel sur Guerre Tribale.
En accord avec les conditions de la bibliothèque de scripts InnoGames.
