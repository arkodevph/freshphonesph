"""S3-compatible storage helpers (MinIO local / Supabase Storage prod).

Upload is brokered by the backend (multipart -> put); download is a short-lived
presigned GET so private files are never publicly reachable (§16).
"""
import uuid

import boto3
from botocore.client import Config
from django.conf import settings

from .models import StoredFile


def _client():
    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL or None,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
        config=Config(signature_version="s3v4"),
    )


def store_file(*, fileobj, original_name, content_type="", uploaded_by=None, prefix="proofs"):
    bucket = settings.AWS_STORAGE_BUCKET_NAME
    key = f"{prefix}/{uuid.uuid4().hex}-{original_name}"
    extra = {"ContentType": content_type} if content_type else {}
    _client().upload_fileobj(fileobj, bucket, key, ExtraArgs=extra)
    return StoredFile.objects.create(
        bucket=bucket,
        key=key,
        original_name=original_name,
        content_type=content_type,
        size=getattr(fileobj, "size", 0) or 0,
        uploaded_by=uploaded_by,
    )


def presigned_get(stored_file: StoredFile, expires: int = 300) -> str:
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": stored_file.bucket, "Key": stored_file.key},
        ExpiresIn=expires,
    )
