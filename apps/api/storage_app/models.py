"""storage_app — private file storage (§16, docs/15).

Files live in a PRIVATE S3 bucket (Supabase Storage in prod, MinIO locally).
Access is brokered via short-lived presigned URLs — never a public link.
"""
from django.db import models


class StoredFile(models.Model):
    bucket = models.CharField(max_length=120)
    key = models.CharField(max_length=400)          # object key within the bucket
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=120, blank=True)
    size = models.PositiveBigIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        "auth_app.Employee", null=True, blank=True, on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.original_name} ({self.key})"
