from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator

DOCUMENT_MAX_BYTES = 10 * 1024 * 1024  # 10MB
document_extension_validator = FileExtensionValidator(
    allowed_extensions=["pdf", "jpg", "jpeg", "png"],
)


def validate_document_size(value):
    if value.size > DOCUMENT_MAX_BYTES:
        message = f"File must be under {DOCUMENT_MAX_BYTES // (1024 * 1024)}MB."
        raise ValidationError(message)
