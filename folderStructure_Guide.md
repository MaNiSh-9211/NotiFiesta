==========================
Django Project File Table
==========================

File/Folder                                      | Controls / Does What                                                                 | Location                                | Required?
----------------------------------------------------------------------------------------------------------------------------
manage.py                                       | Entry point to run commands (runserver, migrate, etc).                              | Root of project folder                  | Yes
                                               | Sets the settings file via DJANGO_SETTINGS_MODULE.

bookreco/settings.py                           | Main configuration: database, secret key, static paths, installed apps, middleware. | bookreco/                               | Yes

bookreco/urls.py                               | Main URL router — entry point for all project URLs. Includes app-level routers.     | bookreco/                               | Yes

bookreco/wsgi.py                               | WSGI entry point for deployment (Gunicorn, uWSGI). Also sets settings path.         | bookreco/                               | Yes

bookreco/asgi.py                               | ASGI entry point for async servers (Daphne, uvicorn). Also sets settings path.      | bookreco/                               | If using ASGI

recommender/urls.py                            | App-level routing: handles routes like "/", "/api/recommend/".                      | recommender/                            | Yes

recommender/views.py                           | Business logic — view classes/functions like BookRecommendView.                     | recommender/                            | Yes

recommender/templates/                         | HTML templates rendered by views.                                                   | recommender/templates/                  | Optional

recommender/models.py                          | Defines models (e.g., Book). Maps to DB via Django ORM.                             | recommender/                            | Optional (until models are needed)

recommender/management/commands/scrape_books.py| Custom management command for scraping and storing embeddings.                      | recommender/management/commands/        | Optional (for CLI scripts)

books.json                                      | Stores scraped book data + embeddings.                                              | Root or a data folder                   | Optional

images/                                         | Stores downloaded book images.                                                      | Created by your script                  | Optional

.env (if using)                                 | Stores config values like DEBUG, SECRET_KEY, DB URL, etc.                           | Root or same level as manage.py         | Optional

==================================
Key Relationships Between Files
==================================

This File                   | Points To / Imports                          | Purpose
-------------------------------------------------------------------------------------------
manage.py                  | settings.py via DJANGO_SETTINGS_MODULE       | Bootstraps Django with correct settings

settings.py                | ROOT_URLCONF = 'bookreco.urls'               | Defines main URL router to load

bookreco/urls.py           | include('recommender.urls')                  | Delegates routing to the recommender app

recommender/urls.py        | views.BookRecommendView, BookRecommendAPI    | Maps URL paths to view logic

recommender/views.py       | Templates or API responses                    | Handles request logic and returns response

scrape_books.py            | Runs from manage.py scrape_books             | Custom command to scrape + save data

 