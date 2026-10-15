# RealStory Animation Studio

Studio d'animation assisté par IA pour transformer une histoire réelle en série animée.

**État actuel : phase 1 (gestion des projets et des tâches).** Les phases suivantes
(histoire, bible, personnages, scénarios, storyboard, images, vidéo, audio, montage)
apparaissent dans le menu avec la mention « Phase N » et ne sont pas encore fonctionnelles.

## Ce qui fonctionne aujourd'hui

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
cd backend && pytest            # 20 tests : API projets, cycle de vie des tâches, budget, sauvegarde
cd frontend && npm test         # 6 tests : navigation, tableau de bord, création, approbation, erreurs
cd frontend && npm run build && npm run lint
```

Les tests backend utilisent PostgreSQL (une base de test est créée automatiquement).

## Documentation

- [Architecture et choix techniques](docs/architecture.md)
- [Installation sous Windows](docs/installation-windows.md)
