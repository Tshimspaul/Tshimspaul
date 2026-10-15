# RealStory Animation Studio

Studio d'animation assisté par IA pour transformer une histoire réelle en série animée.

**État actuel : phase 2 (histoire, bible, personnages, décors, scénarios, storyboards).**
Les phases suivantes (images, vidéo, audio, montage, export) apparaissent dans le menu
avec la mention « Phase N » et ne sont pas encore fonctionnelles.

La phase 2 est une saisie et une organisation **humaines** : aucun texte n'est encore généré
par une IA. La rédaction assistée (bible, scénarios, dialogues) nécessitera un fournisseur
de modèle de langage et une clé API ; elle passera par le système de tâches payantes avec approbation.

## Phase 2 : histoire et préproduction

Choisissez le **projet actif** en haut du menu (ouvrir un projet le sélectionne aussi).

- **Histoires et documents**
  - Fiche de l'histoire : titre, résumé, période, lieux, éléments à conserver,
    éléments dramatisables, éléments strictement historiques.
  - Sources : documents, photographies, témoignages, archives, avec fichier joint.
  - Faits et éléments classés en **fait vérifié**, **témoignage non vérifié**,
    **hypothèse** ou **élément fictif ajouté**. Un fait vérifié exige au moins une source ;
    un élément fictif ne peut jamais être « strictement historique ».
  - Contradictions : signalées entre deux éléments ou plus, elles bloquent la validation
    jusqu'à une décision humaine écrite.
  - **Fiche de validation historique** imprimable. Toute modification ultérieure de
    l'histoire, des sources, des faits ou des contradictions annule la validation.
- **Bible de série** : tous les champs demandés, palette de couleurs, format
  (court 3-5 min, intermédiaire 8-12 min, long 20-30 min), saisons et épisodes.
  Validation possible seulement après la fiche historique ; toute modification la repasse en brouillon.
- **Personnages** (`CHR-0001`…) : fiche complète, détails documentés / imaginés pour les
  personnes réelles, relations, palette, description visuelle figée, et **fiche de continuité**
  (vues de face, profil, trois quarts et au moins trois expressions).
- **Références visuelles versionnées** : remplacer une image crée une nouvelle version,
  les anciennes restent consultables et on peut y revenir.
- **Décors** (`LOC-…`) et **accessoires** (`PRP-…`) avec leurs références.
- **Scénarios** : création des épisodes seulement après validation de la bible ; structure
  en 8 parties, scènes réorganisables (lieu, moment, personnages, actions, émotions, caméra,
  son, musique, durée, éléments historiques). Alerte si l'ordre des scènes contredit la
  chronologie hors retour en arrière. Chaque réplique est étiquetée : **citation authentique**
  (source obligatoire, personne réelle uniquement), **dialogue reconstitué** (par défaut pour
  une personne réelle) ou **dialogue de fiction**. Vue « Lire le scénario » imprimable.
- **Storyboards** : plans (`SHOT-…`, identifiant stable) avec cadrage, angle, mouvement,
  durée, dialogues, sons, lumière et références ; réorganisation par glisser-déposer,
  flèches ou clavier.

## Phase 1 : projets et tâches

- Création, modification, archivage et suppression de projets
  (format court / intermédiaire / long, format d'image 16:9, 9:16 ou 1:1, budget maximum).
- Tableau de bord : nombre de projets et de tâches par état
  (En attente, En cours, Terminée, Échec, Validation nécessaire).
- Système de tâches asynchrones (Celery + Redis) :
  - une tâche payante démarre toujours en « Validation nécessaire » et ne s'exécute
    qu'après votre approbation ;
  - l'approbation est refusée si le coût estimé est inconnu, si le projet n'a pas
    de budget, ou si le budget serait dépassé ;
  - une tâche en échec garde son message d'erreur et peut être relancée seule
    (une relance payante redemande une approbation) ;
  - si la file de tâches est injoignable, la tâche passe en « Échec » avec un message clair.
- Une tâche réelle : **Sauvegarde du projet**, qui écrit un fichier JSON dans
  `media_storage/projects/<id>/snapshots/`.
- API documentée : `http://localhost:8000/api/docs/`.
- Journaux d'erreurs : `logs/realstory.log`.

Les coûts affichés sont toujours des **estimations**, jamais des tarifs garantis.

## Démarrage rapide

Voir [docs/installation-windows.md](docs/installation-windows.md) pour le pas-à-pas Windows.

```bash
docker compose up -d                      # PostgreSQL + Redis
cp .env.example .env                      # puis remplir DJANGO_SECRET_KEY
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt   # Windows : .venv\Scripts\pip
python manage.py migrate
python manage.py runserver                # API sur http://localhost:8000
celery -A config worker --pool=threads -l info   # dans un 2e terminal
cd ../frontend && npm install && npm run dev     # interface sur http://localhost:5173
```

## Tests

```bash
cd backend && pytest            # 44 tests : projets, tâches, histoire, bible, personnages, références, scénarios, storyboards
cd frontend && npm test         # 11 tests : navigation, tableau de bord, projets, validation, dialogues, réorganisation
cd frontend && npm run build && npm run lint
```

Les tests backend utilisent PostgreSQL (une base de test est créée automatiquement).

## Documentation

- [Architecture et choix techniques](docs/architecture.md)
- [Installation sous Windows](docs/installation-windows.md)
