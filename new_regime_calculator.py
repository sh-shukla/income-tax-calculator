from enum import Enum
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, field_validator

class CommonModel(BaseModel):
    """Base model with essential validation and serialization features."""
    
    class Config:
        populate_by_name = True
        use_enum_values = True
        validate_assignment = True
        extra = "forbid"  # Rejects unknown fields
        
    def __repr__(self):
        """Custom representation to exclude None values."""
        fields = self.model_dump()
        fields_str = ' '.join(f"{k}={repr(v)}" for k, v in fields.items())
        return f"{self.__class__.__name__}({fields_str})"

    def __str__(self):
        """Ensure `str()` also excludes None values."""
        return self.__repr__()

    def model_dump(self, **kwargs) -> Dict[str, Any]:
        """Custom model_dump() to always exclude None values."""
        kwargs.setdefault('exclude_none', True)
        return super().model_dump(**kwargs)

class ModelWithID(CommonModel):
    """Model that includes a unique identifier."""

    id: UUID = Field(
        default_factory=uuid4,
        alias="_id",
        description="Unique identifier"
    )

    class Config(CommonModel.Config):
        json_schema_extra = {
            "example": {
                "_id": "123e4567-e89b-12d3-a456-426614174000"
            }
        }

class ModelWithDates(CommonModel):
    """Model that tracks creation and update dates."""

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Date created"
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        description="Date last updated"
    )

    @field_validator("updated_at", mode="before")
    @classmethod
    def update_timestamp(cls, v: Optional[datetime]) -> Optional[datetime]:
        """Update the timestamp when changes occur."""
        return v

    def update_date(self) -> None:
        """Update the last modified date."""
        self.updated_at = datetime.utcnow()

    class Config(CommonModel.Config):
        json_schema_extra = {
            "example": {
                "created_at": "2024-01-28T00:00:00Z",
                "updated_at": "2024-01-28T00:00:00Z"
            }
        }

class FullModel(ModelWithID, ModelWithDates):
    """Complete model with ID and dates."""

    class Config(CommonModel.Config):
        json_schema_extra = {
            "example": {
                "_id": "123e4567-e89b-12d3-a456-426614174000",
                "created_at": "2024-01-28T00:00:00Z",
                "updated_at": "2024-01-28T00:00:00Z"
            }
        }

class Status(str, Enum):
    """Enum for flow status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
