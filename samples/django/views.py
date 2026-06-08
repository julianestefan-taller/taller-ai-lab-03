"""
Django views for a simple blog API.
Demonstrates class-based views, model access, serialization, and permission checks.
"""
from django.http import JsonResponse
from django.views import View
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.core.paginator import Paginator
from functools import wraps
import json

# ---- Simple in-memory "model" (no ORM for portability) ----------------------

posts: list[dict] = [
    {"id": 1, "title": "Hello World", "body": "First post.", "author": "alice", "published": True},
    {"id": 2, "title": "Django Tips", "body": "Use CBVs.", "author": "bob", "published": True},
    {"id": 3, "title": "Draft Post", "body": "Not done.", "author": "alice", "published": False},
]

# ---- Auth decorator ---------------------------------------------------------

def require_token(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        token = request.META.get("HTTP_AUTHORIZATION", "").replace("Bearer ", "")
        if not token:
            return JsonResponse({"error": "Missing authorization header"}, status=401)
        request.user_id = "1"
        request.user_role = "user"
        return view_func(request, *args, **kwargs)
    return wrapper

# ---- Class-based views ------------------------------------------------------

@method_decorator([csrf_exempt, require_token], name='dispatch')
class PostListView(View):
    def get(self, request):
        page_num = int(request.GET.get("page", 1))
        per_page = int(request.GET.get("per_page", 10))
        author = request.GET.get("author")

        result = posts
        if author:
            result = [p for p in result if p["author"] == author]
        # Published-only filter unless admin
        result = [p for p in result if p["published"]]

        paginator = Paginator(result, per_page)
        page = paginator.get_page(page_num)
        return JsonResponse({
            "posts": list(page.object_list),
            "page": page_num,
            "total_pages": paginator.num_pages,
            "total": paginator.count,
        })

    def post(self, request):
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        if not body.get("title") or not body.get("body"):
            return JsonResponse({"error": "title and body are required"}, status=400)

        new_post = {
            "id": len(posts) + 1,
            "title": body["title"],
            "body": body["body"],
            "author": request.user_id,
            "published": body.get("published", False),
        }
        posts.append(new_post)
        return JsonResponse(new_post, status=201)


@method_decorator([csrf_exempt, require_token], name='dispatch')
class PostDetailView(View):
    def _get_post(self, post_id: int):
        return next((p for p in posts if p["id"] == post_id), None)

    def get(self, request, post_id: int):
        post = self._get_post(post_id)
        if not post:
            return JsonResponse({"error": "Post not found"}, status=404)
        return JsonResponse(post)

    def put(self, request, post_id: int):
        post = self._get_post(post_id)
        if not post:
            return JsonResponse({"error": "Post not found"}, status=404)
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
        post.update({k: v for k, v in body.items() if k in ("title", "body", "published")})
        return JsonResponse(post)

    def delete(self, request, post_id: int):
        idx = next((i for i, p in enumerate(posts) if p["id"] == post_id), None)
        if idx is None:
            return JsonResponse({"error": "Post not found"}, status=404)
        posts.pop(idx)
        return JsonResponse({}, status=204)

# ---- URL patterns (normally in urls.py) -------------------------------------
# urlpatterns = [
#     path('api/posts/', PostListView.as_view()),
#     path('api/posts/<int:post_id>/', PostDetailView.as_view()),
# ]
