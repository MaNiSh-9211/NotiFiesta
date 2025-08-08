# import os
# import json
# import requests
# from bs4 import BeautifulSoup
# from sentence_transformers import SentenceTransformer
# from django.core.management.base import BaseCommand

# class Command(BaseCommand):
#     help = 'Scrape all books, download images, and store data+embeddings in books.json.'

#     def handle(self, *args, **options):
#         os.makedirs('images', exist_ok=True)
#         books = []
#         model = SentenceTransformer('all-MiniLM-L6-v2')
#         session = requests.Session()
#         for page in range(1, 51):
#             url = f'http://books.toscrape.com/catalogue/category/books_1/page-{page}.html'
#             try:
#                 response = session.get(url, timeout=5)
#             except requests.RequestException:
#                 break
#             if response.status_code != 200:
#                 break
#             soup = BeautifulSoup(response.text, 'html.parser')
#             for article in soup.select('article.product_pod'):
#                 title = article.h3.a['title']
#                 img_url = 'http://books.toscrape.com/' + article.find('img')['src'].replace('../', '')
#                 detail_url = 'http://books.toscrape.com/catalogue/' + article.h3.a['href']
#                 # Get description
#                 try:
#                     detail_resp = session.get(detail_url, timeout=5)
#                     detail_soup = BeautifulSoup(detail_resp.text, 'html.parser')
#                     # desc_tag = detail_soup.select_one('#product_description ~ p')
#                     # desc = desc_tag.text if desc_tag else 'No description.'
#                     desc_tag = detail_soup.select_one('div#content_inner > article > p')
#                     desc = desc_tag.text.strip() if desc_tag else 'No description.' 

#                 except requests.RequestException:
#                     desc = 'No description (failed to load).'
#                 # Download image
#                 img_filename = os.path.join('images', os.path.basename(img_url))
#                 if not os.path.exists(img_filename):
#                     try:
#                         img_data = session.get(img_url, timeout=5).content
#                         with open(img_filename, 'wb') as f:
#                             f.write(img_data)
#                     except Exception:
#                         img_filename = None
#                 # Compute embedding
#                 text_for_embed = f"{title}. {desc}"
#                 embedding = model.encode(text_for_embed).tolist()
#                 books.append({
#                     'title': title,
#                     'desc': desc,
#                     'image': img_filename if img_filename else '',
#                     'embedding': embedding
#                 })
#                 self.stdout.write(f"Scraped: {title}")
#         # Save all books to books.json
#         with open('books.json', 'w', encoding='utf-8') as f:
#             json.dump(books, f, ensure_ascii=False)
#         self.stdout.write(self.style.SUCCESS(f"Scraped and saved {len(books)} books.")) 

import os
import json
import time
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from sentence_transformers import SentenceTransformer
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Scrape all books, download images, and store data+embeddings in books.json.'

    def handle(self, *args, **options):
        images_dir = 'images'
        os.makedirs(images_dir, exist_ok=True)

        books = []
        model = SentenceTransformer('all-MiniLM-L6-v2')
        session = requests.Session()
        # set a common user-agent to reduce chance of blocking
        session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})

        for page in range(1, 51):
            listing_url = f'http://books.toscrape.com/catalogue/category/books_1/page-{page}.html'
            try:
                resp = session.get(listing_url, timeout=10)
                resp.raise_for_status()
            except requests.RequestException as e:
                self.stderr.write(f"Failed to fetch listing page {page}: {e}")
                break

            soup = BeautifulSoup(resp.text, 'html.parser')
            articles = soup.select('article.product_pod')
            if not articles:
                self.stdout.write(f"No books found on page {page}, stopping.")
                break

            for article in articles:
                title = article.h3.a.get('title', '').strip()
                href = article.h3.a.get('href', '').strip()
                detail_url = urljoin(listing_url, href)

                # image URL (make absolute)
                img_src = article.find('img').get('src', '').strip()
                img_url = urljoin(listing_url, img_src)

                # default description
                desc = 'No description.'

                # Fetch detail page and extract the <p> immediately after the product_description div
                try:
                    detail_resp = session.get(detail_url, timeout=10)
                    detail_resp.raise_for_status()
                    detail_soup = BeautifulSoup(detail_resp.text, 'html.parser')

                    pd_div = detail_soup.find('div', id='product_description')
                    if pd_div:
                        p = pd_div.find_next_sibling('p')
                        if p:
                            desc = p.get_text(strip=True)
                    else:
                        # fallback selectors (very tolerant)
                        p2 = detail_soup.select_one('#product_description ~ p') or detail_soup.select_one('div#content_inner > article > p')
                        if p2:
                            desc = p2.get_text(strip=True)

                except requests.RequestException as e:
                    self.stderr.write(f"Failed to fetch detail page for '{title}': {e}")

                # Download image (if possible)
                img_filename = ''
                try:
                    parsed = urlparse(img_url)
                    img_basename = os.path.basename(parsed.path)
                    if img_basename:
                        img_filename = os.path.join(images_dir, img_basename)
                        if not os.path.exists(img_filename):
                            img_data = session.get(img_url, timeout=10).content
                            with open(img_filename, 'wb') as f:
                                f.write(img_data)
                except Exception as e:
                    self.stderr.write(f"Failed to download image for '{title}': {e}")
                    img_filename = ''

                # Compute embedding from title + description
                text_for_embed = f"{title}. {desc}"
                try:
                    embedding = model.encode(text_for_embed).tolist()
                except Exception as e:
                    self.stderr.write(f"Embedding failed for '{title}': {e}")
                    embedding = []

                books.append({
                    'title': title,
                    'desc': desc,
                    'image': img_filename if img_filename else '',
                    'detail_url': detail_url,
                    'embedding': embedding
                })

                # Safe logging (preview of description)
                safe_desc = (desc or '').strip()
                if safe_desc:
                    self.stdout.write(f"Scraped: {title} | Desc: {safe_desc[:120]}...")
                else:
                    self.stdout.write(f"Scraped: {title} | Desc: [No description]")

                # polite delay to avoid hammering the server
                time.sleep(0.1)

        # Save all books to books.json
        with open('books.json', 'w', encoding='utf-8') as f:
            json.dump(books, f, ensure_ascii=False, indent=2)

        self.stdout.write(self.style.SUCCESS(f"Scraped and saved {len(books)} books."))
