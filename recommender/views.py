"""
Book Recommendation View and Scraper
Author: AI Assistant
"""
from django.shortcuts import render
from django.views import View
import requests
from bs4 import BeautifulSoup
import random
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import numpy as np
from sentence_transformers import SentenceTransformer

# Global cache for all books
ALL_BOOKS_CACHE = None

BOOKS_DATA = None
BOOKS_EMBEDDINGS = None
MODEL = None

# def get_all_books():
#     global ALL_BOOKS_CACHE
#     if ALL_BOOKS_CACHE is not None:
#         return ALL_BOOKS_CACHE
#     books = []
#     session = requests.Session()
#     for page in range(1, 51):  # 50 pages
#         url = f'http://books.toscrape.com/catalogue/category/books_1/page-{page}.html'
#         try:
#             response = session.get(url, timeout=5)
#         except requests.RequestException:
#             break
#         if response.status_code != 200:
#             break
#         soup = BeautifulSoup(response.text, 'html.parser')
#         for article in soup.select('article.product_pod'):
#             title = article.h3.a['title']
#             img_url = 'http://books.toscrape.com/' + article.find('img')['src'].replace('../', '')
#             detail_url = 'http://books.toscrape.com/catalogue/' + article.h3.a['href']
#             # Only fetch detail page for description
#             try:
#                 detail_resp = session.get(detail_url, timeout=5)
#                 detail_soup = BeautifulSoup(detail_resp.text, 'html.parser')
#                 desc_tag = detail_soup.select_one('#product_description ~ p') 
#                 desc = desc_tag.text if desc_tag else 'No description.'
#             except requests.RequestException:
#                 desc = 'No description (failed to load).'
#             books.append({'title': title, 'img_url': img_url, 'desc': desc})
#     ALL_BOOKS_CACHE = books
#     return books

class BookRecommendView(View):
    template_name = 'recommender/index.html'

    def get(self, request):
        return render(request, self.template_name)

    def post(self, request):
        load_books_and_embeddings()
        genre = request.POST.get('genre', '')
        if not genre.strip():
            import random
            books = random.sample(BOOKS_DATA, 5)
        else:
            query_emb = MODEL.encode(genre)
            sims = np.dot(BOOKS_EMBEDDINGS, query_emb) / (np.linalg.norm(BOOKS_EMBEDDINGS, axis=1) * np.linalg.norm(query_emb) + 1e-8)
            top_idx = np.argsort(sims)[-5:][::-1]
            books = [BOOKS_DATA[i] for i in top_idx]
        # Only pass title, desc, image to template, fix image path for web
        books = [{'title': b['title'], 'desc': b['desc'], 'image': b['image'].replace('\\', '/').replace('\\\\', '/').replace('\\\\\\', '/').replace('\\\\\\\\', '/').replace('\\\\\\\\\\', '/').replace('\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/').replace('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', '/')} for b in books]
        return render(request, self.template_name, {'books': books, 'genre': genre})

# def search_books(genre):
#     books = get_all_books()
#     if not books:
#         return []
#     if genre.strip():
#         matches = [b for b in books if genre.lower() in b['title'].lower() or genre.lower() in b['desc'].lower()]
#         if matches:
#             return matches[:5]
#     # If no matches, return 5 random books
#     return random.sample(books, min(5, len(books)))

# Load books and embeddings once
def load_books_and_embeddings():
    global BOOKS_DATA, BOOKS_EMBEDDINGS, MODEL
    if BOOKS_DATA is not None and BOOKS_EMBEDDINGS is not None and MODEL is not None:
        return
    import json
    with open('books.json', 'r', encoding='utf-8') as f:
        BOOKS_DATA = json.load(f)
    BOOKS_EMBEDDINGS = np.array([b['embedding'] for b in BOOKS_DATA])
    MODEL = SentenceTransformer('all-MiniLM-L6-v2')

@method_decorator(csrf_exempt, name='dispatch')
class BookRecommendAPI(View):
    def get(self, request):
        load_books_and_embeddings()
        query = request.GET.get('q', '')
        if not query.strip():
            import random
            books = random.sample(BOOKS_DATA, 5)
            # Only return title, desc, image
            results = [
                {'title': b['title'], 'desc': b['desc'], 'image': b['image']} for b in books
            ]
            return JsonResponse({'results': results}, safe=False)
        # Embed the query
        query_emb = MODEL.encode(query)
        # Compute cosine similarity
        sims = np.dot(BOOKS_EMBEDDINGS, query_emb) / (np.linalg.norm(BOOKS_EMBEDDINGS, axis=1) * np.linalg.norm(query_emb) + 1e-8)
        top_idx = np.argsort(sims)[-5:][::-1]
        results = [
            {'title': BOOKS_DATA[i]['title'], 'desc': BOOKS_DATA[i]['desc'], 'image': BOOKS_DATA[i]['image']} for i in top_idx
        ]
        return JsonResponse({'results': results}, safe=False)
