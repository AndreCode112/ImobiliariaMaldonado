from django.conf import settings
from django.http import FileResponse, Http404


def frontend_app(_request, _path=""):
    index_file = settings.FRONTEND_DIST_DIR / "index.html"
    if not index_file.exists():
        raise Http404("Frontend build not found. Run `npm run build` inside frontend/.")

    return FileResponse(index_file.open("rb"), content_type="text/html")
