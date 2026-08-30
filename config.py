import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATABASE_PATH = os.path.join(BASE_DIR, "grievease.db")

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "webp"
}