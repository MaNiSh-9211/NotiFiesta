# AI Book Recommendation System (Django + Web Scraping)

## Overview
This project is a lightning-fast, AI-powered book recommendation system built with Django. It scrapes book data from [books.toscrape.com](http://books.toscrape.com), stores all data and images locally, and uses state-of-the-art natural language AI to recommend books based on user queries.

---

## Tech Stack
- **Backend:** Django (Python)
- **Web Scraping:** requests, BeautifulSoup
- **AI/NLP:** sentence-transformers (MiniLM-L6-v2)
- **Frontend:** HTML, CSS (Django templates)
- **Data Storage:** JSON file (`books.json`) and local images folder

---

## Features
- **Web Scraping:**
  - Scrapes all 1000 books from books.toscrape.com (title, description, image).
  - Downloads and stores all book images locally in the `images/` folder.
  - Stores all book data in `books.json`.
- **AI-Powered Recommendations:**
  - Generates vector embeddings for each book using a local transformer model.
  - When a user searches, their query is embedded and compared to all books using cosine similarity.
  - Returns the top 5 most relevant books instantly.
- **API Endpoint:**
  - `/api/recommend/?q=your+query` returns JSON with the top 5 recommended books (title, description, image).
  - No external API is used for recommendations; all AI runs locally.
- **Web UI:**
  - Clean, modern interface for searching and viewing recommendations.
  - Displays book images and titles instantly.
- **Fast & Local:**
  - All data and AI models are local, so recommendations are extremely fast after initial setup.

---

## How It Works (In Depth)

### 1. **Scraping & Data Preparation**
- Run `python manage.py scrape_books` to scrape all book data and images.
- Each book's title, description, and image path are stored in `books.json`.
- Each book also gets an AI embedding (vector) for semantic search.

### 2. **AI Recommendation Logic**
- Uses `sentence-transformers` to generate embeddings for both books and user queries.
- On a search, the query is embedded and compared to all book embeddings using cosine similarity.
- The 5 most similar books are returned as recommendations.
- All AI runs locally; no data leaves your machine.

### 3. **API Endpoint**
- `/api/recommend/?q=your+query` (GET)
- Returns a JSON array of the top 5 recommended books:
  ```json
  {
    "results": [
      {"title": "Book Title", "desc": "Description", "image": "images/filename.jpg"},
      ...
    ]
  }
  ```
- If no query is given, returns 5 random books.

### 4. **Web UI**
- The main page (`/`) lets users enter a search and see instant recommendations.
- Images are served from the local `images/` folder via Django's static file serving.

---

## How Each Feature is Implemented

- **Scraping:**
  - Implemented as a Django management command (`scrape_books`).
  - Uses requests + BeautifulSoup to crawl all 50 pages and download images.
- **Data Storage:**
  - All book data is stored in `books.json` (title, desc, image, embedding).
  - Images are stored in the `images/` folder.
- **AI Embeddings:**
  - Generated using `sentence-transformers` (MiniLM-L6-v2) and stored in the JSON.
- **Recommendation:**
  - On each search, the query is embedded and compared to all books using numpy for fast similarity.
  - The top 5 results are shown in the UI and API.
- **Serving Images:**
  - Django is configured to serve the `images/` folder as static files in development.
- **No External API:**
  - All scraping, AI, and recommendations are local and offline after setup.

---

## Setup & Usage
See `START_PROJECT.txt` for step-by-step setup and run instructions.

---

## Credits
- [books.toscrape.com](http://books.toscrape.com) for demo book data.
- [sentence-transformers](https://www.sbert.net/) for AI embeddings.

---

## License
This project is for educational/demo purposes. Please respect the terms of use of any data sources you scrape. 