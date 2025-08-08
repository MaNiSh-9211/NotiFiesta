from django.urls import path
from .views import BookRecommendView, BookRecommendAPI

urlpatterns = [
    path('', BookRecommendView.as_view(), name='book_recommend'),
    path('api/recommend/', BookRecommendAPI.as_view(), name='book_recommend_api'),
] 