# Architecture

```
Navigateur (React + TypeScript, interface en français)
        │  /api (JSON)
        ▼
Django + Django REST Framework ── PostgreSQL
        │
        └── Redis ──► worker Celery ──► gestionnaires de tâches (handlers)
```

## Organisation du code

| Dossier | Rôle |
|---|---|
| `backend/config/` | Paramètres (lus depuis les variables d'environnement), URL, application Celery. |
| `backend/apps/projects/` | Modèle `Project`, API `/api/projects/`, tableau de bord `/api/dashboard/`, tâche « Sauvegarde du projet » (`handlers.py`). |
| `backend/apps/jobs/` | Modèle `Job`, registre des types de tâches (`registry.py`), cycle de vie (`services.py`), worker Celery (`tasks.py`), API `/api/jobs/`. |
| `backend/tests/` | Tests pytest. |
| `frontend/src/api/` | Client HTTP typé. |
| `frontend/src/pages/` | Écrans : tableau de bord, liste et détail des projets, sections prévues. |
| `frontend/src/sections.ts` | Les 15 sections du menu et la phase de chacune. |

| `backend/apps/common/` | Outils partagés : filtrage par projet, contrôle « même projet », réorganisation, chemins de stockage. |
| `backend/apps/stories/` | Histoire, sources, faits classés, contradictions, fiche de validation (`services.py`). |
| `backend/apps/bible/` | Bible de série et sa validation. |
| `backend/apps/characters/` | Personnages et relations. |
| `backend/apps/sets/` | Décors et accessoires. |
| `backend/apps/references/` | Images de référence versionnées (personnage, décor ou accessoire). |
| `backend/apps/scripts/` | Épisodes, scènes, répliques étiquetées, contrôle chronologique. |
| `backend/apps/storyboards/` | Plans. |

Les phases suivantes ajouteront `generation`, `audio`, `editing` et un dossier
`providers/` pour les adaptateurs de services externes.

## Chaîne de validation (phase 2)

```
Histoire + sources + faits ──► Fiche historique validée ──► Bible validée ──► Épisodes, scènes, plans
           ▲                              │                       │
           └── toute modification ────────┘    toute modification ┘ (retour en brouillon)
```

Règles appliquées côté serveur (donc aussi via l'API) :

- un fait « vérifié » sans source est refusé ; la fiche signale aussi un fait vérifié dont la source a été supprimée ;
- une contradiction ouverte bloque la validation historique ; sa résolution exige un texte ;
- la bible ne se valide qu'après la fiche historique, avec une durée cohérente avec le format ;
- un épisode ne peut être créé qu'avec une bible validée ;
- une réplique d'un personnage fictif est « fiction » ; celle d'une personne réelle est
  « reconstituée » sauf citation authentique, qui exige une source ;
- tous les objets liés (sources, lieux, personnages, références) doivent appartenir au même projet ;
- les identifiants (`CHR-`, `LOC-`, `PRP-`, `REF-`, `SCN-`, `SHOT-`) dérivent de la clé
  primaire : ils ne changent jamais, même après réorganisation.

## API (phase 2)

| Ressource | Points d'accès |
|---|---|
| Histoire | `GET/PATCH /api/stories/<projet>/`, `GET …/validation-sheet/`, `POST …/validate/` |
| Sources, faits | `/api/sources/`, `/api/facts/` (`?project=`, `?category=`) |
| Contradictions | `/api/contradictions/`, `POST …/<id>/resolve/` |
| Bible | `GET/PATCH /api/bibles/<projet>/`, `POST …/validate/`, `GET /api/bibles/formats/` |
| Personnages | `/api/characters/`, `/api/relationships/` |
| Décors | `/api/locations/`, `/api/props/` |
| Références | `/api/references/` (multipart), `POST …/<id>/replace/`, `POST …/<id>/make-current/` |
| Scénarios | `/api/episodes/`, `GET …/<id>/full/`, `POST …/<id>/reorder-scenes/`, `/api/scenes/`, `/api/lines/` |
| Storyboards | `/api/shots/`, `POST /api/scenes/<id>/reorder-shots/` |

Documentation interactive complète : `/api/docs/`.

## Tâches

Chaque type de tâche est déclaré côté serveur dans le registre :

```python
register(JobKind(key="project_snapshot", label="Sauvegarde du projet", handler=snapshot_project))
```

Le client choisit seulement le **type** de tâche. Le caractère payant et l'estimation
de coût sont décidés par le serveur, ce qui empêche une tâche payante d'être lancée
comme gratuite.

| Transition | Condition |
|---|---|
| création → En attente | tâche gratuite (mise en file immédiate) |
| création → Validation nécessaire | tâche payante |
| Validation nécessaire → En attente | approbation, coût estimé connu, budget défini et suffisant |
| Validation nécessaire → Échec | refus par l'utilisateur |
| En attente → En cours → Terminée / Échec | exécution par le worker |
| Échec → En attente / Validation nécessaire | relance (payante : nouvelle approbation) |

Le worker vérifie de nouveau qu'une tâche payante a bien été approuvée avant de
l'exécuter. Les transitions utilisent des verrous de ligne (`select_for_update`)
pour éviter une double exécution ou un dépassement de budget par deux approbations simultanées.

Le **coût engagé** d'un projet est la somme des tâches payantes approuvées, en cours
ou terminées (coût réel s'il est connu, sinon coût estimé).

## Choix techniques

- **Celery sous Windows** : Celery n'est plus officiellement pris en charge sous Windows ;
  le worker est lancé avec `--pool=threads`, qui y fonctionne. Redis n'a pas de version
  Windows native : il tourne dans Docker Desktop.
- **Pas d'authentification en phase 1** : prototype local mono-utilisateur.
  L'authentification et les permissions sont prévues en phase 7. Ne pas exposer
  l'application sur Internet en l'état.
- **Secrets** : uniquement dans `.env` (non versionné). L'application refuse de démarrer
  sans `DJANGO_SECRET_KEY`.
- **Stockage des médias** : `media_storage/projects/<id_projet>/<type>/…` (non versionné) ;
  en développement, Django sert `/media/` et Vite le relaie.
