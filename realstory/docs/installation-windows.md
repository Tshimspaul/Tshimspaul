# Installation sous Windows

> Ce projet a été développé et testé sous Linux. Les briques choisies fonctionnent
> sous Windows, mais cette procédure doit encore être vérifiée sur une machine Windows.
> Signalez toute erreur rencontrée.

## 1. Logiciels à installer

- [Python 3.12 ou plus récent](https://www.python.org/downloads/windows/) (cocher « Add python.exe to PATH »)
- [Node.js LTS](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (pour PostgreSQL et Redis)
- [Git](https://git-scm.com/download/win)

Sans Docker Desktop : installez [PostgreSQL pour Windows](https://www.postgresql.org/download/windows/)
et utilisez [Memurai](https://www.memurai.com/) (compatible Redis) à la place du conteneur Redis.

## 2. Bases de données

Dans PowerShell, à la racine du dossier `realstory` :

```powershell
docker compose up -d
```

## 3. Configuration

```powershell
Copy-Item .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(40))"
```

Ouvrez `.env` et collez la valeur affichée après `DJANGO_SECRET_KEY=`.

## 4. Backend (terminal 1)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py runserver
```

Si PowerShell refuse d'activer l'environnement :
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## 5. Worker de tâches (terminal 2)

```powershell
cd backend
.venv\Scripts\Activate.ps1
celery -A config worker --pool=threads -l info
```

L'option `--pool=threads` est indispensable sous Windows.

## 6. Interface (terminal 3)

```powershell
cd frontend
npm install
npm run dev
```

Ouvrez <http://localhost:5173>.

## 7. Vérifier l'installation

```powershell
cd backend; pytest
cd ..\frontend; npm test
```

Dans l'interface : créez un projet, puis cliquez sur « Créer une sauvegarde ».
La tâche doit passer à « Terminée ». Si elle passe à « Échec » avec le message
« File de tâches indisponible », Redis ou le worker n'est pas démarré.
